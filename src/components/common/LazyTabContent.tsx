// Lazy-loaded tab content component
import { useState, useEffect, type ReactNode } from 'react'

interface LazyTabContentProps {
  isActive: boolean
  children: ReactNode
  fallback?: ReactNode
  delay?: number
}

export function LazyTabContent({ 
  isActive, 
  children, 
  fallback = <div className="flex justify-center items-center py-8 text-gray-500">로딩 중...</div>,
  delay = 100
}: LazyTabContentProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isActive) {
      // Small delay to prevent unnecessary renders during rapid tab switching
      const timer = setTimeout(() => {
        setShouldRender(true)
        // Additional delay for smooth transition
        setTimeout(() => setIsVisible(true), 50)
      }, delay)

      return () => clearTimeout(timer)
    } else {
      // Keep content rendered but hidden for better UX
      setIsVisible(false)
      // Only unmount after a delay to allow for smooth transitions
      const timer = setTimeout(() => {
        if (!isActive) {
          setShouldRender(false)
        }
      }, 300)

      return () => clearTimeout(timer)
    }
  }, [isActive, delay])

  if (!shouldRender) {
    return isActive ? <>{fallback}</> : null
  }

  return (
    <div 
      className={`transition-opacity duration-200 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {children}
    </div>
  )
}
