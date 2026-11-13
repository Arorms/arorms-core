export {
  configureCore,
  getConfig,
  isCoreConfigured,
  storageKey,
  eventName,
  type ArormsConfig,
  type ArormsOidcConfig,
} from './config.ts'

export {
  EXPIRING_SKEW_SECONDS,
  RETRY_COOLDOWN_MS,
  TERMINAL_ERRORS,
  getOidcConfig,
  getUserManager,
  resetUserManager,
  isTerminalAuthError,
  needsRefresh,
  refreshSession,
  type RefreshOutcome,
} from './auth.ts'

export {
  apiClient,
  setAuthToken,
  toMessage,
  unauthorizedEvent,
  tokenRefreshedEvent,
} from './apiClient.ts'

export { AuthProvider, useAuth, userName, type AuthValue } from './AuthProvider.tsx'
export { ThemeProvider, useTheme, THEMES, type Theme, type ResolvedTheme, type ThemeValue } from './ThemeProvider.tsx'
export { createQueryClient, defaultQueryClientConfig } from './queryClient.ts'

export {
  I18nProvider,
  useT,
  useLanguage,
  useOptionalLanguage,
  type I18nConfig,
  type I18nValue,
  type LanguageInfo,
} from './i18n/I18nProvider.tsx'
export { translate, type Messages, type LanguageDicts } from './i18n/translate.ts'

export {
  EMPTY_VALUE,
  formatDate,
  formatDateTime,
  formatListDate,
  formatNumber,
  formatMoney,
  formatFileSize,
  initials,
} from './format.ts'

export { useDebouncedValue } from './hooks/useDebouncedValue.ts'

export {
  usePagedQuery,
  type PageResponse,
  type PagedQueryOptions,
  type PagedQueryResult,
} from './hooks/usePagedQuery.ts'
