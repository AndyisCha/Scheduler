import { useState, useEffect, useRef } from 'react'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
  disabled?: boolean
}

interface AccessibleTabListProps {
  tabs: Tab[]
  defaultTab?: string
  onTabChange?: (tabId: string) => void
  className?: string
  'aria-label'?: string
}

export function AccessibleTabList({
  tabs,
  defaultTab,
  onTabChange,
  className = '',
  'aria-label': ariaLabel = '탭 목록'
}: AccessibleTabListProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id || '')
  const tabListRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({})

  useEffect(() => {
    if (defaultTab && tabs.some(tab => tab.id === defaultTab)) {
      setActiveTab(defaultTab)
    }
  }, [defaultTab, tabs])

  const handleTabClick = (tabId: string) => {
    if (tabs.find(tab => tab.id === tabId)?.disabled) return
    
    setActiveTab(tabId)
    onTabChange?.(tabId)
  }

  const handleKeyDown = (event: React.KeyboardEvent, tabId: string) => {
    const currentIndex = tabs.findIndex(tab => tab.id === tabId)
    let newIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        newIndex = (currentIndex + 1) % tabs.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        newIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
        break
      case 'Home':
        event.preventDefault()
        newIndex = 0
        break
      case 'End':
        event.preventDefault()
        newIndex = tabs.length - 1
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        handleTabClick(tabId)
        return
      default:
        return
    }

    // Find next enabled tab
    while (tabs[newIndex]?.disabled && newIndex !== currentIndex) {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        newIndex = (newIndex + 1) % tabs.length
      } else {
        newIndex = newIndex === 0 ? tabs.length - 1 : newIndex - 1
      }
    }

    const newTabId = tabs[newIndex]?.id
    if (newTabId) {
      tabRefs.current[newTabId]?.focus()
    }
  }


  return (
    <div className={className}>
      {/* Tab List */}
      <div
        ref={tabListRef}
        role="tablist"
        aria-label={ariaLabel}
        className="border-b border-gray-200"
      >
        <nav className="flex space-x-8 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el
              }}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              aria-disabled={tab.disabled}
              tabIndex={activeTab === tab.id ? 0 : -1}
              disabled={tab.disabled}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : tab.disabled
                  ? 'border-transparent text-gray-400 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {tabs.map((tab) => (
          <div
            key={`panel-${tab.id}`}
            id={`panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            className={activeTab === tab.id ? '' : 'sr-only'}
          >
            {activeTab === tab.id && tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}


