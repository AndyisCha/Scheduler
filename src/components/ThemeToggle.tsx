import { useThemeStore } from '../store/theme'

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ThemeToggle({ 
  variant = 'button', 
  showLabel = false, 
  size = 'md' 
}: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore()

  const getThemeIcon = (currentTheme: string) => {
    switch (currentTheme) {
      case 'light':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'dark':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'system':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  const getThemeLabel = (currentTheme: string) => {
    switch (currentTheme) {
      case 'light':
        return '라이트'
      case 'dark':
        return '다크'
      case 'system':
      default:
        return '시스템'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-1 text-xs'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1.5 text-sm'
    }
  }

  const cycleTheme = () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system']
    const currentIndex = themes.indexOf(theme)
    const nextIndex = (currentIndex + 1) % themes.length
    setTheme(themes[nextIndex])
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block">
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className={`select-theme rounded-md ${getSizeClasses()} pr-8`}
        >
          <option value="light">☀️ 라이트</option>
          <option value="dark">🌙 다크</option>
          <option value="system">💻 시스템</option>
        </select>
      </div>
    )
  }

  return (
    <button
      onClick={cycleTheme}
      className={`btn-secondary rounded-md ${getSizeClasses()} flex items-center space-x-2 transition-theme`}
      title={`테마: ${getThemeLabel(theme)} (클릭하여 변경)`}
      aria-label={`테마 변경 (현재: ${getThemeLabel(theme)})`}
    >
      {getThemeIcon(theme)}
      {showLabel && (
        <span className="hidden sm:inline">
          {getThemeLabel(theme)}
        </span>
      )}
    </button>
  )
}


