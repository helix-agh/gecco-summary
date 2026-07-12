import type { RankedItem } from '../lib/stats'

interface BarListProps {
  items: RankedItem[]
  /** Optional full name shown as an instant tooltip on the row. */
  labelTitle?: (label: string) => string | undefined
  /** Optional external link for the row label. */
  labelHref?: (label: string) => string | undefined
}

/** Horizontal ranked bar chart: one series, direct value labels at the bar tips. */
export function BarList({ items, labelTitle, labelHref }: BarListProps) {
  const max = Math.max(...items.map((item) => item.count), 1)
  return (
    <div className="bar-list">
      {items.map((item) => {
        const tip = labelTitle?.(item.label)
        const hasTip = tip !== undefined && tip !== item.label
        const href = labelHref?.(item.label)
        return (
          <div
            className={hasTip ? 'bar-list-row tip' : 'bar-list-row'}
            data-tip={hasTip ? tip : undefined}
            key={item.label}
          >
            <span className="bar-list-label">
              {href !== undefined ? (
                <a href={href} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ) : (
                item.label
              )}
            </span>
            <span className="bar-list-track">
              <span
                className="bar-list-bar"
                style={{ width: `${String((item.count / max) * 100)}%` }}
              />
              <span className="bar-list-value">{item.count}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}
