import { create } from 'zustand'

type Theme = 'dark' | 'light' | 'system'

interface AppearanceState {
  theme: Theme
  resolved: 'dark' | 'light'
  accentColor: string
  fontSize: string
  setTheme: (theme: Theme) => void
  setAccentColor: (color: string) => void
  setFontSize: (size: string) => void
  init: () => Promise<void>
}

function resolveTheme(theme: Theme): 'dark' | 'light' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(resolved: 'dark' | 'light'): void {
  const root = document.documentElement
  if (resolved === 'light') {
    root.classList.remove('dark')
    root.classList.add('light')
    root.style.setProperty('--bg-base', '#FFFFFF')
    root.style.setProperty('--bg-elevated', '#F9FAFB')
    root.style.setProperty('--bg-overlay', '#F3F4F6')
    root.style.setProperty('--border-subtle', '#E5E7EB')
    root.style.setProperty('--text-primary', '#111827')
    root.style.setProperty('--text-secondary', '#6B7280')
    root.style.setProperty('--text-tertiary', '#9CA3AF')
    root.style.setProperty('--accent-primary', '#D97706')
    root.style.setProperty('--accent-glow', '#F59E0B')
    root.style.setProperty('--accent-secondary', '#0D9488')
    root.style.setProperty('--danger', '#EF4444')
  } else {
    root.classList.remove('light')
    root.classList.add('dark')
    root.style.removeProperty('--bg-base')
    root.style.removeProperty('--bg-elevated')
    root.style.removeProperty('--bg-overlay')
    root.style.removeProperty('--border-subtle')
    root.style.removeProperty('--text-primary')
    root.style.removeProperty('--text-secondary')
    root.style.removeProperty('--text-tertiary')
    root.style.removeProperty('--accent-primary')
    root.style.removeProperty('--accent-glow')
    root.style.removeProperty('--accent-secondary')
    root.style.removeProperty('--danger')
  }
}

const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  theme: 'system',
  resolved: 'dark',
  accentColor: 'amber',
  fontSize: 'md',

  setTheme: (theme: Theme) => {
    const resolved = resolveTheme(theme)
    applyTheme(resolved)
    set({ theme, resolved })
    window.openclawAPI.settings.set('appearance', {
      ...((window as unknown as { __appearance?: Record<string, unknown> }).__appearance ?? {}),
      theme,
      accentColor: get().accentColor,
      fontSize: get().fontSize
    })
  },

  setAccentColor: (color: string) => {
    set({ accentColor: color })
    window.openclawAPI.settings.set('appearance', {
      theme: get().theme,
      accentColor: color,
      fontSize: get().fontSize
    })
  },

  setFontSize: (size: string) => {
    set({ fontSize: size })
    const root = document.documentElement
    const sizes: Record<string, string> = { sm: '14px', md: '16px', lg: '18px' }
    root.style.fontSize = sizes[size] ?? '16px'
    window.openclawAPI.settings.set('appearance', {
      theme: get().theme,
      accentColor: get().accentColor,
      fontSize: size
    })
  },

  init: async () => {
    try {
      const settings = await window.openclawAPI.settings.getAll()
      const appearance = settings.appearance as { theme?: Theme; accentColor?: string; fontSize?: string } | undefined
      const theme = appearance?.theme ?? 'system'
      const resolved = resolveTheme(theme)
      applyTheme(resolved)
      set({
        theme,
        resolved,
        accentColor: appearance?.accentColor ?? 'amber',
        fontSize: appearance?.fontSize ?? 'md'
      })

      const handler = (): void => {
        const state = get()
        if (state.theme === 'system') {
          const newResolved = resolveTheme('system')
          applyTheme(newResolved)
          set({ resolved: newResolved })
        }
      }
      mediaQuery.addEventListener('change', handler)
    } catch {
      // use defaults
    }
  }
}))
