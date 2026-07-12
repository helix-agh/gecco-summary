#!/usr/bin/env python3
"""Attach a per-paper set of author countries to the accepted-papers dataset.

Pipeline:
  1. Read src/data/papers-<year>.json (produced by scrape.py).
  2. Fetch author affiliations from the OpenAlex API by DOI (open, no key;
     cached in scripts/countries-<year>.json so reruns are offline). Each
     paper's countries are the union of the ISO-3166 alpha-2 codes across all
     of its authors' institutions ("any author" counting).
  3. Write src/data/countries-<year>.json: { meta, byTitle: {title: [codes]} },
     joined back to papers by title (DOI may be null for a handful of papers).

OpenAlex is the same source topics.py already uses for abstracts; its country
codes come from parsed institution ROR records, which is more reliable than
guessing a country from the free-text affiliation strings on the conference
page.

Usage:
  python3 scripts/countries.py [--refetch] [--year YEAR]
"""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

OPENALEX_API = "https://api.openalex.org/works"
OPENALEX_BATCH = 50
USER_AGENT = (
    "gecco-summary/0.1 (https://github.com/helix-agh/gecco-summary; "
    "mailto:wachtelik@gmail.com)"
)
SCRIPTS_DIR = Path(__file__).parent
DATA_DIR = SCRIPTS_DIR.parent / "src" / "data"
YEARS = (2024, 2025, 2026)
DEFAULT_YEAR = 2026


def papers_path(year: int) -> Path:
    name = "papers.json" if year == DEFAULT_YEAR else f"papers-{year}.json"
    return DATA_DIR / name


def output_path(year: int) -> Path:
    name = "countries.json" if year == DEFAULT_YEAR else f"countries-{year}.json"
    return DATA_DIR / name


def cache_path(year: int) -> Path:
    return SCRIPTS_DIR / f"countries-{year}.json"


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def country_codes(work: dict) -> list[str]:
    """Union of ISO alpha-2 codes across a work's authorships, order-stable."""
    codes: list[str] = []
    for authorship in work.get("authorships", []):
        institution_codes = [
            institution.get("country_code")
            for institution in authorship.get("institutions", [])
        ]
        # Fall back to the authorship-level countries when no institution
        # carries a code (OpenAlex sometimes has one but not the other).
        for code in institution_codes or authorship.get("countries", []):
            if code and code not in codes:
                codes.append(code)
    return codes


def fetch_countries(dois: list[str], path: Path, refetch: bool) -> dict[str, list[str]]:
    """Return {doi: [codes]} from OpenAlex, cached under scripts/."""
    if path.exists() and not refetch:
        cached = json.loads(path.read_text(encoding="utf-8"))
        if set(dois) <= set(cached):
            return cached
        print("cache is missing DOIs, refetching", file=sys.stderr)

    result: dict[str, list[str]] = {}
    for start in range(0, len(dois), OPENALEX_BATCH):
        batch = dois[start : start + OPENALEX_BATCH]
        query = urllib.parse.urlencode(
            {
                "filter": "doi:" + "|".join(batch),
                "per-page": str(OPENALEX_BATCH),
                "select": "doi,authorships",
            }
        )
        payload = fetch_json(f"{OPENALEX_API}?{query}")
        for work in payload["results"]:
            doi = str(work["doi"]).removeprefix("https://doi.org/")
            result[doi] = country_codes(work)
    for doi in dois:  # cache misses (empty) too, so reruns stay offline
        result.setdefault(doi, [])
    path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"cached {len(result)} paper country sets to {path}", file=sys.stderr)
    return result


def build_year(year: int, refetch: bool) -> None:
    dataset = json.loads(papers_path(year).read_text(encoding="utf-8"))
    papers = dataset["papers"]
    dois = sorted({p["doi"] for p in papers if p.get("doi")})
    by_doi = fetch_countries(dois, cache_path(year), refetch)

    by_title = {p["title"]: (by_doi.get(p["doi"], []) if p.get("doi") else []) for p in papers}
    matched = sum(1 for codes in by_title.values() if codes)
    all_codes = sorted({code for codes in by_title.values() for code in codes})

    out = {
        "meta": {
            "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "source": "https://openalex.org",
            "paperCount": len(papers),
            "papersWithCountry": matched,
            "countryCount": len(all_codes),
        },
        "byTitle": by_title,
    }
    path = output_path(year)
    path.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"{year}: {matched}/{len(papers)} papers with a country, "
        f"{len(all_codes)} distinct — wrote {path}",
        file=sys.stderr,
    )
    print(f"{year} codes: {', '.join(all_codes)}", file=sys.stderr)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refetch", action="store_true", help="ignore the OpenAlex cache")
    parser.add_argument("--year", type=int, choices=YEARS, help="only build one year")
    args = parser.parse_args()
    for year in [args.year] if args.year else YEARS:
        build_year(year, args.refetch)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
