import React, { useState, useRef, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  content: React.ReactNode;
  'aria-label'?: string;
}

interface AccessibleTabsProps {
  tabs: Tab[];
  defaultActiveTab?: string;
  className?: string;
  'aria-label'?: string;
  onTabChange?: (tabId: string) => void;
}

export const AccessibleTabs: React.FC<AccessibleTabsProps> = ({
  tabs,
  defaultActiveTab,
  className = '',
  'aria-label': ariaLabel,
  onTabChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultActiveTab || tabs[0]?.id || '');
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabPanelRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
    tabPanelRefs.current = tabPanelRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (index + 1) % tabs.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (index - 1 + tabs.length) % tabs.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabs.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleTabClick(tabs[index].id);
        return;
      default:
        return;
    }

    tabRefs.current[newIndex]?.focus();
  };

  // const activeTabIndex = tabs.findIndex(tab => tab.id === activeTab);

  return (
    <div className={`accessible-tabs ${className}`} aria-label={ariaLabel}>
      {/* Tab List */}
      <div
        role="tablist"
        aria-label={ariaLabel || '탭 목록'}
        className="flex border-b border-gray-200 mb-4"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={el => { tabRefs.current[index] = el; }}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`
              px-4 py-2 text-sm font-medium border-b-2 transition-colors
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }
            `}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={e => handleKeyDown(e, index)}
            aria-label={tab['aria-label'] || tab.label}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {tabs.map((tab, index) => (
        <div
          key={tab.id}
          ref={el => { tabPanelRefs.current[index] = el; }}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={activeTab !== tab.id}
          className={activeTab === tab.id ? 'block' : 'hidden'}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
};

// Keyboard navigation hook for tab-like components
export const useKeyboardNavigation = (
  itemCount: number,
  onNavigate?: (index: number) => void
) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (currentIndex + 1) % itemCount;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (currentIndex - 1 + itemCount) % itemCount;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = itemCount - 1;
        break;
      default:
        return;
    }

    setCurrentIndex(newIndex);
    onNavigate?.(newIndex);
  };

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  };
};
