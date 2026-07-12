import countries2024 from '../data/countries-2024.json'
import countries2025 from '../data/countries-2025.json'
import countries2026 from '../data/countries.json'
import type { Year } from './data'
import type { RankedItem } from './stats'
import type { Paper } from '../types'

/** Per-paper author country sets (ISO-3166 alpha-2), keyed by paper title,
 *  built by scripts/countries.py from OpenAlex. */
interface CountryData {
  byTitle: Record<string, string[]>
}

const rawByYear: Record<Year, CountryData> = {
  2024: countries2024,
  2025: countries2025,
  2026: countries2026,
}

/** title → country codes, as Maps so a missing title reads as undefined. */
const codesByYear: Record<Year, Map<string, string[]>> = {
  2024: new Map(Object.entries(rawByYear[2024].byTitle)),
  2025: new Map(Object.entries(rawByYear[2025].byTitle)),
  2026: new Map(Object.entries(rawByYear[2026].byTitle)),
}

interface CountryInfo {
  name: string
  continent: string
}

/** Every code emitted by scripts/countries.py across all three years, mapped
 *  to a display name and continent. Hong Kong, Macao, and Taiwan are listed as
 *  distinct territories under Asia. Russia and Turkey are grouped with Europe. */
const COUNTRIES: Record<string, CountryInfo> = {
  AT: { name: 'Austria', continent: 'Europe' },
  AU: { name: 'Australia', continent: 'Oceania' },
  BE: { name: 'Belgium', continent: 'Europe' },
  BR: { name: 'Brazil', continent: 'South America' },
  CA: { name: 'Canada', continent: 'North America' },
  CH: { name: 'Switzerland', continent: 'Europe' },
  CL: { name: 'Chile', continent: 'South America' },
  CN: { name: 'China', continent: 'Asia' },
  CO: { name: 'Colombia', continent: 'South America' },
  CY: { name: 'Cyprus', continent: 'Europe' },
  CZ: { name: 'Czechia', continent: 'Europe' },
  DE: { name: 'Germany', continent: 'Europe' },
  DK: { name: 'Denmark', continent: 'Europe' },
  DZ: { name: 'Algeria', continent: 'Africa' },
  EG: { name: 'Egypt', continent: 'Africa' },
  ES: { name: 'Spain', continent: 'Europe' },
  FI: { name: 'Finland', continent: 'Europe' },
  FR: { name: 'France', continent: 'Europe' },
  GB: { name: 'United Kingdom', continent: 'Europe' },
  GR: { name: 'Greece', continent: 'Europe' },
  HK: { name: 'Hong Kong', continent: 'Asia' },
  HR: { name: 'Croatia', continent: 'Europe' },
  HU: { name: 'Hungary', continent: 'Europe' },
  IE: { name: 'Ireland', continent: 'Europe' },
  IL: { name: 'Israel', continent: 'Asia' },
  IN: { name: 'India', continent: 'Asia' },
  IQ: { name: 'Iraq', continent: 'Asia' },
  IT: { name: 'Italy', continent: 'Europe' },
  JP: { name: 'Japan', continent: 'Asia' },
  KR: { name: 'South Korea', continent: 'Asia' },
  MO: { name: 'Macao', continent: 'Asia' },
  MT: { name: 'Malta', continent: 'Europe' },
  MX: { name: 'Mexico', continent: 'North America' },
  NL: { name: 'Netherlands', continent: 'Europe' },
  NO: { name: 'Norway', continent: 'Europe' },
  NZ: { name: 'New Zealand', continent: 'Oceania' },
  PL: { name: 'Poland', continent: 'Europe' },
  PT: { name: 'Portugal', continent: 'Europe' },
  RO: { name: 'Romania', continent: 'Europe' },
  RU: { name: 'Russia', continent: 'Europe' },
  SE: { name: 'Sweden', continent: 'Europe' },
  SG: { name: 'Singapore', continent: 'Asia' },
  SI: { name: 'Slovenia', continent: 'Europe' },
  TN: { name: 'Tunisia', continent: 'Africa' },
  TR: { name: 'Turkey', continent: 'Europe' },
  TW: { name: 'Taiwan', continent: 'Asia' },
  US: { name: 'United States', continent: 'North America' },
  UY: { name: 'Uruguay', continent: 'South America' },
  VN: { name: 'Vietnam', continent: 'Asia' },
  ZA: { name: 'South Africa', continent: 'Africa' },
}

function countryInfo(code: string): CountryInfo | undefined {
  return COUNTRIES[code]
}

export function countryName(code: string): string {
  return countryInfo(code)?.name ?? code
}

/** ISO alpha-2 code → regional-indicator flag emoji (🇬🇧 etc). */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return ''
  const base = 0x1f1e6 - 0x41 // regional indicator 'A' minus ASCII 'A'
  const cc = code.toUpperCase()
  return String.fromCodePoint(base + cc.charCodeAt(0), base + cc.charCodeAt(1))
}

/** The codes for a paper, looked up by title (the join key used across the app). */
function paperCodes(paper: Paper, year: Year): string[] {
  return codesByYear[year].get(paper.title) ?? []
}

/** Count each code once per paper it appears on, then rank by count (name as
 *  the alphabetical tiebreak so the flag prefix never perturbs the order). */
function rankCodes(counts: Map<string, number>): RankedItem[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || countryName(a[0]).localeCompare(countryName(b[0])))
    .map(([code, count]) => ({ label: `${flagEmoji(code)} ${countryName(code)}`, count }))
}

/** Papers with at least one author from each country ("any author"). Because a
 *  paper can span countries, the counts sum to more than the paper total. */
export function papersByCountry(papers: Paper[], year: Year, limit?: number): RankedItem[] {
  const counts = new Map<string, number>()
  for (const paper of papers) {
    for (const code of new Set(paperCodes(paper, year))) {
      counts.set(code, (counts.get(code) ?? 0) + 1)
    }
  }
  const ranked = rankCodes(counts)
  return limit === undefined ? ranked : ranked.slice(0, limit)
}

/** Papers with at least one author from each continent ("any author"). */
export function papersByContinent(papers: Paper[], year: Year): RankedItem[] {
  const counts = new Map<string, number>()
  for (const paper of papers) {
    const continents = new Set(
      paperCodes(paper, year)
        .map((code) => countryInfo(code)?.continent)
        .filter((continent): continent is string => continent !== undefined),
    )
    for (const continent of continents) {
      counts.set(continent, (counts.get(continent) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/** Distinct countries represented across the year's papers. */
export function uniqueCountryCount(papers: Paper[], year: Year): number {
  const codes = new Set<string>()
  for (const paper of papers) {
    for (const code of paperCodes(paper, year)) codes.add(code)
  }
  return codes.size
}
