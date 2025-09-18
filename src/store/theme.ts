import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'compact' | 'comfortable'

interface ThemeState {
  theme: Theme
  density: Density
  setTheme: (theme: Theme) => void
  setDensity: (density: Density) => void
  initializeTheme: () => void
  applyTheme: () => void
  applyDensity: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      density: 'comfortable',
      
      setTheme: (theme: Theme) => {
        set({ theme })
        get().applyTheme()
      },
      
      setDensity: (density: Density) => {
        set({ density })
        get().applyDensity()
      },
      
      initializeTheme: () => {
        const { applyTheme, applyDensity } = get()
        applyTheme()
        applyDensity()
      },
      
      applyTheme: () => {
        const { theme } = get()
        const root = document.documentElement
        
        // Remove existing theme classes
        root.removeAttribute('data-theme')
        
        if (theme === 'system') {
          // Let CSS handle system preference
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          if (prefersDark) {
            root.setAttribute('data-theme', 'dark')
          }
        } else {
          root.setAttribute('data-theme', theme)
        }
      },
      
      applyDensity: () => {
        const { density } = get()
        const root = document.documentElement
        
        // Remove existing density classes
        root.removeAttribute('data-density')
        
        if (density !== 'comfortable') {
          root.setAttribute('data-density', density)
        }
      }
    }),
    {
      name: 'theme-settings',
      partialize: (state) => ({
        theme: state.theme,
        density: state.density
      })
    }
  )
)

// Listen for system theme changes
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  
  mediaQuery.addEventListener('change', () => {
    const { theme } = useThemeStore.getState()
    if (theme === 'system') {
      useThemeStore.getState().applyTheme()
    }
  })
}


