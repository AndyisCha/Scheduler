// Super Admin slot list component for viewing all slots
import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { unifiedSlotService } from '../services/unifiedSlotService'
import { LoadingState, ErrorState, EmptyState } from './ErrorStates'
import { useToast } from './Toast'
import type { UnifiedSlotConfig } from '../services/unifiedSlotService'

interface SuperAdminSlotListProps {
  onSlotSelect?: (slot: UnifiedSlotConfig) => void
  selectedSlotId?: string
}

export function SuperAdminSlotList({ onSlotSelect, selectedSlotId }: SuperAdminSlotListProps) {
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  
  const [mwfSlots, setMwfSlots] = useState<UnifiedSlotConfig[]>([])
  const [ttSlots, setTtSlots] = useState<UnifiedSlotConfig[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [filter, setFilter] = useState<'all' | 'MWF' | 'TT'>('all')
  
  const toast = useToast()

  useEffect(() => {
    if (user && profile && profile.role === 'SUPER_ADMIN') {
      loadAllSlots()
    }
  }, [user, profile])

  const loadAllSlots = async () => {
    if (!user || !profile) return

    setIsLoading(true)
    setError('')

    try {
      const [mwfSlotsData, ttSlotsData] = await Promise.all([
        unifiedSlotService.getSlotsByDayGroup('MWF', user.id, profile.role),
        unifiedSlotService.getSlotsByDayGroup('TT', user.id, profile.role)
      ])

      setMwfSlots(mwfSlotsData)
      setTtSlots(ttSlotsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlotSelect = (slot: UnifiedSlotConfig) => {
    onSlotSelect?.(slot)
  }

  const getFilteredSlots = () => {
    switch (filter) {
      case 'MWF':
        return mwfSlots
      case 'TT':
        return ttSlots
      default:
        return [...mwfSlots, ...ttSlots]
    }
  }

  const getSlotTypeColor = (dayGroup: 'MWF' | 'TT') => {
    return dayGroup === 'MWF' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
  }

  if (isLoading) {
    return <LoadingState message="슬롯 목록을 불러오는 중..." />
  }

  if (error) {
    return (
      <ErrorState
        title="슬롯 로딩 실패"
        message={error}
        action={{
          label: '다시 시도',
          onClick: loadAllSlots
        }}
      />
    )
  }

  const filteredSlots = getFilteredSlots()

  if (filteredSlots.length === 0) {
    return (
      <EmptyState
        title="슬롯이 없습니다"
        message="등록된 슬롯이 없습니다."
      />
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">모든 슬롯 (Super Admin)</h3>
        <div className="flex space-x-2">
          {[
            { key: 'all', label: '전체' },
            { key: 'MWF', label: 'MWF' },
            { key: 'TT', label: 'TT' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={`px-3 py-1 text-sm rounded ${
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSlots.map(slot => (
          <div
            key={slot.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              selectedSlotId === slot.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
            onClick={() => handleSlotSelect(slot)}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-medium text-gray-900">{slot.name}</h4>
              <span className={`px-2 py-1 text-xs rounded ${getSlotTypeColor(slot.dayGroup)}`}>
                {slot.dayGroup}
              </span>
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>홈룸/한국인:</span>
                <span className="font-medium">{slot.teachers.homeroomKoreanPool.length}명</span>
              </div>
              <div className="flex justify-between">
                <span>외국인:</span>
                <span className="font-medium">{slot.teachers.foreignPool.length}명</span>
              </div>
              <div className="flex justify-between">
                <span>생성자:</span>
                <span className="font-medium">{slot.createdBy}</span>
              </div>
              <div className="flex justify-between">
                <span>생성일:</span>
                <span className="font-medium text-xs">
                  {new Date(slot.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        총 {filteredSlots.length}개의 슬롯 (MWF: {mwfSlots.length}, TT: {ttSlots.length})
      </div>
    </div>
  )
}
