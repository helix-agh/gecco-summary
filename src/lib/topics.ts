import topics2024 from '../data/topics-2024.json'
import topics2025 from '../data/topics-2025.json'
import topics2026 from '../data/topics.json'
import type { Year } from './data'
import type { Paper, Topics, TopicPoint } from '../types'

export const topicsByYear: Record<Year, Topics> = {
  2024: topics2024,
  2025: topics2025,
  2026: topics2026,
}

/** Categorical palette validated for CVD separation and chroma on the white
 *  card surface (dataviz six-checks validator; three slots are sub-3:1 on
 *  white, which the always-visible hull labels and papers table relieve).
 *  Slot order is the colorblind-safety mechanism — never reorder or cycle. */
export const CLUSTER_COLORS = [
  '#2a78d6',
  '#1baf7a',
  '#eda100',
  '#008300',
  '#4a3aa7',
  '#e34948',
  '#e87ba4',
  '#eb6834',
  '#0089a3',
  '#a3571f',
]

/** Entities beyond the palette fold into a neutral "other" gray. */
export const FOLD_COLOR = '#8a8f98'

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
