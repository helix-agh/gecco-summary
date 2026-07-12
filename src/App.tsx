import { useMemo, useState } from 'react'
import { BarList } from './components/BarList'
import { PapersTable } from './components/PapersTable'
import { StatTile } from './components/StatTile'
import { TopicMap } from './components/TopicMap'
import { YearSummary } from './components/YearSummary'
import { DEFAULT_YEAR, YEARS, datasets, isYear } from './lib/data'
import type { Year } from './lib/data'
import {
  institutionMembers,
  papersByTrack,
  teamSizeDistribution,
  topAuthors,
  topInstitutions,
  uniqueAuthorCount,
  uniqueInstitutionCount,
} from './lib/stats'
import { papersByContinent, papersByCountry, uniqueCountryCount } from './lib/countries'
import { authorUrl } from './lib/scholar'
import { trackName } from './lib/tracks'

const TOP_N = 10

/** Natural pixel size of each public/logo-<year>.png, for layout reservation. */
const LOGO_SIZES: Record<Year, { width: number; height: number }> = {
  2024: { width: 800, height: 800 },
  2025: { width: 1000, height: 876 },
  2026: { width: 500, height: 468 },
}

function initialYear(): Year {
  const param = Number(new URLSearchParams(window.location.search).get('year'))
  return isYear(param) ? param : DEFAULT_YEAR
}

export default function App() {
  const [year, setYear] = useState<Year>(initialYear)
  const { meta, papers } = datasets[year]

  const selectYear = (next: Year) => {
    setYear(next)
    const url = new URL(window.location.href)
    if (next === DEFAULT_YEAR) url.searchParams.delete('year')
    else url.searchParams.set('year', String(next))
    window.history.replaceState(null, '', url)
  }

  const stats = useMemo(
    () => ({
      tracks: papersByTrack(papers),
      authors: topAuthors(papers, TOP_N),
      institutions: topInstitutions(papers, TOP_N),
      teamSizes: teamSizeDistribution(papers),
      authorCount: uniqueAuthorCount(papers),
      institutionCount: uniqueInstitutionCount(papers),
      countries: papersByCountry(papers, year, TOP_N),
      continents: papersByContinent(papers, year),
      countryCount: uniqueCountryCount(papers, year),
    }),
    [papers, year],
  )

  const membersByInstitution = useMemo(() => institutionMembers(papers), [papers])

  const orcidByAuthor = useMemo(() => {
    const map = new Map<string, string>()
    for (const paper of papers) {
      for (const author of paper.authors) {
        if (author.orcid) map.set(author.name, author.orcid)
      }
    }
    return map
  }, [papers])

  return (
    <div className="page">
      <header className="site-header">
        <div className="container header-inner">
          <div>
            <p className="site-kicker">{meta.conference}</p>
            <h1 className="site-title">Accepted Papers Explorer</h1>
            <div className="year-switch" role="group" aria-label="Conference year">
              {YEARS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === year ? 'year-option is-active' : 'year-option'}
                  aria-pressed={option === year}
                  onClick={() => {
                    selectYear(option)
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <img
            className="site-logo"
            src={`${import.meta.env.BASE_URL}logo-${String(year)}.png`}
            alt={`GECCO ${String(year)} logo`}
            width={LOGO_SIZES[year].width}
            height={LOGO_SIZES[year].height}
          />
        </div>
      </header>

      <main className="container">
        <YearSummary year={year} />

        <section className="stat-row" aria-label="Key figures">
          <StatTile label="Accepted papers" value={papers.length} />
          <StatTile label="Authors" value={stats.authorCount} />
          <StatTile label="Institutions" value={stats.institutionCount} />
          <StatTile label="Countries" value={stats.countryCount} />
          <StatTile label="Tracks" value={stats.tracks.length} />
        </section>

        <section className="card-grid">
          <div className="card">
            <h2 className="card-title">Papers by track</h2>
            <p className="card-subtitle">
              Top {TOP_N}; hover a track acronym for its full name
            </p>
            <BarList items={stats.tracks.slice(0, TOP_N)} labelTitle={trackName} />
          </div>
          <div className="card">
            <h2 className="card-title">Team size</h2>
            <p className="card-subtitle">How many people co-author a GECCO paper</p>
            <BarList
              items={stats.teamSizes.map((item) => ({
                ...item,
                label: item.label === '1' ? '1 author' : `${item.label} authors`,
              }))}
            />
          </div>
          <div className="card">
            <h2 className="card-title">Most prolific authors</h2>
            <p className="card-subtitle">Papers co-authored, top {TOP_N}</p>
            <BarList
              items={stats.authors}
              labelHref={(name) => authorUrl(name, orcidByAuthor.get(name))}
            />
          </div>
          <div className="card">
            <h2 className="card-title">Leading institutions</h2>
            <p className="card-subtitle">
              Papers with at least one author from the institution, top {TOP_N}; hover for its
              authors
            </p>
            <BarList
              items={stats.institutions}
              labelTitle={(name) => membersByInstitution.get(name)?.join(', ')}
            />
          </div>
          <div className="card">
            <h2 className="card-title">Leading countries</h2>
            <p className="card-subtitle">
              Papers with at least one author from the country, top {TOP_N}
            </p>
            <BarList items={stats.countries} />
          </div>
          <div className="card">
            <h2 className="card-title">By continent</h2>
            <p className="card-subtitle">Papers with at least one author from the continent</p>
            <BarList items={stats.continents} />
          </div>
        </section>

        <section className="card" style={{ marginBottom: 16 }}>
          <h2 className="card-title">Topic map</h2>
          <TopicMap key={year} year={year} papers={papers} />
        </section>

        <section className="card">
          <h2 className="card-title">All papers</h2>
          <p className="card-subtitle">
            Titles link to the ACM Digital Library ({meta.doiMatched} of {meta.paperCount}{' '}
            matched); author names link to their ORCID record, hover one for their affiliation
          </p>
          <PapersTable key={year} papers={papers} />
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Built with ❤️ by{' '}
            <a href="https://helix-agh.github.io/" target="_blank" rel="noreferrer">
              HELIX
            </a>{' '}
            ·{' '}
            <a
              href="https://github.com/helix-agh/gecco-summary"
              target="_blank"
              rel="noreferrer"
            >
              Source on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  )
}
