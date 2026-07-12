import { useMemo, useState } from 'react'
import {
  FOLD_COLOR,
  clusterColor,
  joinTopicPapers,
  topicsByYear,
  trackColors,
} from '../lib/topics'
import { trackName } from '../lib/tracks'
import type { MapPoint } from '../lib/topics'
import type { Year } from '../lib/data'
import type { Paper, Topics } from '../types'

const WIDTH = 1000
const HEIGHT = 620
const PAD = 52
const DOT_RADIUS = 7

type ColorBy = 'topic' | 'track'

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
  const [colorBy, setColorBy] = useState<ColorBy>('topic')
  const [hovered, setHovered] = useState<number | null>(null)
  const [focused, setFocused] = useState<string | null>(null)

  const topics = topicsByYear[year]
  const points = useMemo(() => joinTopicPapers(topics, papers), [topics, papers])
  const trackColor = useMemo(() => trackColors(papers), [papers])

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
          cx: pixels.reduce((sum, [x]) => sum + x, 0) / pixels.length,
          cy: pixels.reduce((sum, [, y]) => sum + y, 0) / pixels.length,
        }
      })
  }, [topics, points])

  const legend: { key: string; label: string; color: string; count: number }[] = useMemo(() => {
    if (colorBy === 'topic') {
      return clusters.map((cluster) => ({
        key: `topic:${String(cluster.id)}`,
        label: cluster.label,
        color: clusterColor(cluster.id),
        count: cluster.count,
      }))
    }
    const counts = new Map<string, number>()
    for (const point of points) {
      counts.set(point.paper.track, (counts.get(point.paper.track) ?? 0) + 1)
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([track, count]) => ({
        key: `track:${track}`,
        label: track,
        color: trackColor.get(track) ?? FOLD_COLOR,
        count,
      }))
  }, [clusters, points, trackColor, colorBy])

  const pointKey = (point: MapPoint) =>
    colorBy === 'topic' ? `topic:${String(point.cluster)}` : `track:${point.paper.track}`
  const pointColor = (point: MapPoint) =>
    colorBy === 'topic'
      ? clusterColor(point.cluster)
      : (trackColor.get(point.paper.track) ?? FOLD_COLOR)
  const isDimmed = (point: MapPoint) => focused !== null && pointKey(point) !== focused

  const hoveredPoint = hovered === null ? null : points[hovered]
  const neighborSet = new Set(hoveredPoint?.neighbors ?? [])

  return (
    <div className="topic-map">
      <div className="table-controls">
        <div className="segmented" role="group" aria-label="Color points by">
          {(['topic', 'track'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`segmented-option${colorBy === mode ? ' is-active' : ''}`}
              aria-pressed={colorBy === mode}
              onClick={() => {
                setColorBy(mode)
                setFocused(null)
              }}
            >
              Color by {mode}
            </button>
          ))}
        </div>
        <span className="table-count">
          {topics.meta.clusterCount} topics · {points.length} papers
        </span>
      </div>

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
                fill={colorBy === 'topic' ? clusterColor(cluster.id) : FOLD_COLOR}
                stroke={colorBy === 'topic' ? clusterColor(cluster.id) : FOLD_COLOR}
                opacity={colorBy === 'topic' ? 0.08 : 0.05}
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
                className={`topic-map-dot${isDimmed(point) ? ' is-dimmed' : ''}${
                  neighborSet.has(index) ? ' is-neighbor' : ''
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

          <g className="topic-map-labels" aria-hidden="true">
            {clusters.map((cluster) => (
              <text key={cluster.id} x={cluster.cx} y={cluster.cy}>
                {cluster.label}
              </text>
            ))}
          </g>
        </svg>

        {hoveredPoint && (
          <div
            className="topic-map-tip"
            style={{
              left: `${((px(hoveredPoint.x) / WIDTH) * 100).toFixed(2)}%`,
              top: `${((py(hoveredPoint.y) / HEIGHT) * 100).toFixed(2)}%`,
              transform: `translate(${px(hoveredPoint.x) > WIDTH / 2 ? '-100%' : '12px'}, ${
                py(hoveredPoint.y) > HEIGHT / 2 ? 'calc(-100% - 12px)' : '12px'
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
            className={`legend-chip${focused === entry.key ? ' is-active' : ''}${
              focused !== null && focused !== entry.key ? ' is-muted' : ''
            }`}
            onClick={() => {
              setFocused(focused === entry.key ? null : entry.key)
            }}
            title={colorBy === 'track' ? trackName(entry.label) : undefined}
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
