import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from 'oidc-client-ts'
import { getConfig } from './config.ts'
import { getUserManager, needsRefresh, refreshSession } from './auth.ts'
import { setAuthToken, tokenRefreshedEvent, unauthorizedEvent } from './apiClient.ts'

export interface AuthValue {
  /** The full OIDC user record (tokens, profile, expiry). `null` when signed out. */
  user: User | null
  /** Convenience: `user?.access_token ?? null`. */
  token: string | null
  /** False until the stored session has been read (and renewed if needed) once. */
  ready: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  handleCallback: () => Promise<User>
  /** Access token for transports axios cannot intercept (fetch/SSE), renewed on demand. */
  getAccessToken: () => Promise<string | null>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  const applyUser = useCallback((next: User | null) => {
    setUser(next)
    setAuthToken(next?.access_token ?? null)
  }, [])

  useEffect(() => {
    const manager = getUserManager()
    let cancelled = false

    // A token that expired while the tab was closed has no timer left to renew it.
    manager
      .getUser()
      .then(async (stored) => {
        if (!needsRefresh(stored) || !stored?.refresh_token) return stored
        const outcome = await refreshSession()
        if (outcome.status === 'refreshed') return outcome.user
        if (outcome.status === 'expired') return null
        return stored
      })
      .then((resolved) => {
        if (!cancelled) applyUser(resolved)
      })
      .catch(() => {
        if (!cancelled) applyUser(null)
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })

    const onRefreshed = () => {
      void manager.getUser().then(applyUser)
    }
    const onUnauthorized = () => {
      applyUser(null)
      const loginPath = getConfig().routes.login
      if (window.location.pathname !== loginPath) window.location.assign(loginPath)
    }
    window.addEventListener(tokenRefreshedEvent(), onRefreshed)
    window.addEventListener(unauthorizedEvent(), onUnauthorized)
    return () => {
      cancelled = true
      window.removeEventListener(tokenRefreshedEvent(), onRefreshed)
      window.removeEventListener(unauthorizedEvent(), onUnauthorized)
    }
  }, [applyUser])

  const login = useCallback(async () => {
    await getUserManager().signinRedirect()
  }, [])

  const logout = useCallback(async () => {
    await getUserManager().signoutRedirect().catch(() => undefined)
    applyUser(null)
  }, [applyUser])

  const handleCallback = useCallback(async () => {
    const signedIn = await getUserManager().signinRedirectCallback()
    applyUser(signedIn)
    return signedIn
  }, [applyUser])

  const getAccessToken = useCallback(async () => {
    const stored = await getUserManager().getUser()
    if (!stored) return null
    if (!needsRefresh(stored)) return stored.access_token ?? null
    const outcome = await refreshSession()
    return outcome.status === 'refreshed' ? (outcome.user.access_token ?? null) : null
  }, [])

  const value = useMemo<AuthValue>(
    () => ({ user, token: user?.access_token ?? null, ready, login, logout, handleCallback, getAccessToken }),
    [user, ready, login, logout, handleCallback, getAccessToken],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}

/** Preferred display name, in the order Keycloak usually fills the profile. */
export function userName(user: User | null): string | null {
  const profile = user?.profile as Record<string, unknown> | undefined
  const candidates = [profile?.preferred_username, profile?.name, profile?.email, profile?.sub]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) return candidate
  }
  return null
}
