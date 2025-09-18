import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { listSlots, deleteSlot } from '../services/db/slots'
import { useAuthStore } from '../store/auth'
import { useToast } from '../components/Toast'
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorStates'
import type { DbSlot } from '../services/db/types'

export function SlotListPage() {
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  
  const [slots, setSlots] = useState<DbSlot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)
  
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
      const scope = profile.role === 'SUPER_ADMIN' ? 'all' : 'mine'
      const slotsData = await listSlots(scope)
      setSlots(slotsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteSlot = async (slotId: string, slotName: string) => {
    if (!window.confirm(`"${slotName}" 슬롯을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return
    }

    setDeletingSlotId(slotId)
    
    try {
      await deleteSlot(slotId)
      setSlots(slots.filter(slot => slot.id !== slotId))
      toast.success('슬롯이 삭제되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯 삭제 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setDeletingSlotId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!user || !profile) {
    return <LoadingState message="사용자 정보를 확인하는 중..." />
  }

  if (isLoading) {
    return <LoadingState message="슬롯 목록을 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSlots} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {profile.role === 'SUPER_ADMIN' ? '전체 슬롯' : '내 슬롯'}
          </h1>
          <p className="mt-2 text-gray-600">
            스케줄링에 사용할 슬롯을 관리하세요
          </p>
        </div>
        <Link
          to="/slots/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          새 슬롯 만들기
        </Link>
      </div>

      {/* Slots List */}
      {slots.length === 0 ? (
        <EmptyState
          title="슬롯이 없습니다"
          description="새로운 슬롯을 만들어 스케줄링을 시작하세요"
          action={{
            label: "첫 번째 슬롯 만들기",
            onClick: () => window.location.href = "/slots/new"
          }}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {slots.map((slot) => (
              <li key={slot.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {slot.name}
                          </h3>
                          {slot.description && (
                            <p className="mt-1 text-sm text-gray-500">
                              {slot.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            수정일: {formatDate(slot.updated_at)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Link
                            to={`/slots/${slot.id}`}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            편집
                          </Link>
                          <button
                            onClick={() => handleDeleteSlot(slot.id, slot.name)}
                            disabled={deletingSlotId === slot.id}
                            className="text-red-600 hover:text-red-900 font-medium disabled:opacity-50"
                          >
                            {deletingSlotId === slot.id ? '삭제 중...' : '삭제'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}


