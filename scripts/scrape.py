#!/usr/bin/env python3
"""Scrape GECCO accepted papers and emit a JSON dataset for the app.

Pipeline:
  1. Fetch the "Accepted Papers" page (a static HTML table: Track / Title / Authors).
  2. Parse each row; split the authors cell into (name, affiliations) entries.
  3. Match papers to ACM DOIs via the Crossref API (open, no key required),
     and each author to their ORCID iD from the Crossref author metadata
     (ACM requires an ORCID from every author, so coverage is complete).
  4. Write src/data/papers.json (2026) or src/data/papers-<year>.json.

Standard library only — no third-party dependencies.

Usage:
  python3 scripts/scrape.py [--year 2026] [--out PATH] [--skip-doi]
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from html.parser import HTMLParser

CROSSREF_API = "https://api.crossref.org/works"
# Per year: the accepted-papers page (the same Tiki tracker table on every
# site), the DOI prefix of the proceedings volume in the ACM Digital Library,
# and a Crossref created-date window that covers the volume's registration
# date while keeping the paging through ACM proceedings articles bounded.
CONFERENCES: dict[int, dict[str, str | None]] = {
    2024: {
        "url": "https://gecco-2024.sigevo.org/Accepted-Papers.html",
        "doi_prefix": "10.1145/3638529",
        "from_date": "2024-06-01",
        "until_date": "2024-12-31",
    },
    2025: {
        "url": "https://gecco-2025.sigevo.org/Accepted-Papers",
        "doi_prefix": "10.1145/3712256",
        "from_date": "2025-06-01",
        "until_date": "2025-12-31",
    },
    2026: {
        "url": "https://gecco-2026.sigevo.org/Accepted+Papers",
        "doi_prefix": "10.1145/3795095",
        "from_date": "2026-07-01",
        "until_date": None,
    },
}
USER_AGENT = (
    "gecco-summary/0.1 (https://github.com/helix-agh/gecco-summary; "
    "mailto:wachtelik@gmail.com)"
)


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return response.read().decode("utf-8")


class TrackerTableParser(HTMLParser):
    """Extract rows of cell texts from the wikiplugin_trackerlist table."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self._in_table = False
        self._in_cell = False
        self._table_depth = 0
        self._current_row: list[str] = []
        self._current_cell: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag == "table":
            classes = dict(attrs).get("class") or ""
            if self._in_table:
                self._table_depth += 1
            elif "wikiplugin_trackerlist" in classes:
                self._in_table = True
                self._table_depth = 0
        elif self._in_table and self._table_depth == 0:
            if tag == "tr":
                self._current_row = []
            elif tag == "td":
                self._in_cell = True
                self._current_cell = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "table" and self._in_table:
            if self._table_depth > 0:
                self._table_depth -= 1
            else:
                self._in_table = False
        elif self._in_table and self._table_depth == 0:
            if tag == "td" and self._in_cell:
                self._in_cell = False
                self._current_row.append("".join(self._current_cell).strip())
            elif tag == "tr" and self._current_row:
                self.rows.append(self._current_row)
                self._current_row = []

    def handle_data(self, data: str) -> None:
        if self._in_cell:
            self._current_cell.append(data)


def split_top_level(text: str, separator: str = ", ") -> list[str]:
    """Split on `separator`, but only at parenthesis depth zero."""
    parts: list[str] = []
    depth = 0
    start = 0
    i = 0
    while i < len(text):
        char = text[i]
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(depth - 1, 0)
        if depth == 0 and text.startswith(separator, i):
            parts.append(text[start:i])
            i += len(separator)
            start = i
            continue
        i += 1
    tail = text[start:].strip()
    if tail:
        parts.append(tail)
    return parts


def parse_authors(cell: str) -> list[dict[str, object]]:
    """Parse 'Name (Affiliation), Name (Affiliation A, Affiliation B)' entries.

    Affiliations are comma-separated inside the parentheses. The split is a
    heuristic: a comma can also occur inside a single institution name
    (e.g. "University of California, Irvine"), which we accept for now.
    """
    authors: list[dict[str, object]] = []
    for entry in split_top_level(cell):
        entry = " ".join(entry.split())
        match = re.match(r"^(?P<name>.*?)\s*\((?P<affiliation>.*)\)$", entry, re.S)
        if match:
            name = match.group("name").strip()
            affiliations = [
                part.strip()
                for part in match.group("affiliation").split(", ")
                if part.strip()
            ]
        else:
            name = entry
            affiliations = []
        if name:
            authors.append({"name": name, "affiliations": affiliations, "orcid": None})
    return authors


def parse_papers(page_html: str) -> list[dict[str, object]]:
    parser = TrackerTableParser()
    parser.feed(page_html)
    papers: list[dict[str, object]] = []
    for row in parser.rows:
        if len(row) != 3:
            continue
        track, title, authors_cell = row
        papers.append(
            {
                "track": " ".join(track.split()),
                "title": " ".join(title.split()),
                "authors": parse_authors(" ".join(authors_cell.split())),
                "doi": None,
            }
        )
    return papers


def normalize_title(title: str) -> str:
    """Normalize a title for matching between the GECCO site and Crossref."""
    text = title.casefold()
    text = re.sub(r"[‐-―]", "-", text)  # unicode dashes
    text = re.sub(r"[‘’“”]", "'", text)  # curly quotes
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def fetch_crossref_works(conference: dict[str, str | None]) -> dict[str, dict[str, object]]:
    """Return {normalized title: Crossref work} for the GECCO proceedings.

    Crossref cannot filter by container DOI directly, so we page through the
    ACM proceedings articles created in the conference's date window and keep
    those under the proceedings' DOI prefix.
    """
    filters = [
        "prefix:10.1145",
        "type:proceedings-article",
        f"from-created-date:{conference['from_date']}",
    ]
    if conference["until_date"]:
        filters.append(f"until-created-date:{conference['until_date']}")
    works: dict[str, dict[str, object]] = {}
    cursor = "*"
    while True:
        query = urllib.parse.urlencode(
            {
                "filter": ",".join(filters),
                "select": "DOI,title,author",
                "rows": "1000",
                "cursor": cursor,
            }
        )
        payload = json.loads(fetch(f"{CROSSREF_API}?{query}"))
        message = payload["message"]
        items = message["items"]
        for item in items:
            doi = item["DOI"]
            titles = item.get("title") or []
            if doi.startswith(f"{conference['doi_prefix']}.") and titles:
                works[normalize_title(titles[0])] = item
        if not items:
            break
        cursor = message.get("next-cursor") or ""
        if not cursor:
            break
    return works


# Letters whose usual ASCII transliteration is more than a stripped accent:
# ones NFKD leaves intact (the site spells the same author both "Đurasević"
# and "Djurasevic") and German umlauts, which the site expands to two letters
# when it drops the diacritic ("Bäck" vs "Baeck") — so they must be
# transliterated before NFKD decomposes them to the bare vowel.
TRANSLITERATIONS = str.maketrans(
    {
        "ł": "l",
        "đ": "dj",
        "ø": "o",
        "ß": "ss",
        "æ": "ae",
        "þ": "th",
        "ä": "ae",
        "ö": "oe",
        "ü": "ue",
    }
)


def normalize_name(name: str) -> str:
    """Normalize an author name for matching (strip accents, dots, hyphens)."""
    text = unicodedata.normalize("NFKD", name.casefold().translate(TRANSLITERATIONS))
    text = "".join(char for char in text if not unicodedata.combining(char))
    return " ".join(text.replace("-", " ").replace(".", " ").split())


def name_key(name: str) -> tuple[str, str]:
    """Sorted (first, last) tokens: site and ACM disagree on middle names, and
    some names appear in flipped order ("Chien Van Trinh" / "Trinh Van Chien").
    """
    tokens = normalize_name(name).split()
    if not tokens:
        return ("", "")
    first, last = sorted((tokens[0], tokens[-1]))
    return (first, last)


def match_crossref_author(
    name: str, crossref_authors: list[dict[str, object]]
) -> dict[str, object] | None:
    """Find the Crossref author entry for a site author name, or None.

    Exact normalized full-name match first; otherwise first+last token, which
    absorbs middle names present on one side only. A match must be unique.
    """
    normalized = normalize_name(name)
    crossref_names = [
        f"{author.get('given', '')} {author.get('family', '')}"
        for author in crossref_authors
    ]
    candidates = [
        author
        for author, crossref_name in zip(crossref_authors, crossref_names)
        if normalize_name(crossref_name) == normalized
    ]
    if not candidates:
        key = name_key(name)
        candidates = [
            author
            for author, crossref_name in zip(crossref_authors, crossref_names)
            if name_key(crossref_name) == key
        ]
    return candidates[0] if len(candidates) == 1 else None


def resolve_orcids(
    votes: dict[tuple[str, str], Counter[str]],
) -> dict[tuple[str, str], str]:
    """Pick one ORCID per author name key from per-paper (name, ORCID) votes.

    ACM metadata occasionally attaches a co-author's ORCID to the wrong person
    (observed at GECCO 2026: Una-May O'Reilly carrying Jamal Toutouh's iD on
    one paper). A name keeps an ORCID only if no other name cites it strictly
    more often; among kept ORCIDs, the name's most frequent one wins.
    """
    top_votes: Counter[str] = Counter()
    for orcid_counts in votes.values():
        for orcid, count in orcid_counts.items():
            top_votes[orcid] = max(top_votes[orcid], count)
    resolved: dict[tuple[str, str], str] = {}
    for name, orcid_counts in votes.items():
        owned = [
            orcid for orcid, count in orcid_counts.items() if count == top_votes[orcid]
        ]
        if owned:
            resolved[name] = max(owned, key=lambda orcid: orcid_counts[orcid])
        else:
            print(f"  ORCID conflict, none kept for: {name}", file=sys.stderr)
    return resolved


# Camera-ready titles sometimes differ slightly from the ones announced on the
# site; 0.85 sits well below the observed true-match ratios (>= 0.89) and well
# above unrelated-title ratios.
FUZZY_MATCH_CUTOFF = 0.85


def attach_dois_and_orcids(
    papers: list[dict[str, object]], conference: dict[str, str | None]
) -> tuple[int, int]:
    """Set paper DOIs and author ORCIDs from Crossref; return match counts."""
    work_by_title = fetch_crossref_works(conference)
    doi_matched = 0
    # Votes keyed by (first, last) name token: the site itself spells the same
    # person with and without middle names across papers.
    votes: dict[tuple[str, str], Counter[str]] = {}
    for paper in papers:
        title = normalize_title(str(paper["title"]))
        work = work_by_title.get(title)
        if work is None:
            close = difflib.get_close_matches(
                title, work_by_title, n=1, cutoff=FUZZY_MATCH_CUTOFF
            )
            if close:
                work = work_by_title[close[0]]
                print(
                    f"  fuzzy DOI match: {paper['title']} -> {work['DOI']}",
                    file=sys.stderr,
                )
        if work is None:
            continue
        paper["doi"] = work["DOI"]
        doi_matched += 1
        crossref_authors = work.get("author") or []
        for author in paper["authors"]:
            entry = match_crossref_author(str(author["name"]), crossref_authors)
            orcid = (entry or {}).get("ORCID")
            if orcid:
                orcid = str(orcid).removeprefix("https://orcid.org/")
                votes.setdefault(name_key(str(author["name"])), Counter())[orcid] += 1
            else:
                print(
                    f"  no Crossref author match: {author['name']}"
                    f" ({paper['title']})",
                    file=sys.stderr,
                )

    # Assign the resolved ORCID everywhere the name appears — this also covers
    # authors whose own paper had no DOI but who appear on another paper.
    orcid_by_name = resolve_orcids(votes)
    orcid_matched = 0
    for paper in papers:
        for author in paper["authors"]:
            orcid = orcid_by_name.get(name_key(str(author["name"])))
            if orcid:
                author["orcid"] = orcid
                orcid_matched += 1
    return doi_matched, orcid_matched


def main() -> int:
    arg_parser = argparse.ArgumentParser(description=__doc__)
    arg_parser.add_argument(
        "--year",
        type=int,
        default=2026,
        choices=sorted(CONFERENCES),
        help="conference year to scrape",
    )
    arg_parser.add_argument(
        "--out",
        default=None,
        help="output path (default: src/data/papers.json for 2026, "
        "src/data/papers-<year>.json otherwise)",
    )
    arg_parser.add_argument(
        "--skip-doi",
        action="store_true",
        help="skip the Crossref DOI/ORCID matching step",
    )
    args = arg_parser.parse_args()
    conference = CONFERENCES[args.year]
    papers_url = str(conference["url"])
    # 2026 keeps the historical filename that the app imports.
    out_path = args.out or (
        "src/data/papers.json"
        if args.year == 2026
        else f"src/data/papers-{args.year}.json"
    )

    print(f"fetching {papers_url}", file=sys.stderr)
    papers = parse_papers(fetch(papers_url))
    if not papers:
        print("error: no papers parsed — page layout may have changed", file=sys.stderr)
        return 1
    print(f"parsed {len(papers)} papers", file=sys.stderr)

    doi_matched = 0
    orcid_matched = 0
    author_count = sum(len(paper["authors"]) for paper in papers)
    if not args.skip_doi:
        print("matching DOIs and ORCIDs via Crossref", file=sys.stderr)
        doi_matched, orcid_matched = attach_dois_and_orcids(papers, conference)
        print(f"matched {doi_matched}/{len(papers)} DOIs", file=sys.stderr)
        print(
            f"matched {orcid_matched}/{author_count} author ORCIDs",
            file=sys.stderr,
        )
        for paper in papers:
            if paper["doi"] is None:
                print(f"  no DOI: {paper['title']}", file=sys.stderr)

    dataset = {
        "meta": {
            "conference": f"GECCO {args.year}",
            "source": papers_url,
            "scrapedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "paperCount": len(papers),
            "doiMatched": doi_matched,
            "orcidMatched": orcid_matched,
        },
        "papers": papers,
    }
    with open(out_path, "w", encoding="utf-8") as output:
        json.dump(dataset, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(f"wrote {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
