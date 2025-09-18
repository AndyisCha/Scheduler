import { useI18nStore } from '../store/i18n'

interface LanguageToggleProps {
  variant?: 'button' | 'dropdown'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function LanguageToggle({ 
  variant = 'button', 
  showLabel = false, 
  size = 'md' 
}: LanguageToggleProps) {
  const { language, setLanguage, t } = useI18nStore()

  const getLanguageIcon = (currentLanguage: string) => {
    switch (currentLanguage) {
      case 'ko':
        return '🇰🇷'
      case 'en':
        return '🇺🇸'
      default:
        return '🌐'
    }
  }

  const getLanguageLabel = (currentLanguage: string) => {
    switch (currentLanguage) {
      case 'ko':
        return t('language.korean')
      case 'en':
        return t('language.english')
      default:
        return currentLanguage
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

  const cycleLanguage = () => {
    const languages: Array<'ko' | 'en'> = ['ko', 'en']
    const currentIndex = languages.indexOf(language)
    const nextIndex = (currentIndex + 1) % languages.length
    setLanguage(languages[nextIndex])
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'ko' | 'en')}
          className={`select-theme rounded-md ${getSizeClasses()} pr-8`}
        >
          <option value="ko">🇰🇷 한국어</option>
          <option value="en">🇺🇸 English</option>
        </select>
      </div>
    )
  }

  return (
    <button
      onClick={cycleLanguage}
      className={`btn-secondary rounded-md ${getSizeClasses()} flex items-center space-x-2 transition-theme`}
      title={`언어: ${getLanguageLabel(language)} (클릭하여 변경)`}
      aria-label={`언어 변경 (현재: ${getLanguageLabel(language)})`}
    >
      <span className="text-lg">{getLanguageIcon(language)}</span>
      {showLabel && (
        <span className="hidden sm:inline">
          {getLanguageLabel(language)}
        </span>
      )}
    </button>
  )
}


