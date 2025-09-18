import { useState, useEffect } from 'react'

interface SkipToContentProps {
  targetId?: string
  children?: React.ReactNode
}

export function SkipToContent({ targetId = 'main-content' }: SkipToContentProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Show skip link when Tab is pressed
      if (event.key === 'Tab' && !event.shiftKey) {
        setIsVisible(true)
      }
    }

    const handleClick = () => {
      setIsVisible(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('click', handleClick)
    }
  }, [])

  const handleSkipClick = () => {
    const target = document.getElementById(targetId)
    if (target) {
      target.focus()
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  if (!isVisible) return null

  return (
    <a
      href={`#${targetId}`}
      onClick={handleSkipClick}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all"
    >
      메인 콘텐츠로 건너뛰기
    </a>
  )
}


