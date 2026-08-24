import { useLocation } from 'react-router-dom'

const ROUTE_TITLES: [RegExp | string, string][] = [
  ['/questions/new', 'New Question'],
  [/^\/questions\/[^/]+\/edit$/, 'Edit Question'],
  [/^\/questions\/[^/]+$/, 'Question Details'],
  ['/questions', 'Questions'],
  ['/categories', 'Categories'],
  ['/', 'Dashboard'],
]

function getPageTitle(pathname: string): string {
  for (const [pattern, title] of ROUTE_TITLES) {
    if (
      typeof pattern === 'string'
        ? pathname === pattern
        : pattern.test(pathname)
    ) {
      return title
    }
  }
  return ''
}

export function TopBar() {
  const { pathname } = useLocation()

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-border bg-background px-6">
      <h1 className="text-sm font-semibold text-foreground">
        {getPageTitle(pathname)}
      </h1>
    </header>
  )
}
