import topics2021 from '../data/topics-2021.json'
import topics2022 from '../data/topics-2022.json'
import topics2023 from '../data/topics-2023.json'
import topics2024 from '../data/topics-2024.json'
import topics2025 from '../data/topics-2025.json'
import topics2026 from '../data/topics.json'
import type { Year } from './data'
import type { Paper, Topics, TopicPoint } from '../types'

export const topicsByYear: Record<Year, Topics> = {
  2021: topics2021,
  2022: topics2022,
  2023: topics2023,
  2024: topics2024,
  2025: topics2025,
  2026: topics2026,
}

/** Warm, editorial categorical palette tuned to the site's clay/ivory system —
 *  it opens on terracotta to echo the brand accent. Validated by the dataviz
 *  six-checks (light, white card surface): passes chroma floor, contrast ≥ 3:1
 *  on every slot, and adjacent CVD separation; the legend chips supply the
 *  labels that back the categorical encoding. Hue order alternates warm/cool so
 *  neighbouring cluster ids stay distinct — never reorder or cycle. */
export const CLUSTER_COLORS = [
  '#bd5a3c',
  '#0097ac',
  '#b07d12',
  '#3f66ac',
  '#6f8a2e',
  '#a8407a',
  '#2f8a5f',
  '#9a5518',
  '#6b4aa8',
  '#c23b34',
]

/** Entities beyond the palette fold into a neutral warm "other" gray. */
export const FOLD_COLOR = '#9a938a'

export function clusterColor(cluster: number): string {
  return CLUSTER_COLORS[cluster] ?? FOLD_COLOR
}

/** A topic-map point joined back to its full paper record. */
export interface MapPoint extends TopicPoint {
  paper: Paper
}

/** Join topics.json entries with papers.json records by title, preserving
 *  topics.json order (neighbor indices point into that order). */
export function joinTopicPapers(topics: Topics, papers: Paper[]): MapPoint[] {
  const byTitle = new Map(papers.map((paper) => [paper.title, paper]))
  return topics.papers.flatMap((point) => {
    const paper = byTitle.get(point.title)
    return paper ? [{ ...point, paper }] : []
  })
}

/** Fixed palette slots for tracks, most popular first; tracks beyond the
 *  palette share the fold gray (the legend still lists them all). */
export function trackColors(papers: Paper[]): Map<string, string> {
  const counts = new Map<string, number>()
  for (const paper of papers) {
    counts.set(paper.track, (counts.get(paper.track) ?? 0) + 1)
  }
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  return new Map(ordered.map(([track], index) => [track, clusterColor(index)]))
}
