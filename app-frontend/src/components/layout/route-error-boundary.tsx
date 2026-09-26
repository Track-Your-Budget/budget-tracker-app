import type { ReactNode } from 'react'
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary'
import { useLocation } from 'react-router-dom'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

function RouteErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
        <TriangleAlert className="h-6 w-6 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Da ist etwas schiefgelaufen</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Die Seite konnte nicht angezeigt werden. Versuchen Sie es erneut oder laden Sie die Seite
        neu.
      </p>
      {import.meta.env.DEV && (
        <pre className="max-w-full overflow-auto rounded bg-muted px-3 py-2 text-left text-xs">
          {message}
        </pre>
      )}
      <div className="flex gap-2">
        <Button onClick={resetErrorBoundary}>Erneut versuchen</Button>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Seite neu laden
        </Button>
      </div>
    </div>
  )
}

/**
 * Catches render errors of the current page so a crash shows a message and
 * a retry button instead of a blank screen. Navigating to another route
 * resets the boundary automatically.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return (
    <ErrorBoundary
      FallbackComponent={RouteErrorFallback}
      resetKeys={[pathname]}
      onError={(error) => console.error('Unhandled render error:', error)}
    >
      {children}
    </ErrorBoundary>
  )
}
