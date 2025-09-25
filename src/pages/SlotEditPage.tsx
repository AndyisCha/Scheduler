import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getSlotConfig } from '../services/db/slots'
import { useAuthStore } from '../store/auth'
import { useToast } from '../components/Toast'
import { LoadingState, ErrorState } from '../components/ErrorStates'
import { TeachersTab } from '../components/slots/TeachersTab'
import { ConstraintsTab } from '../components/slots/ConstraintsTab'
import { FixedHomeroomsTab } from '../components/slots/FixedHomeroomsTab'
import { GlobalOptionsTab } from '../components/slots/GlobalOptionsTab'
import type { SlotConfig } from '../engine/types'

type TabType = 'teachers' | 'constraints' | 'homerooms' | 'options'

export function SlotEditPage() {
  const { id } = useParams<{ id: string }>()
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  
  const [slotConfig, setSlotConfig] = useState<SlotConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [activeTab, setActiveTab] = useState<TabType>('teachers')
  
  const toast = useToast()

  useEffect(() => {
    if (id && user && profile) {
      loadSlotConfig()
    }
  }, [id, user, profile])

  const loadSlotConfig = async () => {
    if (!id) return

    setIsLoading(true)
    setError('')

    try {
      const config = await getSlotConfig(id)
      setSlotConfig(config)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯 설정을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }


  const tabs = [
    { id: 'teachers' as TabType, name: 'Teachers', icon: '👥' },
    { id: 'constraints' as TabType, name: 'Constraints', icon: '⚙️' },
    { id: 'homerooms' as TabType, name: 'Fixed Homerooms', icon: '🏠' },
    { id: 'options' as TabType, name: 'Global Options', icon: '🌐' },
  ]

  if (!user || !profile) {
    return <LoadingState message="사용자 정보를 확인하는 중..." />
  }

  if (isLoading) {
    return <LoadingState message="슬롯 설정을 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSlotConfig} />
  }

  if (!slotConfig) {
    return <ErrorState message="슬롯을 찾을 수 없습니다." onRetry={loadSlotConfig} />
  }

  return (
    <div className="min-h-screen" style={{backgroundColor: 'var(--bg-primary)'}}>
      <div className="app-container py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <nav className="flex items-center space-x-2 mb-4" aria-label="Breadcrumb">
                  <Link 
                    to="/slots" 
                    className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors whitespace-nowrap"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span>1. 슬롯 목록</span>
                  </Link>
                  <span className="text-gray-500">/</span>
                  <span className="text-sm font-medium text-white whitespace-nowrap">2. 편집</span>
                </nav>
                
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-bold text-white mb-1">
                      {slotConfig.name}
                    </h1>
                    {slotConfig.description && (
                      <p className="text-sm text-gray-300 mb-3">{slotConfig.description}</p>
                    )}
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
                      {slotConfig.dayGroup} 스케줄
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3 ml-6">
                    <Link
                      to={`/slots/${id}/history`}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-200 bg-gray-700 border border-gray-600 rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      히스토리 보기
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="top-actions">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card min-h-[600px]">
          <div>
            {activeTab === 'teachers' && (
              <TeachersTab slotId={id!} slotConfig={slotConfig} onUpdate={setSlotConfig} />
            )}
            {activeTab === 'constraints' && (
              <ConstraintsTab slotId={id!} slotConfig={slotConfig} onUpdate={setSlotConfig} />
            )}
            {activeTab === 'homerooms' && (
              <FixedHomeroomsTab slotId={id!} slotConfig={slotConfig} onUpdate={setSlotConfig} />
            )}
            {activeTab === 'options' && (
              <GlobalOptionsTab slotId={id!} slotConfig={slotConfig} onUpdate={setSlotConfig} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
