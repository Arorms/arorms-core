import { useCallback, useEffect, useRef, useState } from 'react'

/** Spring-Data style page envelope; all three backends return one of these two shapes. */
export interface PageResponse<T> {
  content?: T[]
  items?: T[]
  total?: number
  totalElements?: number
  last?: boolean
  totalPages?: number
  size?: number
  number?: number
}

export interface PagedQueryOptions<T, TParams> {
  /** Fetches one page. Must return the raw backend envelope. */
  fetchPage: (params: TParams & { page: number; size: number }) => Promise<PageResponse<T>>
  /** Extra query params; changing them resets the page to 0. */
  params?: TParams
  pageSize?: number
  enabled?: boolean
}

export interface PagedQueryResult<T> {
  items: T[]
  page: number
  size: number
  total: number
  isLast: boolean
  loading: boolean
  error: Error | null
  setPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  reload: () => void
}

interface Snapshot<T> {
  items: T[]
  total: number
  isLast: boolean
  page: number
}

/**
 * The `page / size / total / isLast / loading / error` bookkeeping that every list page in the
 * existing projects re-implements by hand.
 */
export function usePagedQuery<T, TParams extends object = Record<string, never>>({
  fetchPage,
  params,
  pageSize = 20,
  enabled = true,
}: PagedQueryOptions<T, TParams>): PagedQueryResult<T> {
  const [page, setPageState] = useState(0)
  const [reloadToken, setReloadToken] = useState(0)
  const [snapshot, setSnapshot] = useState<Snapshot<T>>({
    items: [],
    total: 0,
    isLast: true,
    page: 0,
  })
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)

  // Serializing params keeps the effect dependency stable for inline object literals.
  const paramsKey = JSON.stringify(params ?? {})
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  const paramsRef = useRef(params)
  paramsRef.current = params

  // Changing filters should not strand the user on page 7 of a 2-page result. The reset happens
  // inside the fetch effect and skips that run, so we never fire a request with the stale page.
  const lastParamsKey = useRef(paramsKey)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    if (lastParamsKey.current !== paramsKey) {
      lastParamsKey.current = paramsKey
      if (page !== 0) {
        setPageState(0)
        return
      }
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetchRef
      .current({ ...(paramsRef.current ?? ({} as TParams)), page, size: pageSize })
      .then((result) => {
        if (cancelled) return
        setSnapshot({
          items: result.content ?? result.items ?? [],
          total: result.total ?? result.totalElements ?? 0,
          isLast: result.last ?? true,
          page,
        })
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [page, pageSize, paramsKey, enabled, reloadToken])

  const setPage = useCallback((next: number) => setPageState(Math.max(0, next)), [])
  const nextPage = useCallback(() => {
    setPageState((current) => (snapshot.isLast ? current : current + 1))
  }, [snapshot.isLast])
  const previousPage = useCallback(() => setPageState((current) => Math.max(0, current - 1)), [])
  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return {
    items: snapshot.items,
    page: snapshot.page,
    size: pageSize,
    total: snapshot.total,
    isLast: snapshot.isLast,
    loading,
    error,
    setPage,
    nextPage,
    previousPage,
    reload,
  }
}
