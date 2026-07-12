export interface Author {
  name: string
  /** Heuristic split of the affiliation string — commas inside a single
   *  institution name (e.g. "University of California, Irvine") produce
   *  separate entries. Kept as-is until a normalization pass exists. */
  affiliations: string[]
}

export interface Paper {
  track: string
  title: string
  doi: string | null
  authors: Author[]
}

export interface DatasetMeta {
  conference: string
  source: string
  scrapedAt: string
  paperCount: number
  doiMatched: number
}

export interface Dataset {
  meta: DatasetMeta
  papers: Paper[]
}
