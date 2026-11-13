import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storageKey } from '../config.ts'
import { translate, type LanguageDicts, type Messages } from './translate.ts'

export interface LanguageInfo {
  /** Label shown in `LanguageSwitcher`. */
  label: string
  /** BCP 47 locale, used for `toLocaleString` and friends. */
  locale: string
}

export interface I18nConfig<TLanguage extends string> {
  messages: LanguageDicts<TLanguage>
  /** Presentation metadata per language. Key order drives switcher order. */
  languages: Record<TLanguage, LanguageInfo>
  defaultLanguage?: TLanguage
  /** `true` (default) picks the browser language on first visit. */
  detectBrowserLanguage?: boolean
}

export interface I18nValue<TLanguage extends string> {
  language: TLanguage
  setLanguage: (language: TLanguage) => void
  /** `a.b.c` with `{{name}}` interpolation; missing keys echo back the key. */
  t: (key: string, params?: Record<string, string | number>) => string
  locale: string
  languages: Record<TLanguage, LanguageInfo>
  messages: LanguageDicts<TLanguage>
}

type AnyI18nValue = I18nValue<string>

const I18nContext = createContext<AnyI18nValue | null>(null)

/** Widens `I18nValue<T>` to the erased context type. Only used internally by the provider. */
function erase<TLanguage extends string>(value: I18nValue<TLanguage>): AnyI18nValue {
  return {
    ...value,
    setLanguage: value.setLanguage as (language: string) => void,
    languages: value.languages as Record<string, LanguageInfo>,
    messages: value.messages as LanguageDicts<string>,
  }
}

function detect<TLanguage extends string>(
  languages: Record<TLanguage, LanguageInfo>,
  fallback: TLanguage,
): TLanguage {
  if (typeof navigator === 'undefined') return fallback
  const browser = (navigator.language || '').toLowerCase()
  for (const language of Object.keys(languages) as TLanguage[]) {
    const info = languages[language]
    const code = info.locale.split('-')[0]
    if (browser.startsWith(code.toLowerCase())) return language
  }
  return fallback
}

/**
 * Language selection plus a `t()` function. Dictionary content always belongs to the consuming
 * project — the package only carries the mechanism.
 */
export function I18nProvider<TLanguage extends string>({
  config,
  children,
}: {
  config: I18nConfig<TLanguage>
  children: ReactNode
}) {
  const languages = config.languages
  const defaultLanguage =
    config.defaultLanguage ?? (Object.keys(languages)[0] as TLanguage)
  const detectBrowser = config.detectBrowserLanguage ?? true

  const [language, setLanguageState] = useState<TLanguage>(() => {
    if (typeof window === 'undefined') return defaultLanguage
    try {
      const stored = localStorage.getItem(storageKey('language'))
      if (stored && stored in languages) return stored as TLanguage
    } catch {
      /* storage unavailable */
    }
    return detectBrowser ? detect(languages, defaultLanguage) : defaultLanguage
  })

  useEffect(() => {
    try {
      localStorage.setItem(storageKey('language'), language)
    } catch {
      /* storage unavailable */
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = languages[language].locale
    }
  }, [language, languages])

  const setLanguage = useCallback((next: TLanguage) => setLanguageState(next), [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(config.messages[language] as Messages | undefined, key, params),
    [config.messages, language],
  )

  const value = useMemo<I18nValue<TLanguage>>(
    () => ({
      language,
      setLanguage,
      t,
      locale: languages[language].locale,
      languages,
      messages: config.messages,
    }),
    [language, setLanguage, t, languages, config.messages],
  )

  return <I18nContext.Provider value={erase(value)}>{children}</I18nContext.Provider>
}

/**
 * Returns the translation function. Outside a provider it degrades to echoing keys, which keeps
 * the UI package usable in projects that have not enabled i18n.
 */
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const value = useContext(I18nContext)
  return value?.t ?? ((key: string) => key)
}

export function useLanguage(): AnyI18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useLanguage must be used inside <I18nProvider>')
  return value
}

/** Safe variant for components that must work without i18n; `null` when no provider is mounted. */
export function useOptionalLanguage(): AnyI18nValue | null {
  return useContext(I18nContext)
}
