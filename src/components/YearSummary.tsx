import type { Year } from '../lib/data'
import { SUMMARIES } from '../lib/summaries'

export function YearSummary({ year }: { year: Year }) {
  const summary = SUMMARIES[year]

  return (
    <section className="summary-card" aria-label={`GECCO ${String(year)} summary`}>
      <div className="summary-head">
        <span className="summary-badge">AI Summary</span>
        <div className="summary-meta">
          <span className="summary-location">📍 {summary.location}</span>
          <span className="summary-format">{summary.format}</span>
        </div>
      </div>
      <p className="summary-headline">{summary.headline}</p>
      <p className="summary-overview">{summary.overview}</p>
      <p className="summary-key">
        <span className="summary-key-label">Most important change</span>
        {summary.keyChange}
      </p>
    </section>
  )
}
