import { YEARS, datasets } from './data'
import type { Year } from './data'
import { uniqueAuthorCount, uniqueInstitutionCount } from './stats'
import { papersByContinent } from './countries'

/** The editions plotted across every trend chart, oldest → newest. */
export const TREND_YEARS: Year[] = [...YEARS]

/** One line on a chart: a value per year, aligned to {@link TREND_YEARS}. */
export interface Series {
  label: string
  points: number[]
}

function perYear(
  pick: (papers: (typeof datasets)[Year]['papers'], year: Year) => number,
): number[] {
  return TREND_YEARS.map((year) => pick(datasets[year].papers, year))
}

/** How big each edition is: accepted papers, distinct authors, distinct institutions. */
export function participationSeries(): Series[] {
  return [
    { label: 'Papers', points: perYear((papers) => papers.length) },
    { label: 'Authors', points: perYear((papers) => uniqueAuthorCount(papers)) },
    { label: 'Institutions', points: perYear((papers) => uniqueInstitutionCount(papers)) },
  ]
}

/** One line per continent, papers-with-an-author-from-it over time. */
export function continentSeries(): Series[] {
  const byYear = TREND_YEARS.map(
    (year) =>
      new Map(papersByContinent(datasets[year].papers, year).map((i) => [i.label, i.count])),
  )
  const labels = new Set<string>()
  for (const counts of byYear) for (const label of counts.keys()) labels.add(label)
  return [...labels]
    .map((label) => ({ label, points: byYear.map((counts) => counts.get(label) ?? 0) }))
    .sort(
      (a, b) => Math.max(...b.points) - Math.max(...a.points) || a.label.localeCompare(b.label),
    )
}
