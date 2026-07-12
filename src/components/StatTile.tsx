interface StatTileProps {
  label: string
  value: number
  detail?: string
}

export function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <div className="stat-tile">
      <div className="stat-tile-label">{label}</div>
      <div className="stat-tile-value">{value.toLocaleString('en-US')}</div>
      {detail ? <div className="stat-tile-detail">{detail}</div> : null}
    </div>
  )
}
