import { CLUSTER_COLORS, FOLD_COLOR } from '../lib/topics'
import type { Series } from '../lib/trends'

const WIDTH = 560
const HEIGHT = 300
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 34

interface LineChartProps {
  series: Series[]
  /** One label per data point, e.g. the years; must match each series' length. */
  xLabels: (string | number)[]
  /** Formats y-axis ticks and point tooltips (defaults to a rounded integer). */
  format?: (value: number) => string
}

function seriesColor(index: number): string {
  return CLUSTER_COLORS[index] ?? FOLD_COLOR
}

/** A "nice" axis maximum and tick step for a zero-based domain aiming at ~4 ticks. */
function axis(dataMax: number): { max: number; step: number } {
  if (dataMax <= 0) return { max: 1, step: 1 }
  const rough = dataMax / 4
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const n = rough / pow
  const step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
  return { max: Math.ceil(dataMax / step) * step, step }
}

/**
 * Zero-based multi-series line chart as inline SVG (no chart dependency, matching
 * the app's hand-built TopicMap). Responsive: the viewBox scales to the card width.
 */
export function LineChart({
  series,
  xLabels,
  format = (v) => String(Math.round(v)),
}: LineChartProps) {
  const dataMax = Math.max(...series.flatMap((s) => s.points), 0)
  const { max, step } = axis(dataMax)
  const ticks: number[] = []
  for (let t = 0; t <= max + 1e-9; t += step) ticks.push(t)

  const n = xLabels.length
  const innerW = WIDTH - PAD_L - PAD_R
  const innerH = HEIGHT - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW)
  const y = (v: number) => PAD_T + innerH - (v / max) * innerH

  return (
    <div className="chart">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
        role="img"
        aria-label={`Line chart of ${series.map((s) => s.label).join(', ')} over ${String(n)} years`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="chart-grid" x1={PAD_L} x2={WIDTH - PAD_R} y1={y(t)} y2={y(t)} />
            <text className="chart-tick" x={PAD_L - 8} y={y(t)} dy="0.32em" textAnchor="end">
              {format(t)}
            </text>
          </g>
        ))}
        {xLabels.map((label, i) => (
          <text
            key={label}
            className="chart-tick"
            x={x(i)}
            y={HEIGHT - PAD_B + 20}
            textAnchor="middle"
          >
            {label}
          </text>
        ))}
        {series.map((s, si) => (
          <g key={s.label} stroke={seriesColor(si)} fill={seriesColor(si)}>
            <polyline
              className="chart-line"
              points={s.points.map((v, i) => `${String(x(i))},${String(y(v))}`).join(' ')}
            />
            {s.points.map((v, i) => (
              <circle key={i} className="chart-dot" cx={x(i)} cy={y(v)} r={3.5}>
                <title>{`${s.label} · ${String(xLabels[i])}: ${format(v)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      {series.length > 1 && (
        <ul className="chart-legend">
          {series.map((s, si) => (
            <li key={s.label} className="chart-legend-item">
              <span
                className="chart-swatch"
                style={{ background: seriesColor(si) }}
                aria-hidden="true"
              />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
