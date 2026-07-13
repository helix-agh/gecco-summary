import programJson from '../data/program.json'

/** Where and when a paper is presented, resolved from program.json. */
export interface TalkSchedule {
  /** Weekday name, e.g. "Wednesday". */
  day: string
  /** ISO date, e.g. "2026-07-15". */
  date: string
  /** Session-level slot, e.g. "11:30-13:00". */
  timeSlot: string
  /** Talk-level slot, e.g. "11:30-11:50". */
  time: string
  session: string
  room: string
  bestPaperNominee: boolean
}

export interface ProgramDay {
  date: string
  /** e.g. "Wednesday, July 15" */
  label: string
  /** Session time slots on this day, in chronological order. */
  slots: string[]
}

export interface ProgramIndex {
  /** Paper title (exact papers.json title) → schedule. */
  byTitle: Map<string, TalkSchedule>
  days: ProgramDay[]
}

interface ProgramTalkJson {
  time: string
  title: string
  bestPaperNominee?: boolean
  invited?: boolean
  notInPapersJson?: boolean
}

interface ProgramSessionJson {
  session: string
  day: string
  date: string
  timeSlot: string
  room: string
  chair: string
  papers: ProgramTalkJson[]
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function dayLabel(day: string, date: string): string {
  const [, month, dom] = date.split('-')
  return `${day}, ${MONTHS[Number(month) - 1]} ${String(Number(dom))}`
}

function buildIndex(sessions: ProgramSessionJson[]): ProgramIndex {
  const byTitle = new Map<string, TalkSchedule>()
  const days = new Map<string, ProgramDay>()

  for (const session of sessions) {
    let dayEntry = days.get(session.date)
    if (!dayEntry) {
      dayEntry = { date: session.date, label: dayLabel(session.day, session.date), slots: [] }
      days.set(session.date, dayEntry)
    }
    if (!dayEntry.slots.includes(session.timeSlot)) dayEntry.slots.push(session.timeSlot)

    for (const talk of session.papers) {
      byTitle.set(talk.title, {
        day: session.day,
        date: session.date,
        timeSlot: session.timeSlot,
        time: talk.time,
        session: session.session,
        room: session.room,
        bestPaperNominee: talk.bestPaperNominee ?? false,
      })
    }
  }

  const sorted = [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
  for (const day of sorted) day.slots.sort()
  return { byTitle, days: sorted }
}

/** GECCO 2026 presentation schedule; other editions have no program data. */
export const program2026: ProgramIndex = buildIndex(
  (programJson as { sessions: ProgramSessionJson[] }).sessions,
)
