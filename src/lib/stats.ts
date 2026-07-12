import { canonicalInstitution } from './institutions'
import type { Paper } from '../types'

export interface RankedItem {
  label: string
  count: number
}

function rank(counts: Map<string, number>): RankedItem[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function papersByTrack(papers: Paper[]): RankedItem[] {
  const counts = new Map<string, number>()
  for (const paper of papers) {
    counts.set(paper.track, (counts.get(paper.track) ?? 0) + 1)
  }
  return rank(counts)
}

export function topAuthors(papers: Paper[], limit: number): RankedItem[] {
  const counts = new Map<string, number>()
  for (const paper of papers) {
    for (const author of paper.authors) {
      counts.set(author.name, (counts.get(author.name) ?? 0) + 1)
    }
  }
  return rank(counts).slice(0, limit)
}

function paperInstitutions(paper: Paper): Set<string> {
  return new Set(
    paper.authors
      .flatMap((author) => author.affiliations)
      .map(canonicalInstitution)
      .filter((institution): institution is string => institution !== null),
  )
}

export function topInstitutions(papers: Paper[], limit: number): RankedItem[] {
  const counts = new Map<string, number>()
  for (const paper of papers) {
    for (const institution of paperInstitutions(paper)) {
      counts.set(institution, (counts.get(institution) ?? 0) + 1)
    }
  }
  return rank(counts).slice(0, limit)
}

export function teamSizeDistribution(papers: Paper[]): RankedItem[] {
  const counts = new Map<number, number>()
  for (const paper of papers) {
    const size = paper.authors.length
    counts.set(size, (counts.get(size) ?? 0) + 1)
  }
  const maxSize = Math.max(...counts.keys())
  const distribution: RankedItem[] = []
  for (let size = 1; size <= maxSize; size += 1) {
    distribution.push({ label: String(size), count: counts.get(size) ?? 0 })
  }
  return distribution
}

export function uniqueAuthorCount(papers: Paper[]): number {
  return new Set(papers.flatMap((paper) => paper.authors.map((author) => author.name))).size
}

export function uniqueInstitutionCount(papers: Paper[]): number {
  const institutions = new Set<string>()
  for (const paper of papers) {
    for (const institution of paperInstitutions(paper)) {
      institutions.add(institution)
    }
  }
  return institutions.size
}
