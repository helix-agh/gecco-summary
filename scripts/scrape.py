#!/usr/bin/env python3
"""Scrape GECCO accepted papers and emit a JSON dataset for the app.

Pipeline:
  1. Fetch the "Accepted Papers" page (a static HTML table: Track / Title / Authors).
  2. Parse each row; split the authors cell into (name, affiliations) entries.
  3. Match papers to ACM DOIs via the Crossref API (open, no key required).
  4. Write src/data/papers.json.

Standard library only — no third-party dependencies.

Usage:
  python3 scripts/scrape.py [--out src/data/papers.json] [--skip-doi]
"""

from __future__ import annotations

import argparse
import difflib
import json
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser

PAPERS_URL = "https://gecco-2026.sigevo.org/Accepted+Papers"
CROSSREF_API = "https://api.crossref.org/works"
# DOI prefix of the GECCO 2026 proceedings volume in the ACM Digital Library.
PROCEEDINGS_DOI_PREFIX = "10.1145/3795095"
# Crossref window that safely covers the proceedings' registration date (2026-07-10).
CROSSREF_FROM_DATE = "2026-07-01"
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
            authors.append({"name": name, "affiliations": affiliations})
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


def fetch_crossref_dois() -> dict[str, str]:
    """Return {normalized title: DOI} for articles in the GECCO proceedings.

    Crossref cannot filter by container DOI directly, so we page through recent
    ACM proceedings articles and keep those under the proceedings' DOI prefix.
    """
    dois: dict[str, str] = {}
    cursor = "*"
    while True:
        query = urllib.parse.urlencode(
            {
                "filter": (
                    "prefix:10.1145,type:proceedings-article,"
                    f"from-created-date:{CROSSREF_FROM_DATE}"
                ),
                "select": "DOI,title",
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
            if doi.startswith(f"{PROCEEDINGS_DOI_PREFIX}.") and titles:
                dois[normalize_title(titles[0])] = doi
        if not items:
            break
        cursor = message.get("next-cursor") or ""
        if not cursor:
            break
    return dois


# Camera-ready titles sometimes differ slightly from the ones announced on the
# site; 0.85 sits well below the observed true-match ratios (>= 0.89) and well
# above unrelated-title ratios.
FUZZY_MATCH_CUTOFF = 0.85


def attach_dois(papers: list[dict[str, object]]) -> int:
    doi_by_title = fetch_crossref_dois()
    matched = 0
    for paper in papers:
        title = normalize_title(str(paper["title"]))
        doi = doi_by_title.get(title)
        if doi is None:
            close = difflib.get_close_matches(
                title, doi_by_title, n=1, cutoff=FUZZY_MATCH_CUTOFF
            )
            if close:
                doi = doi_by_title[close[0]]
                print(f"  fuzzy DOI match: {paper['title']} -> {doi}", file=sys.stderr)
        if doi:
            paper["doi"] = doi
            matched += 1
    return matched


def main() -> int:
    arg_parser = argparse.ArgumentParser(description=__doc__)
    arg_parser.add_argument("--out", default="src/data/papers.json")
    arg_parser.add_argument(
        "--skip-doi",
        action="store_true",
        help="skip the Crossref DOI matching step",
    )
    args = arg_parser.parse_args()

    print(f"fetching {PAPERS_URL}", file=sys.stderr)
    papers = parse_papers(fetch(PAPERS_URL))
    if not papers:
        print("error: no papers parsed — page layout may have changed", file=sys.stderr)
        return 1
    print(f"parsed {len(papers)} papers", file=sys.stderr)

    matched = 0
    if not args.skip_doi:
        print("matching DOIs via Crossref", file=sys.stderr)
        matched = attach_dois(papers)
        print(f"matched {matched}/{len(papers)} DOIs", file=sys.stderr)
        for paper in papers:
            if paper["doi"] is None:
                print(f"  no DOI: {paper['title']}", file=sys.stderr)

    dataset = {
        "meta": {
            "conference": "GECCO 2026",
            "source": PAPERS_URL,
            "scrapedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "paperCount": len(papers),
            "doiMatched": matched,
        },
        "papers": papers,
    }
    with open(args.out, "w", encoding="utf-8") as output:
        json.dump(dataset, output, ensure_ascii=False, indent=2)
        output.write("\n")
    print(f"wrote {args.out}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
