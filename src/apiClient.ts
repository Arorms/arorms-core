import axios, { type InternalAxiosRequestConfig } from 'axios'
import { getConfig, eventName } from './config.ts'
import { getUserManager, needsRefresh, refreshSession, type RefreshOutcome } from './auth.ts'

export const apiClient = axios.create()

/** Seeded from config lazily so `configureCore` order does not matter. */
apiClient.interceptors.request.use((config) => {
  config.baseURL ??= getConfig().api.baseUrl
  return config
})

// Headers are not the source of truth (a renewal makes them stale); this is a convenience mirror
// for code that reads `apiClient.defaults`.
export function setAuthToken(token: string | null): void {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`
  } else {
    delete apiClient.defaults.headers.common.Authorization
  }
}

/** Fired when the session is gone and the user has to sign in again. */
export function unauthorizedEvent(): string {
  return eventName('unauthorized')
}

/** Fired when a renewal produced a fresh access token. */
export function tokenRefreshedEvent(): string {
  return eventName('token-refreshed')
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

function applyToken(config: InternalAxiosRequestConfig, token: string | null): void {
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  } else {
    config.headers.delete('Authorization')
  }
}

/** Renew, then publish the result. Only a dead refresh token ends the session. */
async function renewOrExpire(): Promise<string | null> {
  const outcome: RefreshOutcome = await refreshSession()
  if (outcome.status === 'refreshed') {
    const token = outcome.user.access_token ?? null
    if (token) setAuthToken(token)
    window.dispatchEvent(new CustomEvent(tokenRefreshedEvent()))
    return token
  }
  if (outcome.status === 'expired') window.dispatchEvent(new CustomEvent(unauthorizedEvent()))
  return null
}

apiClient.interceptors.request.use(async (config) => {
  // The token cached on the axios instance goes stale as soon as a renewal happens, so storage wins.
  const user = await getUserManager().getUser()
  if (!user) {
    applyToken(config, null)
    return config
  }
  if (needsRefresh(user)) {
    const token = await renewOrExpire()
    applyToken(config, token ?? user.access_token ?? null)
    return config
  }
  applyToken(config, user.access_token ?? null)
  return config
})

apiClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err?.config as RetriableConfig | undefined
    if (err?.response?.status !== 401 || !config) return Promise.reject(err)
    if (config._retried) {
      // Renewed once and still rejected: the backend no longer accepts this identity.
      window.dispatchEvent(new CustomEvent(unauthorizedEvent()))
      return Promise.reject(err)
    }
    config._retried = true
    const token = await renewOrExpire()
    if (!token) return Promise.reject(err)
    applyToken(config, token)
    return apiClient(config)
  },
)

/** Normalize anything thrown by axios/fetch into something safe to show in the UI. */
export function toMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (typeof data === 'string' && data.length > 0) return data
  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown; detail?: unknown; error?: unknown })
    for (const candidate of [message.message, message.detail, message.error]) {
      if (typeof candidate === 'string' && candidate.length > 0) return candidate
    }
  }
  if (err instanceof Error) return err.message
  if (typeof err === 'string' && err.length > 0) return err
  return 'Request failed'
}
