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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlots.map(slot => (
            <div
              key={slot.id}
              className={`bg-white rounded-lg shadow-md p-4 border-2 transition-colors ${
                selectedSlotId === slot.id 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{slot.name}</h3>
                  <span className={`inline-block px-2 py-1 text-xs rounded ${
                    slot.dayGroup === 'MWF' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {slot.dayGroup}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => onSlotSelect?.(slot)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    편집
                  </button>
                  <button
                    onClick={() => setDeleteSlotId(slot.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    삭제
                  </button>
                </div>
              </div>
              
              {slot.description && (
                <p className="text-sm text-gray-600 mb-3">{slot.description}</p>
              )}
              
              <div className="text-xs text-gray-500">
                <p>한국어 교사: {slot.teachers.homeroomKoreanPool.length}명</p>
                <p>외국어 교사: {slot.teachers.foreignPool.length}명</p>
                <p>생성일: {new Date(slot.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          ))}
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
