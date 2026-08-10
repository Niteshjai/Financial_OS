import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeStore {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  toggle: () => void
  initTheme: () => void
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark' : 'light'
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return getSystemTheme()
  return mode
}

function applyTheme(theme: 'light' | 'dark'): void {
  const root = document.documentElement

  // Enable smooth transition
  root.classList.add('theme-transition')

  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  root.setAttribute('data-theme', theme)

  // Remove transition class after animation completes
  setTimeout(() => root.classList.remove('theme-transition'), 350)

  // Update meta theme-color for browser chrome
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.setAttribute(
      'content',
      theme === 'dark' ? '#0F1117' : '#F1EFE8'
    )
  }
}

export const useTheme = create<ThemeStore>()(
  persist(
    (set, get) => ({
      mode: 'system',
      resolved: (typeof window !== 'undefined'
        ? (window as any).__INITIAL_THEME__ ?? 'light'
        : 'light') as 'light' | 'dark',

      setMode: (mode: ThemeMode) => {
        const resolved = resolveTheme(mode)
        applyTheme(resolved)
        set({ mode, resolved })
      },

      toggle: () => {
        const { resolved } = get()
        const next = resolved === 'dark' ? 'light' : 'dark'
        get().setMode(next)
      },

      initTheme: () => {
        const { mode } = get()
        const resolved = resolveTheme(mode)
        applyTheme(resolved)
        set({ resolved })

        // Listen for system theme changes
        if (typeof window !== 'undefined') {
          const mq = window.matchMedia('(prefers-color-scheme: dark)')
          const handler = (e: MediaQueryListEvent) => {
            const { mode } = get()
            if (mode === 'system') {
              const resolved = e.matches ? 'dark' : 'light'
              applyTheme(resolved)
              set({ resolved })
            }
          }
          mq.addEventListener('change', handler)
        }
      }
    }),
    {
      name: 'assetmap-theme',
      partialize: (state) => ({ mode: state.mode })
    }
  )
)
