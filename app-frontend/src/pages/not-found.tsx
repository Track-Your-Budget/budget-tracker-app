import { Link } from 'react-router-dom'
import { ArrowLeft, SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
        <SearchX className="h-6 w-6 text-primary" />
      </div>
      <p className="text-sm font-semibold text-primary">404</p>
      <h2 className="text-2xl font-semibold tracking-tight">Page not found</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        The requested address does not exist or has moved.
      </p>
      <Button asChild>
        <Link to="/">
          <ArrowLeft /> Back to dashboard
        </Link>
      </Button>
    </div>
  )
}
