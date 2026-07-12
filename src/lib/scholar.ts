/** Google Scholar author search for a name; its first hit is the author's profile. */
export function scholarUrl(name: string): string {
  return `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(name)}`
}

/** Canonical profile link for an author: their ORCID record when we resolved
 *  one (an exact, disambiguated match), otherwise a Google Scholar name search. */
export function authorUrl(name: string, orcid: string | null | undefined): string {
  return orcid ? `https://orcid.org/${orcid}` : scholarUrl(name)
}
