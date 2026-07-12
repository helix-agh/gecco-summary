#!/usr/bin/env python3
"""Build the topic map dataset for the accepted-papers explorer.

Pipeline:
  1. Read src/data/papers.json (produced by scrape.py).
  2. Fetch abstracts from the OpenAlex API by DOI (open, no key; cached in
     scripts/abstracts.json so reruns are offline).
  3. Embed "title. abstract" with a sentence-transformers model.
  4. Project to 2D with UMAP for the map layout.
  5. Cluster via a k-nearest-neighbour graph + Louvain communities
     (HDBSCAN flags too many outliers at n≈150).
  6. Write src/data/topics.json and scripts/cluster_report.md; cluster labels
     are read from scripts/topic_labels.json (authored by hand from the
     report — c-TF-IDF keywords are uninformative at a single-topic venue).

Requires the venv from `python3 -m venv .venv-topics` with
sentence-transformers, umap-learn, scikit-learn, and networkx installed.

Usage:
  .venv-topics/bin/python scripts/topics.py [--refetch] [--model NAME]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

OPENALEX_API = "https://api.openalex.org/works"
OPENALEX_BATCH = 50
USER_AGENT = (
    "gecco-summary/0.1 (https://github.com/helix-agh/gecco-summary; "
    "mailto:wachtelik@gmail.com)"
)
SCRIPTS_DIR = Path(__file__).parent
DEFAULT_YEAR = 2026

# Layout / clustering knobs, all seeded for reproducible output.
SEED = 42
UMAP_NEIGHBORS = 10
UMAP_MIN_DIST = 0.35
KNN_EDGES = 8
SIMILAR_PAPERS = 3
MIN_CLUSTER_SIZE = 4


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def invert_abstract(inverted: dict[str, list[int]]) -> str:
    """OpenAlex stores abstracts as {word: [positions]}; rebuild the text."""
    words: dict[int, str] = {}
    for word, positions in inverted.items():
        for position in positions:
            words[position] = word
    return " ".join(words[i] for i in sorted(words))


def fetch_abstracts(dois: list[str], cache_path: Path, refetch: bool) -> dict[str, str]:
    """Return {doi: abstract} from OpenAlex, cached under scripts/."""
    if cache_path.exists() and not refetch:
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        if set(dois) <= set(cached):
            return {doi: text for doi, text in cached.items() if text}
        print("cache is missing DOIs, refetching", file=sys.stderr)

    abstracts: dict[str, str] = {}
    for start in range(0, len(dois), OPENALEX_BATCH):
        batch = dois[start : start + OPENALEX_BATCH]
        doi_filter = "doi:" + "|".join(batch)
        query = urllib.parse.urlencode(
            {
                "filter": doi_filter,
                "per-page": str(OPENALEX_BATCH),
                "select": "doi,abstract_inverted_index",
            }
        )
        payload = fetch_json(f"{OPENALEX_API}?{query}")
        for work in payload["results"]:
            doi = str(work["doi"]).removeprefix("https://doi.org/")
            inverted = work.get("abstract_inverted_index")
            abstracts[doi] = invert_abstract(inverted) if inverted else ""
    # Cache misses too (empty string) so reruns stay offline.
    for doi in dois:
        abstracts.setdefault(doi, "")
    cache_path.write_text(
        json.dumps(abstracts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"cached {len(abstracts)} abstracts to {cache_path}", file=sys.stderr)
    return {doi: text for doi, text in abstracts.items() if text}


def embed(texts: list[str], model_name: str):
    from sentence_transformers import SentenceTransformer

    model = SentenceTransformer(model_name)
    return model.encode(texts, normalize_embeddings=True, show_progress_bar=False)


def cluster(layout, resolution: float) -> list[int]:
    """Louvain communities on a k-NN graph over the 2D UMAP layout.

    Clustering in the layout space (not the full embedding space) keeps every
    cluster spatially contiguous on the map, so the hulls don't overlap — the
    BERTopic trick of clustering after UMAP. Tiny communities
    (< MIN_CLUSTER_SIZE) are merged into the community of their nearest
    larger neighbour so every paper gets a real cluster.
    """
    import networkx as nx
    import numpy as np

    diff = layout[:, None, :] - layout[None, :, :]
    similarity = -np.sqrt((diff**2).sum(axis=2))  # negative distance ranks nearest first
    graph = nx.Graph()
    graph.add_nodes_from(range(len(similarity)))
    for i, row in enumerate(similarity):
        for j in np.argsort(row)[::-1][1 : KNN_EDGES + 1]:
            graph.add_edge(i, int(j), weight=float(row[j]))
    communities = nx.community.louvain_communities(
        graph, weight="weight", resolution=resolution, seed=SEED
    )
    communities = sorted(communities, key=len, reverse=True)

    assignment = [0] * len(similarity)
    for cluster_id, members in enumerate(communities):
        for member in members:
            assignment[member] = cluster_id
    keep = [c for c, members in enumerate(communities) if len(members) >= MIN_CLUSTER_SIZE]
    for cluster_id, members in enumerate(communities):
        if cluster_id in keep:
            continue
        for member in members:
            candidates = [(row_j, sim) for row_j, sim in enumerate(similarity[member])
                          if assignment[row_j] in keep and row_j != member]
            assignment[member] = assignment[max(candidates, key=lambda x: x[1])[0]]
    # Renumber to 0..n-1 by descending size.
    sizes = Counter(assignment)
    order = {old: new for new, (old, _) in enumerate(sizes.most_common())}
    return [order[c] for c in assignment]


STOPWORDS = set(
    """a an and are as at based between by can for from in into is it its more of on
    or our over than that the their this through to towards under using via we with
    evolutionary algorithm algorithms genetic optimization optimisation problem
    problems approach method methods new novel paper propose proposed results study
    show framework performance search computation""".split()
)


def distinctive_terms(titles: list[str], all_titles: list[str], top: int = 8) -> list[str]:
    """Crude distinctive unigrams/bigrams for the human-labeling report only."""

    def terms(text: str) -> list[str]:
        words = [w for w in re.findall(r"[a-z][a-z-]+", text.lower()) if w not in STOPWORDS]
        return words + [f"{a} {b}" for a, b in zip(words, words[1:])]

    inside = Counter(t for title in titles for t in set(terms(title)))
    outside = Counter(t for title in all_titles for t in set(terms(title)))
    scored = {
        term: count / (outside[term] + 2)
        for term, count in inside.items()
        if count >= 2
    }
    return [t for t, _ in sorted(scored.items(), key=lambda x: -x[1])[:top]]


def main() -> int:
    arg_parser = argparse.ArgumentParser(description=__doc__)
    arg_parser.add_argument(
        "--year",
        type=int,
        default=DEFAULT_YEAR,
        help="conference year; picks the papers-<year>.json convention",
    )
    arg_parser.add_argument("--papers", default=None)
    arg_parser.add_argument("--out", default=None)
    arg_parser.add_argument("--model", default="allenai-specter")
    arg_parser.add_argument(
        "--resolution",
        type=float,
        default=1.4,
        help="Louvain resolution; higher splits into more topics",
    )
    arg_parser.add_argument(
        "--refetch", action="store_true", help="ignore the abstract cache"
    )
    args = arg_parser.parse_args()

    # Same naming convention as scrape.py: the default year keeps the bare
    # filenames, other years get a -<year> suffix.
    suffix = "" if args.year == DEFAULT_YEAR else f"-{args.year}"
    papers_path = Path(args.papers or f"src/data/papers{suffix}.json")
    out_path = Path(args.out or f"src/data/topics{suffix}.json")
    cache_path = SCRIPTS_DIR / f"abstracts{suffix}.json"
    labels_path = SCRIPTS_DIR / f"topic_labels{suffix}.json"
    report_path = SCRIPTS_DIR / f"cluster_report{suffix}.md"

    import numpy as np
    import umap

    dataset = json.loads(papers_path.read_text(encoding="utf-8"))
    papers = dataset["papers"]
    dois = [p["doi"] for p in papers if p.get("doi")]
    print(f"loaded {len(papers)} papers ({len(dois)} with DOI)", file=sys.stderr)

    abstracts = fetch_abstracts(dois, cache_path, args.refetch)
    print(f"abstracts available for {len(abstracts)} papers", file=sys.stderr)

    # Fold the abstracts back into the papers file so the frontend table can
    # show them on hover without shipping the abstract cache separately.
    for paper in papers:
        paper["abstract"] = abstracts.get(paper.get("doi") or "") or None
    dataset["papers"] = [
        {
            "track": p["track"],
            "title": p["title"],
            "doi": p.get("doi"),
            "abstract": p.get("abstract"),
            "authors": p["authors"],
        }
        for p in papers
    ]
    with open(papers_path, "w", encoding="utf-8") as handle:
        json.dump(dataset, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"enriched {papers_path} with abstracts", file=sys.stderr)

    texts = []
    for paper in papers:
        abstract = abstracts.get(paper.get("doi") or "", "")
        texts.append(f"{paper['title']}. {abstract}".strip())

    print(f"embedding with {args.model}", file=sys.stderr)
    embeddings = embed(texts, args.model)

    print("projecting with UMAP", file=sys.stderr)
    layout = umap.UMAP(
        n_neighbors=UMAP_NEIGHBORS,
        min_dist=UMAP_MIN_DIST,
        metric="cosine",
        random_state=SEED,
    ).fit_transform(embeddings)
    # Normalize to [0, 1] for the frontend viewport.
    layout = (layout - layout.min(axis=0)) / (layout.max(axis=0) - layout.min(axis=0))

    assignment = cluster(embeddings, args.resolution)
    cluster_count = max(assignment) + 1
    print(f"found {cluster_count} clusters", file=sys.stderr)

    similarity = embeddings @ embeddings.T
    neighbors = [
        [int(j) for j in np.argsort(row)[::-1][1 : SIMILAR_PAPERS + 1]]
        for row in similarity
    ]

    labels: dict[str, str] = {}
    if labels_path.exists():
        labels = json.loads(labels_path.read_text(encoding="utf-8"))

    all_titles = [p["title"] for p in papers]
    report_lines = ["# Cluster report", ""]
    clusters = []
    for cluster_id in range(cluster_count):
        member_ids = [i for i, c in enumerate(assignment) if c == cluster_id]
        titles = [all_titles[i] for i in member_ids]
        label = labels.get(str(cluster_id))
        clusters.append({"id": cluster_id, "label": label, "size": len(member_ids)})
        terms = ", ".join(distinctive_terms(titles, all_titles))
        report_lines += [
            f"## Cluster {cluster_id} ({len(member_ids)} papers)"
            + (f" — {label}" if label else " — UNLABELED"),
            f"Distinctive terms: {terms}",
            "",
            *[f"- [{papers[i]['track']}] {all_titles[i]}" for i in member_ids],
            "",
        ]
    report_path.write_text("\n".join(report_lines), encoding="utf-8")
    print(f"wrote {report_path}", file=sys.stderr)

    missing = [c["id"] for c in clusters if not c["label"]]
    if missing:
        print(
            f"warning: clusters {missing} have no label in {labels_path}",
            file=sys.stderr,
        )

    output = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "model": args.model,
            "abstractCount": len(abstracts),
            "clusterCount": cluster_count,
        },
        "clusters": clusters,
        "papers": [
            {
                "title": paper["title"],
                "x": round(float(layout[i][0]), 4),
                "y": round(float(layout[i][1]), 4),
                "cluster": assignment[i],
                "neighbors": neighbors[i],
                "hasAbstract": bool(abstracts.get(paper.get("doi") or "", "")),
            }
            for i, paper in enumerate(papers)
        ],
    }
    with open(out_path, "w", encoding="utf-8") as handle:
        json.dump(output, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    print(f"wrote {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
