// Slot list page with create/edit/delete functionality
import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/auth'
import { unifiedSlotService } from '../../services/unifiedSlotService'
import { LoadingState, ErrorState, EmptyState } from '../ErrorStates'
import { useToast } from '../Toast'
import { CreateSlotModal } from './CreateSlotModal'
import { DeleteSlotModal } from './DeleteSlotModal'
import type { UnifiedSlotConfig } from '../../services/unifiedSlotService'

interface SlotListPageProps {
  onSlotSelect?: (slot: UnifiedSlotConfig) => void
  selectedSlotId?: string
}

export function SlotListPage({ onSlotSelect, selectedSlotId }: SlotListPageProps) {
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  const [slots, setSlots] = useState<UnifiedSlotConfig[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false)
  const [deleteSlotId, setDeleteSlotId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'MWF' | 'TT'>('all')
  
  const toast = useToast()

  useEffect(() => {
    if (user && profile) {
      loadSlots()
    }
  }, [user, profile])

  const loadSlots = async () => {
    if (!user || !profile) return

    setIsLoading(true)
    setError('')

    try {
      const allSlots: UnifiedSlotConfig[] = []
      
      // Load both MWF and TT slots
      const [mwfSlots, ttSlots] = await Promise.all([
        unifiedSlotService.getSlotsByDayGroup('MWF', user.id, profile.role),
        unifiedSlotService.getSlotsByDayGroup('TT', user.id, profile.role)
      ])

      allSlots.push(...mwfSlots, ...ttSlots)
      setSlots(allSlots)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateSlot = async (name: string, description: string, dayGroup: 'MWF' | 'TT') => {
    if (!user || !profile) return

    try {
      // Save to database
      const createdSlot = await unifiedSlotService.createSlot({
        name,
        description,
        day_group: dayGroup,
        created_by: user.id
      })

      // Add to local state
      setSlots(prev => [...prev, createdSlot])
      setShowCreateModal(false)
      toast.success('슬롯이 성공적으로 생성되었습니다!')
      
      // Navigate to editor
      if (onSlotSelect) {
        onSlotSelect(createdSlot)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯 생성 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  const handleDeleteSlot = async (slotId: string) => {
    if (!user || !profile) return

    try {
      // Delete from database
      await unifiedSlotService.deleteSlot(slotId)
      
      // Remove from local state
      setSlots(prev => prev.filter(slot => slot.id !== slotId))
      setDeleteSlotId(null)
      toast.success('슬롯이 성공적으로 삭제되었습니다!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯 삭제 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  const filteredSlots = slots.filter(slot => {
    if (filter === 'all') return true
    return slot.dayGroup === filter
  })

  if (isLoading) {
    return <LoadingState message="슬롯을 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {profile?.role === 'SUPER_ADMIN' ? '전체 슬롯 관리' : '내 슬롯 관리'}
          </h2>
          <p className="text-gray-600">
            {profile?.role === 'SUPER_ADMIN' 
              ? '모든 사용자의 스케줄 슬롯을 관리합니다'
              : '나의 스케줄 슬롯을 관리합니다'
            }
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          새 슬롯 생성
        </button>
      </div>

      {/* Filter */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded ${
            filter === 'all' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          전체
        </button>
        <button
          onClick={() => setFilter('MWF')}
          className={`px-3 py-1 rounded ${
            filter === 'MWF' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          MWF
        </button>
        <button
          onClick={() => setFilter('TT')}
          className={`px-3 py-1 rounded ${
            filter === 'TT' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          TT
        </button>
      </div>

      {/* Slot List */}
      {filteredSlots.length === 0 ? (
        <EmptyState 
          message="슬롯이 없습니다"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">슬롯 목록 ({filteredSlots.length}개)</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <div className="divide-y divide-gray-200">
              {filteredSlots.map(slot => (
                <div
                  key={slot.id}
                  className={`p-4 transition-colors cursor-pointer ${
                    selectedSlotId === slot.id 
                      ? 'bg-blue-50 border-l-4 border-blue-500' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onSlotSelect?.(slot)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {slot.name}
                        </h3>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          slot.dayGroup === 'MWF' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {slot.dayGroup}
                        </span>
                      </div>
                      
                      {slot.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2 break-words">
                          {slot.description}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          한국어: {slot.teachers.homeroomKoreanPool.length}명
                        </span>
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          외국어: {slot.teachers.foreignPool.length}명
                        </span>
                        <span className="flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                          </svg>
                          {new Date(slot.createdAt).toLocaleDateString('ko-KR')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSlotSelect?.(slot);
                        }}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        편집
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteSlotId(slot.id);
                        }}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateSlotModal
          onClose={() => setShowCreateModal(false)}
          onConfirm={handleCreateSlot}
        />
      )}

      {deleteSlotId && (
        <DeleteSlotModal
          slotId={deleteSlotId}
          slotName={slots.find(s => s.id === deleteSlotId)?.name || ''}
          onClose={() => setDeleteSlotId(null)}
          onConfirm={handleDeleteSlot}
        />
      )}
    </div>
  )
}
