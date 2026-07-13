# GECCO Accepted Papers Explorer

An independent explorer for the accepted full papers of the Genetic and Evolutionary
Computation Conference from 2021 through 2026. Browse papers by track, author,
institution, country, and topic, compare editions, and follow DOI links to the ACM
Digital Library.

**This is an independent community project. It is not affiliated with or endorsed by
ACM, SIGEVO, or the GECCO organizers. The official conference pages are the authoritative
source.**

## Data provenance

- Paper titles, tracks, authors, and published affiliations come from the official GECCO
  accepted-paper pages. The current edition is sourced from
  [GECCO 2026](https://gecco-2026.sigevo.org/Accepted+Papers).
- DOI and ORCID metadata is resolved through the open
  [Crossref REST API](https://api.crossref.org).
- Abstract and country metadata comes from [OpenAlex](https://openalex.org/). Country
  coverage is incomplete when OpenAlex has no matching affiliation metadata.
- Topic maps are derived analytical artifacts. Their human-authored labels and the
  explicitly marked AI summaries are interpretive, not official conference statements.
- The frontend is a static React and TypeScript application; datasets ship with the
  application and no backend is required.

See [NOTICE.md](NOTICE.md) for third-party data and trademark attribution. Source code is
available under the [MIT License](LICENSE); that license does not grant rights to
third-party conference data, publication text, names, or marks.

## Development

```sh
npm install
npm run dev        # start the dev server
npm run lint       # eslint (type-checked rules)
npm run format     # prettier
npm run build      # typecheck + production build
npm run scrape     # refresh src/data/papers.json (requires Python 3.10+)
```

## Data notes

- Affiliations are kept as published. Multiple affiliations per author are split on
  commas, which occasionally splits a single institution name. A documented alias table
  repairs known cases for aggregate institution counts.
- Author totals and rankings merge spelling variants using a shared ORCID where available,
  with a conservative normalized-name fallback. Names in individual paper entries remain
  exactly as published.
- Institution counts mean "papers with at least one author from that institution", counting each paper once.

## Corrections

Metadata and identity resolution can contain errors. Please
[open an issue](https://github.com/helix-agh/gecco-summary/issues) with the paper title,
edition, affected field, and a link to an authoritative source.
