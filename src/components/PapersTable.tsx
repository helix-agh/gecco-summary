import { useMemo, useState } from 'react'
import type { ProgramIndex } from '../lib/program'
import { authorUrl } from '../lib/scholar'
import { trackName } from '../lib/tracks'
import type { Paper } from '../types'

interface PapersTableProps {
  papers: Paper[]
  /** Presentation schedule; enables the day/time filters and session column. */
  program?: ProgramIndex
}

interface HoverState {
  paper: Paper
  x: number
  y: number
}

/** Popover half-width / height budget used to keep the card inside the viewport. */
const TIP_WIDTH = 380
const TIP_MAX_HEIGHT = 320

function matchesQuery(paper: Paper, query: string): boolean {
  if (paper.title.toLowerCase().includes(query)) return true
  return paper.authors.some(
    (author) =>
      author.name.toLowerCase().includes(query) ||
      author.affiliations.some((affiliation) => affiliation.toLowerCase().includes(query)),
  )
}

/** "11:30-13:00" → "11:30–13:00" for display. */
function slotLabel(slot: string): string {
  return slot.replace('-', '–')
}

export function PapersTable({ papers, program }: PapersTableProps) {
  const [query, setQuery] = useState('')
  const [track, setTrack] = useState('')
  const [day, setDay] = useState('')
  const [slot, setSlot] = useState('')
  const [hover, setHover] = useState<HoverState | null>(null)

  const showAbstract = (paper: Paper, event: { clientX: number; clientY: number }) => {
    if (!paper.abstract) return
    setHover({ paper, x: event.clientX, y: event.clientY })
  }

  const tracks = useMemo(
    () => [...new Set(papers.map((paper) => paper.track))].sort(),
    [papers],
  )

  const slots = program?.days.find((d) => d.date === day)?.slots ?? []

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const result = papers.filter((paper) => {
      if (track !== '' && paper.track !== track) return false
      if (normalized !== '' && !matchesQuery(paper, normalized)) return false
      if (day !== '' || slot !== '') {
        const talk = program?.byTitle.get(paper.title)
        if (!talk) return false
        if (day !== '' && talk.date !== day) return false
        if (slot !== '' && talk.timeSlot !== slot) return false
      }
      return true
    })
    // With a schedule filter active the table reads as a mini-program:
    // chronological, with parallel sessions grouped together.
    if (program && day !== '') {
      result.sort((a, b) => {
        const ta = program.byTitle.get(a.title)
        const tb = program.byTitle.get(b.title)
        if (!ta || !tb) return 0
        return (
          ta.timeSlot.localeCompare(tb.timeSlot) ||
          ta.session.localeCompare(tb.session) ||
          ta.time.localeCompare(tb.time)
        )
      })
    }
    return result
  }, [papers, query, track, day, slot, program])

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
        {program && (
          <>
            <select
              className="control-input control-select"
              value={day}
              onChange={(event) => {
                setDay(event.target.value)
                setSlot('')
              }}
              aria-label="Filter by day"
            >
              <option value="">All days</option>
              {program.days.map((option) => (
                <option key={option.date} value={option.date}>
                  {option.label}
                </option>
              ))}
            </select>
            <select
              className="control-input control-select"
              value={slot}
              disabled={day === ''}
              onChange={(event) => {
                setSlot(event.target.value)
              }}
              aria-label="Filter by session time"
              title={day === '' ? 'Pick a day first' : undefined}
            >
              <option value="">{day === '' ? 'Pick a day first' : 'All times'}</option>
              {slots.map((option) => (
                <option key={option} value={option}>
                  {slotLabel(option)}
                </option>
              ))}
            </select>
            <span className="bp-legend">
              <span className="bp-star" aria-hidden="true">
                ★
              </span>{' '}
              Best Paper nominee
            </span>
          </>
        )}
        <span className="table-count">
          {filtered.length} of {papers.length} papers
        </span>
      </div>

      <div className="table-wrap">
        <table className="papers-table">
          <thead>
            <tr>
              <th className="col-track">Track</th>
              {program && <th className="col-session">Session</th>}
              <th className="col-title">Title</th>
              <th className="col-authors">Authors</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((paper) => {
              const talk = program?.byTitle.get(paper.title)
              return (
                <tr
                  key={paper.title}
                  className={paper.abstract ? 'has-abstract' : undefined}
                  onMouseEnter={(event) => {
                    showAbstract(paper, event)
                  }}
                  onMouseLeave={() => {
                    setHover(null)
                  }}
                >
                  <td className="col-track">
                    <span className="track-chip" title={trackName(paper.track)}>
                      {paper.track}
                    </span>
                  </td>
                  {program && (
                    <td className="col-session">
                      {talk && (
                        <>
                          <span className="session-slot">
                            {talk.day.slice(0, 3)} {slotLabel(talk.time)}
                          </span>
                          <span className="session-room">
                            {talk.session} · {talk.room}
                          </span>
                        </>
                      )}
                    </td>
                  )}
                  <td className="col-title">
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
                    {talk?.bestPaperNominee && (
                      <span className="bp-star" title="Best Paper Award nominee">
                        ★
                      </span>
                    )}
                  </td>
                  <td className="col-authors">
                    {paper.authors.map((author, index) => (
                      <span key={author.name}>
                        {index > 0 && ', '}
                        <a
                          className="author-name"
                          href={authorUrl(author.name, author.orcid)}
                          target="_blank"
                          rel="noreferrer"
                          title={author.affiliations.join(', ')}
                        >
                          {author.name}
                        </a>
                      </span>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="table-empty">No papers match your search.</p>}
      </div>

      {hover?.paper.abstract && (
        <div
          className="abstract-tip"
          role="tooltip"
          style={{
            left: Math.max(16, Math.min(hover.x + 16, window.innerWidth - TIP_WIDTH - 16)),
            top: Math.max(16, Math.min(hover.y + 16, window.innerHeight - TIP_MAX_HEIGHT - 16)),
          }}
        >
          <p className="abstract-tip-label">Abstract</p>
          <p className="abstract-tip-body">{hover.paper.abstract}</p>
        </div>
      )}
    </div>
  )
}
