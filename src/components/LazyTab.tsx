// Lazy tab component for performance optimization
import React, { useState, useEffect, useRef } from 'react'

interface LazyTabProps {
  children: React.ReactNode
  isActive: boolean
  className?: string
}

export function LazyTab({ children, isActive, className = '' }: LazyTabProps) {
  const [hasBeenActive, setHasBeenActive] = useState(false)
  const [shouldRender, setShouldRender] = useState(isActive)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (isActive && !hasBeenActive) {
      setHasBeenActive(true)
    }

    if (isActive) {
      setShouldRender(true)
      // Clear any pending timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    } else if (hasBeenActive) {
      // Delay unmounting to prevent layout shift during rapid tab switching
      timeoutRef.current = setTimeout(() => {
        setShouldRender(false)
      }, 100)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isActive, hasBeenActive])

  if (!shouldRender) {
    return <div className={`${className} opacity-0`} />
  }

  return (
    <div className={`${className} transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-50'}`}>
      {children}
    </div>
  )
}

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  loadingComponent?: React.ComponentType
) {
  return function LazyLoadedComponent(props: T) {
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
      // Simulate lazy loading with a small delay
      const timer = setTimeout(() => {
        setIsLoaded(true)
      }, 50)

      return () => clearTimeout(timer)
    }, [])

    if (!isLoaded && loadingComponent) {
      const LoadingComponent = loadingComponent
      return <LoadingComponent />
    }

    if (!isLoaded) {
      return (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )
    }

    return <Component {...props} />
  }
}
