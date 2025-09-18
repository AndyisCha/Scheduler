import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import React from 'react'
import { List } from 'react-virtualized'
import { listSlots, getGeneratedSchedules } from '../services/db/slots'
import { useAuthStore } from '../store/auth'
import { useToast } from '../components/Toast'
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorStates'
import { AdminSlotConfirmPanel } from '../components/admin/AdminSlotConfirmPanel'
import type { DbSlot } from '../services/db/types'

export interface SlotWithStats extends DbSlot {
  ownerDisplayName: string
  latestSnapshot?: {
    created_at: string
    warnings_count: number
  }
  stats?: {
    totalTeachers: number
    totalClasses: number
    recentWarnings: number
  }
}

export function AdminSlotsPage() {
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)
  
  const [slots, setSlots] = useState<SlotWithStats[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set())
  const [showConfirmPanel, setShowConfirmPanel] = useState(false)
  
  const toast = useToast()

  useEffect(() => {
    if (user && profile && profile.role === 'SUPER_ADMIN') {
      loadSlots()
    }
  }, [user, profile])

  const loadSlots = async () => {
    if (!user || !profile || profile.role !== 'SUPER_ADMIN') return

    setIsLoading(true)
    setError('')

    try {
      // Load all slots
      const allSlots = await listSlots('all')
      
      // Load additional stats for each slot
      const slotsWithStats = await Promise.all(
        allSlots.map(async (slot) => {
          try {
            // Get latest snapshot
            const snapshots = await getGeneratedSchedules(slot.id)
            const latestSnapshot = snapshots.length > 0 ? {
              created_at: snapshots[0].created_at,
              warnings_count: snapshots[0].warnings?.length || 0
            } : undefined

            // Get slot config for stats (we'll need to create a function for this)
            // For now, we'll use placeholder stats
            const stats = {
              totalTeachers: 0, // Will be populated from slot config
              totalClasses: 0,  // Will be calculated from global options
              recentWarnings: latestSnapshot?.warnings_count || 0
            }

            return {
              ...slot,
              ownerDisplayName: `User_${slot.owner_id.slice(-4)}`, // Masked owner ID
              latestSnapshot,
              stats
            }
          } catch (err) {
            console.error(`Error loading stats for slot ${slot.id}:`, err)
            return {
              ...slot,
              ownerDisplayName: `User_${slot.owner_id.slice(-4)}`,
              stats: {
                totalTeachers: 0,
                totalClasses: 0,
                recentWarnings: 0
              }
            }
          }
        })
      )

      setSlots(slotsWithStats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '슬롯 목록을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectSlot = (slotId: string) => {
    setSelectedSlots(prev => {
      const newSet = new Set(prev)
      if (newSet.has(slotId)) {
        newSet.delete(slotId)
      } else {
        newSet.add(slotId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedSlots.size === slots.length) {
      setSelectedSlots(new Set())
    } else {
      setSelectedSlots(new Set(slots.map(slot => slot.id)))
    }
  }

  const handleShowConfirmPanel = () => {
    if (selectedSlots.size === 0) {
      toast.error('확인할 슬롯을 선택해주세요.')
      return
    }
    setShowConfirmPanel(true)
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

  const getSelectedSlotsData = () => {
    return slots.filter(slot => selectedSlots.has(slot.id))
  }

  // Virtualized table row component
  const VirtualizedRow = ({ index, key, style }: { index: number; key: string; style: React.CSSProperties }) => {
    const slot = slots[index]
    const isSelected = selectedSlots.has(slot.id)

    return (
      <div key={key} style={style} className={`flex items-center border-b border-gray-200 ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
        <div className="w-12 px-3 py-4 flex justify-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => handleSelectSlot(slot.id)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>
        <div className="flex-1 px-6 py-4">
          <div>
            <div className="text-sm font-medium text-gray-900">{slot.name}</div>
            {slot.description && (
              <div className="text-sm text-gray-500">{slot.description}</div>
            )}
          </div>
        </div>
        <div className="w-32 px-6 py-4 text-sm text-gray-900">
          {slot.ownerDisplayName}
        </div>
        <div className="w-32 px-6 py-4 text-sm text-gray-900">
          {formatDate(slot.updated_at)}
        </div>
        <div className="w-40 px-6 py-4 text-sm text-gray-900">
          {slot.latestSnapshot ? (
            <div>
              <div>{formatDate(slot.latestSnapshot.created_at)}</div>
              <div className="text-red-600">
                WARN {slot.latestSnapshot.warnings_count}개 경고
              </div>
            </div>
          ) : (
            <span className="text-gray-400">없음</span>
          )}
        </div>
        <div className="w-32 px-6 py-4 text-sm text-gray-900">
          <div>
            <div>TCH {slot.stats?.totalTeachers || 0}명</div>
            <div>CLS {slot.stats?.totalClasses || 0}개</div>
          </div>
        </div>
        <div className="w-24 px-6 py-4 text-sm font-medium">
          <div className="flex space-x-2">
            <Link
              to={`/slots/${slot.id}`}
              className="text-blue-600 hover:text-blue-900"
            >
              편집
            </Link>
            <Link
              to={`/slots/${slot.id}/history`}
              className="text-green-600 hover:text-green-900"
            >
              히스토리
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Row renderer for react-virtualized
  const rowRenderer = ({ index, key, style }: { index: number; key: string; style: React.CSSProperties }) => {
    return VirtualizedRow({ index, key, style })
  }

  // Determine if we should use virtualization (threshold: 200 rows)
  const shouldVirtualize = slots.length > 200
  const virtualizedHeight = Math.min(600, slots.length * 80) // Max height of 600px

  // Check if user has SUPER_ADMIN role
  if (!user || !profile || profile.role !== 'SUPER_ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-medium text-gray-900">접근 권한 없음</h3>
            <p className="mt-2 text-sm text-gray-500">
              이 페이지는 SUPER_ADMIN 권한이 필요합니다.
            </p>
            <div className="mt-4">
              <Link
                to="/slots"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                일반 슬롯 관리로 이동
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
                    <span className="ml-4 text-gray-500">전체 슬롯 관리</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">전체 슬롯 관리</h1>
            <p className="mt-2 text-gray-600">
              모든 사용자의 슬롯을 확인하고 관리하세요
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">
              총 {slots.length}개 슬롯
            </span>
          </div>
        </div>
      </div>

      {/* Slots Table */}
      {slots.length === 0 ? (
        <EmptyState
          title="슬롯이 없습니다"
          description="아직 생성된 슬롯이 없습니다."
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Table Header */}
          <div className="bg-gray-50 border-b border-gray-200">
            <div className="flex items-center">
              <div className="w-12 px-3 py-3 flex justify-center">
                <input
                  type="checkbox"
                  checked={selectedSlots.size === slots.length && slots.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="flex-1 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                슬롯 이름
              </div>
              <div className="w-32 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                소유자
              </div>
              <div className="w-32 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                수정일
              </div>
              <div className="w-40 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                최근 스냅샷
              </div>
              <div className="w-32 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                통계
              </div>
              <div className="w-24 px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                액션
              </div>
            </div>
          </div>
          
          {/* Virtualized Table Body */}
          {shouldVirtualize ? (
            <div className="overflow-hidden">
              <List
                height={virtualizedHeight}
                width={800}
                rowCount={slots.length}
                rowHeight={80}
                rowRenderer={rowRenderer}
                className="virtualized-table"
              />
              <div className="bg-gray-50 px-4 py-2 text-sm text-gray-500 border-t">
                INFO: 가상화 테이블 (200개 이상 행) - {slots.length}개 슬롯 표시 중
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {slots.map((slot) => {
                const isSelected = selectedSlots.has(slot.id)
                return (
                  <div key={slot.id} className={`flex items-center ${isSelected ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'}`}>
                    <div className="w-12 px-3 py-4 flex justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectSlot(slot.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="flex-1 px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{slot.name}</div>
                        {slot.description && (
                          <div className="text-sm text-gray-500">{slot.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="w-32 px-6 py-4 text-sm text-gray-900">
                      {slot.ownerDisplayName}
                    </div>
                    <div className="w-32 px-6 py-4 text-sm text-gray-900">
                      {formatDate(slot.updated_at)}
                    </div>
                    <div className="w-40 px-6 py-4 text-sm text-gray-900">
                      {slot.latestSnapshot ? (
                        <div>
                          <div>{formatDate(slot.latestSnapshot.created_at)}</div>
                          <div className="text-red-600">
                            WARN {slot.latestSnapshot.warnings_count}개 경고
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">없음</span>
                      )}
                    </div>
                    <div className="w-32 px-6 py-4 text-sm text-gray-900">
                        <div>
                          <div>TCH {slot.stats?.totalTeachers || 0}명</div>
                          <div>CLS {slot.stats?.totalClasses || 0}개</div>
                        </div>
                    </div>
                    <div className="w-24 px-6 py-4 text-sm font-medium">
                      <div className="flex space-x-2">
                        <Link
                          to={`/slots/${slot.id}`}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          편집
                        </Link>
                        <Link
                          to={`/slots/${slot.id}/history`}
                          className="text-green-600 hover:text-green-900"
                        >
                          히스토리
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Footer Bar */}
      {selectedSlots.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-900">
                  {selectedSlots.size}개 슬롯 선택됨
                </span>
                <button
                  onClick={() => setSelectedSlots(new Set())}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  선택 해제
                </button>
              </div>
              <button
                onClick={handleShowConfirmPanel}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                선택 확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Panel Modal */}
      {showConfirmPanel && (
        <AdminSlotConfirmPanel
          selectedSlots={getSelectedSlotsData()}
          onClose={() => setShowConfirmPanel(false)}
        />
      )}
    </div>
  )
}
