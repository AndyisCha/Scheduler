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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-4">
                <li>
                  <Link to="/slots" className="text-gray-400 hover:text-gray-500">
                    슬롯 목록
                  </Link>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-gray-500">{slotConfig.name}</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{slotConfig.name}</h1>
            {slotConfig.description && (
              <p className="mt-2 text-gray-600">{slotConfig.description}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Link
              to={`/slots/${id}/history`}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              📊 히스토리 보기
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
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
  )
}
