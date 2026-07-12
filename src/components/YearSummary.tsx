import type { Year } from '../lib/data'
import { SUMMARIES } from '../lib/summaries'

export function YearSummary({ year }: { year: Year }) {
  const summary = SUMMARIES[year]

  return (
    <section className="summary-card" aria-label={`GECCO ${String(year)} summary`}>
      <div className="summary-head">
        <p className="summary-eyebrow">GECCO {year} · The year in review</p>
        <div className="summary-meta">
          <span className="summary-location">
            <span className="summary-flag" aria-hidden="true">
              {summary.flag}
            </span>
            {summary.location}
          </span>
        </div>
      </div>
      <p className="summary-headline">{summary.headline}</p>
      <p className="summary-overview">{summary.overview}</p>
      <div className="summary-key">
        <span className="summary-key-label">Most important change</span>
        <p className="summary-key-text">{summary.keyChange}</p>
      </div>
      <p className="summary-attribution">
        <span className="summary-attribution-mark" aria-hidden="true">
          ✦
        </span>
        AI-written from the accepted titles and abstracts
      </p>
    </section>
  )
}
