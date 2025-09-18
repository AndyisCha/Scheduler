// Navigation component with role-based menu items
import { useAuthStore } from '../store/auth'
import { useTranslation } from '../store/i18n'

interface NavigationProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const profile = useAuthStore(state => state.profile)
  const { t } = useTranslation()

  const tabs = [
    { key: 'mwf', label: t('navigation.mwfScheduler'), accessible: true },
    { key: 'tt', label: t('navigation.ttScheduler'), accessible: true },
    { key: 'unified', label: t('navigation.unifiedScheduler'), accessible: true },
    { key: 'slots', label: t('navigation.slotManagement'), accessible: true },
    { key: 'history', label: t('navigation.history'), accessible: true },
    { key: 'teacher-dashboard', label: t('navigation.mySchedule'), accessible: true },
    { key: 'reports', label: t('navigation.classReports'), accessible: true },
    { key: 'admin-slots', label: t('navigation.allSlots'), accessible: profile?.role === 'SUPER_ADMIN' },
    { key: 'super-admin', label: t('navigation.superAdmin'), accessible: profile?.role === 'SUPER_ADMIN' },
    { key: 'sandbox', label: t('navigation.sandbox'), accessible: profile?.role === 'SUPER_ADMIN' },
    { key: 'share-admin', label: t('navigation.shareAdmin'), accessible: profile?.role === 'SUPER_ADMIN' },
    { key: 'telemetry', label: t('navigation.telemetry'), accessible: profile?.role === 'SUPER_ADMIN' },
    { key: 'dev-tools', label: t('navigation.devTools'), accessible: import.meta.env.DEV }
  ]

  const getTabStyle = (tab: typeof tabs[0]) => {
    const isActive = activeTab === tab.key
    const isAccessible = tab.accessible
    
    if (!isAccessible) {
      return 'px-4 py-2 bg-tertiary text-tertiary rounded cursor-not-allowed opacity-50'
    }
    
    return isActive
      ? 'px-4 py-2 bg-accent-primary text-white rounded transition-theme'
      : 'px-4 py-2 bg-secondary text-primary rounded hover:bg-hover transition-theme'
  }

      return (
        <nav 
          className="bg-primary shadow-theme-md rounded-lg p-md mb-lg transition-theme"
          role="navigation"
          aria-label="메인 네비게이션"
        >
      <div className="flex space-x-4" role="tablist">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => tab.accessible && onTabChange(tab.key)}
            disabled={!tab.accessible}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-disabled={!tab.accessible}
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={`${getTabStyle(tab)} focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2 transition-theme`}
            title={!tab.accessible ? '권한이 필요합니다' : undefined}
          >
            {tab.label}
            {!tab.accessible && (
              <span className="ml-1 text-xs" aria-hidden="true">🔒</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
