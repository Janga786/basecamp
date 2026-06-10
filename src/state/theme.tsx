import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'dark' | 'light'
const KEY = 'basecamp.theme'

interface ThemeCtx {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}
const Ctx = createContext<ThemeCtx | null>(null)

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f14' : '#f1f5f9')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(KEY) as Theme) || 'dark')

  useEffect(() => {
    apply(theme)
    localStorage.setItem(KEY, theme)
  }, [theme])

  return (
    <Ctx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), set: setTheme }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTheme() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTheme outside provider')
  return c
}
