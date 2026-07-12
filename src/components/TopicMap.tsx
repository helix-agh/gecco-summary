import { useMemo, useState } from 'react'
import { clusterColor, joinTopicPapers, topicsByYear } from '../lib/topics'
import { trackName } from '../lib/tracks'
import type { MapPoint } from '../lib/topics'
import type { Year } from '../lib/data'
import type { Paper, Topics } from '../types'

const WIDTH = 1000
const HEIGHT = 620
const PAD = 52
const DOT_RADIUS = 7

interface TopicMapProps {
  year: Year
  papers: Paper[]
}

function px(x: number): number {
  return PAD + x * (WIDTH - 2 * PAD)
}

function py(y: number): number {
  return PAD + y * (HEIGHT - 2 * PAD)
}

/** Convex hull via Andrew's monotone chain; input as [x, y] pixel pairs. */
function convexHull(points: [number, number][]): [number, number][] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (sorted.length <= 2) return sorted
  const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const half = (input: [number, number][]) => {
    const chain: [number, number][] = []
    for (const point of input) {
      while (
        chain.length >= 2 &&
        cross(chain[chain.length - 2], chain[chain.length - 1], point) <= 0
      ) {
        chain.pop()
      }
      chain.push(point)
    }
    chain.pop()
    return chain
  }
  return [...half(sorted), ...half([...sorted].reverse())]
}

function hullPath(points: [number, number][]): string {
  const hull = convexHull(points)
  return (
    hull.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join('') +
    'Z'
  )
}

function clusterLabel(topics: Topics, id: number): string {
  return topics.clusters[id]?.label ?? `Topic ${String(id + 1)}`
}

export function TopicMap({ year, papers }: TopicMapProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  const topics = topicsByYear[year]
  const points = useMemo(() => joinTopicPapers(topics, papers), [topics, papers])

  const clusters = useMemo(() => {
    const members = new Map<number, MapPoint[]>()
    for (const point of points) {
      const list = members.get(point.cluster) ?? []
      list.push(point)
      members.set(point.cluster, list)
    }
    return [...members.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([id, list]) => {
        const pixels = list.map((p) => [px(p.x), py(p.y)] as [number, number])
        return {
          id,
          label: clusterLabel(topics, id),
          count: list.length,
          path: hullPath(pixels),
        }
      })
  }, [topics, points])

  const legend = useMemo(
    () =>
      clusters.map((cluster) => ({
        key: `topic:${String(cluster.id)}`,
        label: cluster.label,
        color: clusterColor(cluster.id),
        count: cluster.count,
      })),
    [clusters],
  )

  const pointKey = (point: MapPoint) => `topic:${String(point.cluster)}`
  const pointColor = (point: MapPoint) => clusterColor(point.cluster)
  const isDimmed = (point: MapPoint) => focused !== null && pointKey(point) !== focused

  const hoveredPoint = hovered === null ? null : points[hovered]
  const neighborSet = new Set(hoveredPoint?.neighbors ?? [])

  return (
    <div className="topic-map">
      <div className="topic-map-canvas">
        <svg
          viewBox={`0 0 ${String(WIDTH)} ${String(HEIGHT)}`}
          role="img"
          aria-label="Map of accepted papers grouped by topic similarity"
        >
          <g className="topic-map-hulls">
            {clusters.map((cluster) => (
              <path
                key={cluster.id}
                d={cluster.path}
                fill={clusterColor(cluster.id)}
                stroke={clusterColor(cluster.id)}
                opacity={0.08}
                strokeWidth={40}
                strokeLinejoin="round"
              />
            ))}
          </g>

          {hoveredPoint?.neighbors.map((neighbor) => {
            const other = points.at(neighbor)
            return other ? (
              <line
                key={neighbor}
                x1={px(hoveredPoint.x)}
                y1={py(hoveredPoint.y)}
                x2={px(other.x)}
                y2={py(other.y)}
                className="topic-map-link"
              />
            ) : null
          })}

          <g>
            {points.map((point, index) => (
              <circle
                key={point.title}
                cx={px(point.x)}
                cy={py(point.y)}
                r={hovered === index || neighborSet.has(index) ? DOT_RADIUS + 2 : DOT_RADIUS}
                fill={pointColor(point)}
                className={`topic-map-dot${isDimmed(point) ? ' is-dimmed' : ''}${neighborSet.has(index) ? ' is-neighbor' : ''
                  }`}
                onMouseEnter={() => {
                  setHovered(index)
                }}
                onMouseLeave={() => {
                  setHovered(null)
                }}
                onClick={() => {
                  if (point.paper.doi) {
                    window.open(`https://doi.org/${point.paper.doi}`, '_blank', 'noopener')
                  }
                }}
              />
            ))}
          </g>
        </svg>

        {hoveredPoint && (
          <div
            className="topic-map-tip"
            style={{
              left: `${((px(hoveredPoint.x) / WIDTH) * 100).toFixed(2)}%`,
              top: `${((py(hoveredPoint.y) / HEIGHT) * 100).toFixed(2)}%`,
              transform: `translate(${px(hoveredPoint.x) > WIDTH / 2 ? '-100%' : '12px'}, ${py(hoveredPoint.y) > HEIGHT / 2 ? 'calc(-100% - 12px)' : '12px'
                })`,
            }}
          >
            <p className="topic-map-tip-title">{hoveredPoint.title}</p>
            <p className="topic-map-tip-meta">
              {hoveredPoint.paper.authors.map((author) => author.name).join(', ')}
            </p>
            <p className="topic-map-tip-meta">
              <span className="track-chip" title={trackName(hoveredPoint.paper.track)}>
                {hoveredPoint.paper.track}
              </span>{' '}
              {clusterLabel(topics, hoveredPoint.cluster)}
            </p>
            <p className="topic-map-tip-similar">Most similar papers</p>
            <ul>
              {hoveredPoint.neighbors.map((neighbor) => {
                const other = points.at(neighbor)
                return other ? <li key={neighbor}>{other.title}</li> : null
              })}
            </ul>
            {hoveredPoint.paper.doi && (
              <p className="topic-map-tip-hint">Click to open in the ACM DL</p>
            )}
          </div>
        )}
      </div>

      <div className="topic-map-legend">
        {legend.map((entry) => (
          <button
            key={entry.key}
            type="button"
            className={`legend-chip${focused === entry.key ? ' is-active' : ''}${focused !== null && focused !== entry.key ? ' is-muted' : ''
              }`}
            onClick={() => {
              setFocused(focused === entry.key ? null : entry.key)
            }}
          >
            <span
              className="legend-dot"
              style={{ background: entry.color }}
              aria-hidden="true"
            />
            {entry.label}
            <span className="legend-count">{entry.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
