/** Strips HTML tags and returns plain text. Used for list/card/title previews. */
export function stripHtml(html: string): string {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return (div.textContent || '').trim()
}
