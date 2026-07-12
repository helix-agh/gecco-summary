export interface Author {
  name: string
  /** Heuristic split of the affiliation string — commas inside a single
   *  institution name (e.g. "University of California, Irvine") produce
   *  separate entries. Kept as-is until a normalization pass exists. */
  affiliations: string[]
  /** ORCID iD (bare "0000-0000-0000-0000" form) resolved from the paper's
   *  Crossref author metadata, or null when no ORCID could be matched. */
  orcid: string | null
}

export interface Paper {
  track: string
  title: string
  doi: string | null
  /** Abstract text resolved from OpenAlex by DOI, or null when unavailable. */
  abstract: string | null
  authors: Author[]
}

export interface DatasetMeta {
  conference: string
  source: string
  scrapedAt: string
  paperCount: number
  doiMatched: number
  orcidMatched: number
}

export interface Dataset {
  meta: DatasetMeta
  papers: Paper[]
}

/** One paper's entry in the topic map (topics.json, built by scripts/topics.py). */
export interface TopicPoint {
  title: string
  /** UMAP layout position, normalized to [0, 1]. */
  x: number
  y: number
  cluster: number
  /** Indices of the most similar papers, into the topics.json papers array. */
  neighbors: number[]
  hasAbstract: boolean
}

export interface TopicCluster {
  id: number
  /** Human-authored topic name (scripts/topic_labels.json), null until labeled. */
  label: string | null
  size: number
}

export interface TopicsMeta {
  generatedAt: string
  model: string
  abstractCount: number
  clusterCount: number
}

export interface Topics {
  meta: TopicsMeta
  clusters: TopicCluster[]
  papers: TopicPoint[]
}
