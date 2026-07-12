import { useMemo, useState } from 'react'
import { trackName } from '../lib/tracks'
import type { Paper } from '../types'

interface PapersTableProps {
  papers: Paper[]
}

function matchesQuery(paper: Paper, query: string): boolean {
  if (paper.title.toLowerCase().includes(query)) return true
  return paper.authors.some(
    (author) =>
      author.name.toLowerCase().includes(query) ||
      author.affiliations.some((affiliation) => affiliation.toLowerCase().includes(query)),
  )
}

export function PapersTable({ papers }: PapersTableProps) {
  const [query, setQuery] = useState('')
  const [track, setTrack] = useState('')

  const tracks = useMemo(
    () => [...new Set(papers.map((paper) => paper.track))].sort(),
    [papers],
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return papers.filter(
      (paper) =>
        (track === '' || paper.track === track) &&
        (normalized === '' || matchesQuery(paper, normalized)),
    )
  }, [papers, query, track])

  return (
    <div>
      <div className="table-controls">
        <input
          type="search"
          className="control-input"
          placeholder="Search titles, authors, institutions…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
          }}
          aria-label="Search papers"
        />
        <select
          className="control-input control-select"
          value={track}
          onChange={(event) => {
            setTrack(event.target.value)
          }}
          aria-label="Filter by track"
        >
          <option value="">All tracks</option>
          {tracks.map((acronym) => (
            <option key={acronym} value={acronym}>
              {acronym} — {trackName(acronym)}
            </option>
          ))}
        </select>
        <span className="table-count">
          {filtered.length} of {papers.length} papers
        </span>
      </div>

      <div className="table-wrap">
        <table className="papers-table">
          <thead>
            <tr>
              <th className="col-track">Track</th>
              <th>Title</th>
              <th className="col-authors">Authors</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((paper) => (
              <tr key={paper.title}>
                <td className="col-track">
                  <span className="track-chip" title={trackName(paper.track)}>
                    {paper.track}
                  </span>
                </td>
                <td>
                  {paper.doi ? (
                    <a
                      className="paper-title-link"
                      href={`https://doi.org/${paper.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Open in the ACM Digital Library"
                    >
                      {paper.title}
                      <span className="external-mark" aria-hidden="true">
                        ↗
                      </span>
                    </a>
                  ) : (
                    paper.title
                  )}
                </td>
                <td className="col-authors">
                  {paper.authors.map((author, index) => (
                    <span key={author.name}>
                      {index > 0 && ', '}
                      <span className="author-name" title={author.affiliations.join(', ')}>
                        {author.name}
                      </span>
                    </span>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="table-empty">No papers match your search.</p>}
      </div>
    </div>
  )
}
