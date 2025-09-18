import React, { useState, useEffect, useRef } from 'react'
import { ThemeToggle } from './ThemeToggle'
import { DensityToggle } from './DensityToggle'

interface StickyHeaderProps {
  title?: string
  subtitle?: string
  children?: React.ReactNode
  showThemeToggle?: boolean
  showDensityToggle?: boolean
  className?: string
}

export function StickyHeader({ 
  title, 
  subtitle, 
  children, 
  showThemeToggle = true,
  showDensityToggle = true,
  className = ''
}: StickyHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [scrollShadows, setScrollShadows] = useState({
    top: false,
    bottom: false
  })
  const headerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setIsScrolled(scrollTop > 10)

      // Check for scroll shadows
      if (contentRef.current) {
        const { scrollTop: contentScrollTop, scrollHeight, clientHeight } = contentRef.current
        setScrollShadows({
          top: contentScrollTop > 10,
          bottom: contentScrollTop < scrollHeight - clientHeight - 10
        })
      }
    }

    window.addEventListener('scroll', handleScroll)
    
    // Also listen for scroll on content area if it exists
    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll)
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  return (
    <div 
      ref={headerRef}
      className={`sticky-header transition-theme ${isScrolled ? 'shadow-theme-md' : 'shadow-theme-sm'} ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {/* Left side - Title and subtitle */}
          <div className="flex-1 min-w-0">
            {title && (
              <h1 className="text-2xl font-bold text-primary truncate">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="mt-1 text-sm text-secondary truncate">
                {subtitle}
              </p>
            )}
          </div>

          {/* Center - Custom content */}
          {children && (
            <div className="flex-1 flex justify-center">
              {children}
            </div>
          )}

          {/* Right side - Theme and density controls */}
          <div className="flex items-center space-x-2">
            {showDensityToggle && (
              <DensityToggle size="sm" />
            )}
            {showThemeToggle && (
              <ThemeToggle size="sm" />
            )}
          </div>
        </div>
      </div>

      {/* Scroll shadows */}
      {scrollShadows.top && (
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-b from-bg-primary to-transparent pointer-events-none z-10" />
      )}
      {scrollShadows.bottom && (
        <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none z-10" />
      )}
    </div>
  )
}

interface StickyContentProps {
  children: React.ReactNode
  className?: string
  maxHeight?: string
}

export function StickyContent({ 
  children, 
  className = '',
  maxHeight = 'calc(100vh - 8rem)'
}: StickyContentProps) {
  const [scrollShadows, setScrollShadows] = useState({
    top: false,
    bottom: false
  })
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current
        setScrollShadows({
          top: scrollTop > 10,
          bottom: scrollTop < scrollHeight - clientHeight - 10
        })
      }
    }

    const contentElement = contentRef.current
    if (contentElement) {
      contentElement.addEventListener('scroll', handleScroll)
      // Initial check
      handleScroll()
    }

    return () => {
      if (contentElement) {
        contentElement.removeEventListener('scroll', handleScroll)
      }
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <div 
        ref={contentRef}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        {children}
      </div>

      {/* Scroll shadows */}
      {scrollShadows.top && (
        <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-bg-primary to-transparent pointer-events-none z-10" />
      )}
      {scrollShadows.bottom && (
        <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-bg-primary to-transparent pointer-events-none z-10" />
      )}
    </div>
  )
}

interface FilterSummaryProps {
  filters: Array<{
    label: string
    value: string
    onClear: () => void
  }>
  onClearAll: () => void
}

export function FilterSummary({ filters, onClearAll }: FilterSummaryProps) {
  if (filters.length === 0) {
    return null
  }

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-tertiary">필터:</span>
      <div className="flex items-center space-x-1">
        {filters.map((filter, index) => (
          <span
            key={index}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-secondary text-primary"
          >
            {filter.label}: {filter.value}
            <button
              onClick={filter.onClear}
              className="ml-1 text-tertiary hover:text-primary"
              aria-label={`${filter.label} 필터 제거`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <button
        onClick={onClearAll}
        className="text-xs text-tertiary hover:text-primary underline"
      >
        모두 지우기
      </button>
    </div>
  )
}


