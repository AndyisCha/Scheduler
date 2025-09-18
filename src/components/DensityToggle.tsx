import { useThemeStore } from '../store/theme'

interface DensityToggleProps {
  variant?: 'button' | 'dropdown'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function DensityToggle({ 
  variant = 'button', 
  showLabel = false, 
  size = 'md' 
}: DensityToggleProps) {
  const { density, setDensity } = useThemeStore()

  const getDensityIcon = (currentDensity: string) => {
    switch (currentDensity) {
      case 'compact':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        )
      case 'comfortable':
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 12h16M4 16h16" />
          </svg>
        )
    }
  }

  const getDensityLabel = (currentDensity: string) => {
    switch (currentDensity) {
      case 'compact':
        return '컴팩트'
      case 'comfortable':
      default:
        return '컴포트'
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

  const cycleDensity = () => {
    const densities: Array<'compact' | 'comfortable'> = ['comfortable', 'compact']
    const currentIndex = densities.indexOf(density)
    const nextIndex = (currentIndex + 1) % densities.length
    setDensity(densities[nextIndex])
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block">
        <select
          value={density}
          onChange={(e) => setDensity(e.target.value as 'compact' | 'comfortable')}
          className={`select-theme rounded-md ${getSizeClasses()} pr-8`}
        >
          <option value="comfortable">📏 컴포트</option>
          <option value="compact">📐 컴팩트</option>
        </select>
      </div>
    )
  }

  return (
    <button
      onClick={cycleDensity}
      className={`btn-secondary rounded-md ${getSizeClasses()} flex items-center space-x-2 transition-theme`}
      title={`밀도: ${getDensityLabel(density)} (클릭하여 변경)`}
      aria-label={`밀도 변경 (현재: ${getDensityLabel(density)})`}
    >
      {getDensityIcon(density)}
      {showLabel && (
        <span className="hidden sm:inline">
          {getDensityLabel(density)}
        </span>
      )}
    </button>
  )
}


