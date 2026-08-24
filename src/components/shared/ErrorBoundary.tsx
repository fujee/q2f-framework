import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ErrorBoundary() {
  const error = useRouteError()

  const title = isRouteErrorResponse(error)
    ? error.status === 404
      ? 'Page not found'
      : `Error ${error.status}`
    : 'Something went wrong'

  const message = isRouteErrorResponse(error)
    ? error.status === 404
      ? 'The page you were looking for does not exist.'
      : error.statusText
    : error instanceof Error
      ? error.message
      : 'An unexpected error occurred.'

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="size-8 text-destructive" />
      </div>
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      </div>
      <Button asChild>
        <Link to="/">Return to dashboard</Link>
      </Button>
    </div>
  )
}
