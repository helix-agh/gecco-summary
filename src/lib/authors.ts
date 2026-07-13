import type { Author, Paper } from '../types'

const TRANSLITERATIONS: Record<string, string> = {
  ł: 'l',
  đ: 'dj',
  ø: 'o',
  ß: 'ss',
  æ: 'ae',
  þ: 'th',
  ä: 'ae',
  ö: 'oe',
  ü: 'ue',
}

function normalizeName(name: string): string {
  const transliterated = Array.from(name.toLocaleLowerCase('en'))
    .map((character) => TRANSLITERATIONS[character] ?? character)
    .join('')
  return transliterated
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[\p{Dash_Punctuation}.]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Matches the scraper's fallback identity key while absorbing name-order changes. */
export function authorNameKey(name: string): string {
  const tokens = normalizeName(name).split(' ').filter(Boolean)
  if (tokens.length === 0) return ''
  return [tokens[0], tokens[tokens.length - 1]].sort().join('\u0000')
}

export interface CanonicalAuthor {
  key: string
  name: string
  orcid: string | null
}

export interface AuthorIndex {
  authors: CanonicalAuthor[]
  byAuthor: WeakMap<Author, CanonicalAuthor>
}

function canonicalName(names: string[]): string {
  const counts = new Map<string, number>()
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1)
  return [...counts].sort((a, b) => {
    const countOrder = b[1] - a[1]
    if (countOrder !== 0) return countOrder

    const aAllCaps = a[0] === a[0].toLocaleUpperCase('en') ? 1 : 0
    const bAllCaps = b[0] === b[0].toLocaleUpperCase('en') ? 1 : 0
    if (aAllCaps !== bAllCaps) return aAllCaps - bAllCaps

    const aNonAscii = Array.from(a[0]).filter(
      (character) => (character.codePointAt(0) ?? 0) > 127,
    ).length
    const bNonAscii = Array.from(b[0]).filter(
      (character) => (character.codePointAt(0) ?? 0) > 127,
    ).length
    return bNonAscii - aNonAscii || b[0].length - a[0].length || a[0].localeCompare(b[0])
  })[0][0]
}

/** Resolve author occurrences into stable identities for one conference edition. */
export function buildAuthorIndex(papers: Paper[]): AuthorIndex {
  const members = new Map<string, Author[]>()
  for (const author of papers.flatMap((paper) => paper.authors)) {
    const key = author.orcid ? `orcid:${author.orcid}` : `name:${authorNameKey(author.name)}`
    const group = members.get(key) ?? []
    group.push(author)
    members.set(key, group)
  }

  const byAuthor = new WeakMap<Author, CanonicalAuthor>()
  const authors = [...members.entries()].map(([key, group]) => {
    const orcid = group[0].orcid
    const author = {
      key,
      name: canonicalName(group.map((member) => member.name)),
      orcid,
    }
    for (const member of group) byAuthor.set(member, author)
    return author
  })

  return { authors, byAuthor }
}

export function canonicalAuthorProfiles(papers: Paper[]): Map<string, string | null> {
  const index = buildAuthorIndex(papers)
  return new Map(index.authors.map((author) => [author.name, author.orcid]))
}
