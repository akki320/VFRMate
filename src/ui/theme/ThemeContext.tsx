import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type Theme = 'night' | 'day'

const STORAGE_KEY = 'vfrmate.theme'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'day' ? 'day' : 'night'
  } catch {
    // localStorage kann in privaten/eingeschränkten Kontexten fehlschlagen —
    // Nacht (Standard) ist dann ein sicherer Fallback.
    return 'night'
  }
}

/** Steuert Nacht-/Tagmodus der ganzen App. Nacht ist Standard (Dämmerung,
 * Cockpit); Tag ist ein separater, sehr kontrastreicher Modus für direktes
 * Sonnenlicht — keine bloße Farbumkehr. Persistiert lokal je Gerät. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // Persistenz ist ein Komfort, kein Muss — Fehler hier sind unkritisch.
    }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'night' ? 'day' : 'night'))
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme muss innerhalb von ThemeProvider verwendet werden')
  return context
}
