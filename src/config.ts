/**
 * The single source of truth for everything that used to be hard-coded in each project:
 * OIDC endpoints, API base URL, storage keys and window event names.
 *
 * This package never reads build-time env vars and never invents a client id. The consuming
 * project calls `configureCore()` once, in `main.tsx`, before rendering.
 */

export interface ArormsOidcConfig {
  /** Realm authority, e.g. `https://auth.arorms.cn/realms/arorms`. */
  authority: string
  clientId: string
  /** Defaults to `${window.location.origin}/callback`. */
  redirectUri?: string
  /** Defaults to `openid profile email`. */
  scope?: string
  /** Defaults to `window.location.origin`. */
  postLogoutRedirectUri?: string
}

export interface ArormsConfig {
  oidc: ArormsOidcConfig
  api?: {
    /** Defaults to `/api`. */
    baseUrl?: string
  }
  routes?: {
    /** Where the auth provider sends the browser when the session dies. Defaults to `/login`. */
    login?: string
  }
  /**
   * Prefix for localStorage keys and window events, so several systems on one origin do not
   * overwrite each other. Example: `prp`, `email`, `blog-admin`.
   */
  namespace: string
}

interface NormalizedConfig {
  oidc: Required<ArormsOidcConfig>
  api: { baseUrl: string }
  routes: { login: string }
  namespace: string
}

let current: NormalizedConfig | null = null

export function configureCore(config: ArormsConfig): void {
  if (!config?.namespace?.trim()) {
    throw new Error('[arorms/core] configureCore: `namespace` is required and must be non-empty')
  }
  if (!config.oidc?.authority || !config.oidc?.clientId) {
    throw new Error('[arorms/core] configureCore: `oidc.authority` and `oidc.clientId` are required')
  }
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  current = {
    namespace: config.namespace.trim(),
    oidc: {
      authority: config.oidc.authority,
      clientId: config.oidc.clientId,
      redirectUri: config.oidc.redirectUri ?? `${origin}/callback`,
      scope: config.oidc.scope ?? 'openid profile email',
      postLogoutRedirectUri: config.oidc.postLogoutRedirectUri ?? origin,
    },
    api: { baseUrl: config.api?.baseUrl ?? '/api' },
    routes: { login: config.routes?.login ?? '/login' },
  }
}

export function isCoreConfigured(): boolean {
  return current !== null
}

export function getConfig(): NormalizedConfig {
  if (!current) {
    throw new Error(
      '[arorms/core] Not configured. Call `configureCore({ oidc, api, namespace })` in main.tsx before rendering.',
    )
  }
  return current
}

/** localStorage key inside the current namespace: `storageKey('theme')` → `<ns>:theme`. */
export function storageKey(suffix: string): string {
  return `${getConfig().namespace}:${suffix}`
}

/** window event name inside the current namespace: `eventName('unauthorized')` → `<ns>:unauthorized`. */
export function eventName(suffix: string): string {
  return `${getConfig().namespace}:${suffix}`
}
