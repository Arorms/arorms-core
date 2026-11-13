import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { storageKey } from './config.ts'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export interface ThemeValue {
  theme: Theme
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeValue | undefined>(undefined)

export const THEMES: readonly Theme[] = ['system', 'light', 'dark'] as const

const isTheme = (value: unknown): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const stored = localStorage.getItem(storageKey('theme'))
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

function applyTheme(theme: Theme): ResolvedTheme {
  const resolved: ResolvedTheme = theme === 'system' ? getSystemTheme() : theme
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    document.documentElement.style.colorScheme = resolved
  }
  return resolved
}

/**
 * Owns the `.dark` class on `<html>`. Renders nothing visual — `ThemeSwitcher` in the UI package
 * is the control.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    theme === 'system' ? getSystemTheme() : theme,
  )

  useEffect(() => {
    setResolved(applyTheme(theme))
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setResolved(applyTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(storageKey('theme'), next)
    } catch {
      /* storage unavailable */
    }
    setThemeState(next)
  }

  const value = useMemo<ThemeValue>(() => ({ theme, resolved, setTheme }), [theme, resolved])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside <ThemeProvider>')
  return value
}
