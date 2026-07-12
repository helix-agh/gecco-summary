/** Google Scholar author search for a name; its first hit is the author's profile. */
export function scholarUrl(name: string): string {
  return `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(name)}`
}
