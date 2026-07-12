import { useMemo } from 'react'
import { BarList } from './components/BarList'
import { PapersTable } from './components/PapersTable'
import { StatTile } from './components/StatTile'
import { dataset } from './lib/data'
import {
  papersByTrack,
  teamSizeDistribution,
  topAuthors,
  topInstitutions,
  uniqueAuthorCount,
  uniqueInstitutionCount,
} from './lib/stats'
import { scholarUrl } from './lib/scholar'
import { trackName } from './lib/tracks'

const TOP_N = 10

export default function App() {
  const { meta, papers } = dataset

  const stats = useMemo(
    () => ({
      tracks: papersByTrack(papers),
      authors: topAuthors(papers, TOP_N),
      institutions: topInstitutions(papers, TOP_N),
      teamSizes: teamSizeDistribution(papers),
      authorCount: uniqueAuthorCount(papers),
      institutionCount: uniqueInstitutionCount(papers),
    }),
    [papers],
  )

  return (
    <div className="page">
      <header className="site-header">
        <div className="container header-inner">
          <div>
            <p className="site-kicker">{meta.conference}</p>
            <h1 className="site-title">Accepted Papers Explorer</h1>
            <p className="site-subtitle">
              Every full paper accepted at the Genetic and Evolutionary Computation Conference —
              searchable by track, author, and institution, with links to the ACM proceedings.
            </p>
          </div>
          <img
            className="site-logo"
            src="/logo.png"
            alt="GECCO 2026 logo"
            width="500"
            height="468"
          />
        </div>
      </header>

      <main className="container">
        <section className="stat-row" aria-label="Key figures">
          <StatTile label="Accepted papers" value={papers.length} />
          <StatTile label="Authors" value={stats.authorCount} />
          <StatTile label="Institutions" value={stats.institutionCount} />
          <StatTile label="Tracks" value={stats.tracks.length} />
        </section>

        <section className="card-grid">
          <div className="card">
            <h2 className="card-title">Papers by track</h2>
            <p className="card-subtitle">Hover a track acronym for its full name</p>
            <BarList items={stats.tracks} labelTitle={trackName} />
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
            <p className="card-subtitle">
              Papers co-authored, top {TOP_N}; names link to Google Scholar
            </p>
            <BarList items={stats.authors} labelHref={scholarUrl} />
          </div>
          <div className="card">
            <h2 className="card-title">Leading institutions</h2>
            <p className="card-subtitle">
              Papers with at least one author from the institution, top {TOP_N}
            </p>
            <BarList items={stats.institutions} />
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">All papers</h2>
          <p className="card-subtitle">
            Titles link to the ACM Digital Library ({meta.doiMatched} of {meta.paperCount}{' '}
            matched); author names link to Google Scholar, hover one for their affiliation
          </p>
          <PapersTable papers={papers} />
        </section>
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Data scraped from the{' '}
            <a href={meta.source} target="_blank" rel="noreferrer">
              GECCO 2026 accepted papers list
            </a>{' '}
            on {meta.scrapedAt.slice(0, 10)}; DOIs matched via{' '}
            <a href="https://www.crossref.org" target="_blank" rel="noreferrer">
              Crossref
            </a>
            . Institution counts fold institutes, labs, and name variants into their parent
            university (e.g. LIACS → Leiden University); author tooltips show affiliations as
            published.
          </p>
          <p>
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
