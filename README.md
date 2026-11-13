# @arorms/core

arorms frontend runtime: OIDC login/silent renewal/401 replay, theme state, i18n mechanism,
query client, paging hook. **Zero visual output** — no JSX styling, no business types, and no
`import.meta.env`.

Pairs with [`@arorms/ui`](https://www.npmjs.com/package/@arorms/ui) (the design system).
Dependency direction is one-way: `@arorms/ui` → `@arorms/core`.

## Install

```bash
pnpm add @arorms/core
```

Peer dependencies: `react` and `react-dom` 19.

The package ships **TypeScript source** (`exports` points at `src`, no build step). Your
bundler/TS must be able to compile `.ts`/`.tsx` directly — Vite 8 is tested; webpack/Next.js may
fail on `.ts`-extension imports and `allowImportingTsExtensions`.

## Configure once

```tsx
import { configureCore, AuthProvider, I18nProvider, ThemeProvider, createQueryClient } from '@arorms/core'

configureCore({
  namespace: 'my-app',                                  // prefixes localStorage keys + window events
  oidc: { authority, clientId, redirectUri },
  api: { baseUrl: '/api' },
})
```

`namespace` is what keeps two apps on the same origin from sharing tokens/theme, so it must be
unique per project. Everything that used to be a hard-coded constant lives in this call.

Renewal is on-demand, not on a timer: the API client refreshes 60s before expiry, de-duplicates
concurrent refreshes (realms revoke refresh tokens), replays a request once on 401, and broadcasts
`<namespace>:unauthorized` only when the refresh token is actually dead.

## What is in here

| Area | Exports |
| --- | --- |
| Config | `configureCore`, `getConfig`, `isCoreConfigured`, `storageKey`, `eventName` |
| Auth | `AuthProvider`, `useAuth`, `userName`, `getUserManager`, `refreshSession`, … |
| API | `apiClient`, `setAuthToken`, `toMessage`, `unauthorizedEvent` |
| Theme | `ThemeProvider`, `useTheme` (only toggles `.dark`) |
| i18n | `I18nProvider`, `useT`, translatable dictionaries (mechanism only, no strings) |
| Data | `createQueryClient`, `usePagedQuery`, `useDebouncedValue` |
| Format | `formatDate`, `formatDateTime`, `formatNumber`, `formatMoney`, `formatFileSize`, `initials` |

## Rules

- Configuration enters through `configureCore()`; no `import.meta.env` in this package.
- No hard-coded client ids, authorities, storage keys or event names — all derived from `namespace`.
- No business code and no translation dictionaries.

```bash
pnpm typecheck
pnpm test               # node:test, strip-types
pnpm check:hardcoded
```

Release process: `docs/releasing.md`.
