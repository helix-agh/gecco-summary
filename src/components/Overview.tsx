import { useMemo } from 'react'
import { LineChart } from './LineChart'
import { TREND_YEARS, continentSeries, participationSeries } from '../lib/trends'

export function Overview() {
  const charts = useMemo(
    () => ({
      participation: participationSeries(),
      continents: continentSeries(),
    }),
    [],
  )

  return (
    <>
      <section className="overview-intro">
        <h2 className="card-title">How GECCO has changed</h2>
      </section>

      <section className="card-grid">
        <div className="card">
          <h2 className="card-title">Conference size</h2>
          <p className="card-subtitle">
            Accepted papers, distinct authors, distinct institutions
          </p>
          <LineChart series={charts.participation} xLabels={TREND_YEARS} />
        </div>
        <div className="card">
          <h2 className="card-title">By continent</h2>
          <p className="card-subtitle">Papers with an author from each continent</p>
          <LineChart series={charts.continents} xLabels={TREND_YEARS} />
        </div>
      </section>
    </>
  )
}
