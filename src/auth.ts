import {
  ErrorResponse,
  UserManager,
  WebStorageStateStore,
  type User,
  type UserManagerSettings,
} from 'oidc-client-ts'
import { getConfig, storageKey } from './config.ts'

/** Renew this many seconds before the access token actually expires. */
export const EXPIRING_SKEW_SECONDS = 60

/** Do not hammer the token endpoint while it is unreachable. */
export const RETRY_COOLDOWN_MS = 5_000

/** Refresh-token failures that mean the session is gone and cannot be recovered. */
export const TERMINAL_ERRORS: ReadonlySet<string> = new Set([
  'invalid_grant',
  'invalid_client',
  'unauthorized_client',
  'login_required',
  'interaction_required',
  'consent_required',
])

export function getOidcConfig(): UserManagerSettings {
  const { oidc } = getConfig()
  return {
    authority: oidc.authority,
    client_id: oidc.clientId,
    redirect_uri: oidc.redirectUri,
    post_logout_redirect_uri: oidc.postLogoutRedirectUri,
    response_type: 'code',
    scope: oidc.scope,
    // Renewal is driven on demand by the api client, not by a polling timer.
    automaticSilentRenew: false,
    // Persist the session so a browser restart can reuse the Keycloak SSO cookie.
    userStore: new WebStorageStateStore({
      store: window.localStorage,
      prefix: storageKey('oidc.'),
    }),
  }
}

let manager: UserManager | null = null

export function getUserManager(): UserManager {
  if (!manager) manager = new UserManager(getOidcConfig())
  return manager
}

/** Test seam: forget the cached manager (used when re-configuring in dev/tests). */
export function resetUserManager(): void {
  manager = null
  pending = null
  blockedUntil = 0
}

export function isTerminalAuthError(err: unknown): boolean {
  return err instanceof ErrorResponse && err.error != null && TERMINAL_ERRORS.has(err.error)
}

/** True when the access token is expired or about to expire. */
export function needsRefresh(user: User | null): boolean {
  if (!user || user.expires_at === undefined) return false
  return user.expires_at - Date.now() / 1000 < EXPIRING_SKEW_SECONDS
}

export type RefreshOutcome =
  /** A fresh access token is stored and ready to use. */
  | { status: 'refreshed'; user: User }
  /** The refresh token is gone; the stored session has been dropped. */
  | { status: 'expired' }
  /** Renewal could not be attempted right now (offline, timeout, 5xx). The session is kept. */
  | { status: 'unavailable' }

let pending: Promise<RefreshOutcome> | null = null
let blockedUntil = 0

/**
 * Exchange the refresh token for a fresh access token.
 *
 * Concurrent callers share one request: with "Revoke Refresh Token" enabled on the realm, the first
 * successful call invalidates the old refresh token, so parallel refreshes would cancel each other
 * out.
 */
export function refreshSession(): Promise<RefreshOutcome> {
  if (Date.now() < blockedUntil) return Promise.resolve({ status: 'unavailable' })
  pending ??= getUserManager()
    .getUser()
    .then(async (user): Promise<RefreshOutcome> => {
      if (!user?.refresh_token) {
        await getUserManager().removeUser()
        return { status: 'expired' }
      }
      try {
        const refreshed = await getUserManager().signinSilent()
        if (!refreshed) {
          blockedUntil = Date.now() + RETRY_COOLDOWN_MS
          return { status: 'unavailable' }
        }
        return { status: 'refreshed', user: refreshed }
      } catch (err) {
        if (isTerminalAuthError(err)) {
          await getUserManager().removeUser()
          return { status: 'expired' }
        }
        blockedUntil = Date.now() + RETRY_COOLDOWN_MS
        return { status: 'unavailable' }
      }
    })
    .catch((): RefreshOutcome => ({ status: 'unavailable' }))
    .finally(() => {
      pending = null
    })
  return pending
}
