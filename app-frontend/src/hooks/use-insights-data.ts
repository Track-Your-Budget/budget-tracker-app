import { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast'

/**
 * Load one insights answer for `key` (a month or a year), again whenever the
 * key changes. `fetcher` must be referentially stable, e.g. a module-level
 * function, or the effect re-runs on every render.
 */
export function useInsightsData<T>(key: string, fetcher: (key: string) => Promise<T>) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      try {
        const result = await fetcher(key)
        if (!cancelled) setData(result)
      } catch (error) {
        if (cancelled) return
        console.error('Failed to load insights:', error)
        toast({
          title: 'Loading failed',
          description: 'The insights could not be loaded.',
          variant: 'destructive',
        })
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [key, fetcher, toast])

  return { data, isLoading }
}
