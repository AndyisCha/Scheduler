import { useState, useEffect } from 'react'
import { getSlotConfig, getGeneratedSchedules } from '../../services/db/slots'
import { useToast } from '../Toast'
import type { SlotWithStats } from '../../pages/AdminSlotsPage'

interface AdminSlotConfirmPanelProps {
  selectedSlots: SlotWithStats[]
  onClose: () => void
}

interface AggregatedStats {
  totalSlots: number
  totalTeachers: number
  totalClasses: number
  totalWarnings: number
  uniqueOwners: number
  slotsWithSnapshots: number
  averageTeachersPerSlot: number
  averageClassesPerSlot: number
  mostActiveSlot: {
    name: string
    snapshotCount: number
  }
  recentWarnings: Array<{
    slotName: string
    warningCount: number
    latestDate: string
  }>
}

export function AdminSlotConfirmPanel({ selectedSlots, onClose }: AdminSlotConfirmPanelProps) {
  const [stats, setStats] = useState<AggregatedStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  const toast = useToast()

  useEffect(() => {
    if (selectedSlots.length > 0) {
      loadAggregatedStats()
    }
  }, [selectedSlots])

  const loadAggregatedStats = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Load detailed stats for each selected slot
      const slotStats = await Promise.all(
        selectedSlots.map(async (slot) => {
          try {
            const [slotConfig, snapshots] = await Promise.all([
              getSlotConfig(slot.id),
              getGeneratedSchedules(slot.id)
            ])

            const totalTeachers = slotConfig.teachers.homeroomKoreanPool.length + slotConfig.teachers.foreignPool.length
            const totalClasses = Object.values(slotConfig.globalOptions.roundClassCounts).reduce((sum, count) => sum + count, 0)
            const recentWarnings = snapshots.length > 0 ? snapshots[0].warnings?.length || 0 : 0

            return {
              slotId: slot.id,
              slotName: slot.name,
              totalTeachers,
              totalClasses,
              snapshotCount: snapshots.length,
              recentWarnings,
              latestSnapshotDate: snapshots.length > 0 ? snapshots[0].created_at : null,
              ownerId: slot.owner_id
            }
          } catch (err) {
            console.error(`Error loading stats for slot ${slot.id}:`, err)
            return {
              slotId: slot.id,
              slotName: slot.name,
              totalTeachers: 0,
              totalClasses: 0,
              snapshotCount: 0,
              recentWarnings: 0,
              latestSnapshotDate: null,
              ownerId: slot.owner_id
            }
          }
        })
      )

      // Calculate aggregated stats
      const aggregatedStats: AggregatedStats = {
        totalSlots: selectedSlots.length,
        totalTeachers: slotStats.reduce((sum, slot) => sum + slot.totalTeachers, 0),
        totalClasses: slotStats.reduce((sum, slot) => sum + slot.totalClasses, 0),
        totalWarnings: slotStats.reduce((sum, slot) => sum + slot.recentWarnings, 0),
        uniqueOwners: new Set(slotStats.map(slot => slot.ownerId)).size,
        slotsWithSnapshots: slotStats.filter(slot => slot.snapshotCount > 0).length,
        averageTeachersPerSlot: Math.round((slotStats.reduce((sum, slot) => sum + slot.totalTeachers, 0) / selectedSlots.length) * 100) / 100,
        averageClassesPerSlot: Math.round((slotStats.reduce((sum, slot) => sum + slot.totalClasses, 0) / selectedSlots.length) * 100) / 100,
        mostActiveSlot: slotStats.reduce((max, slot) => 
          slot.snapshotCount > max.snapshotCount 
            ? { name: slot.slotName, snapshotCount: slot.snapshotCount }
            : max
        , { name: slotStats[0]?.slotName || '', snapshotCount: 0 }),
        recentWarnings: slotStats
          .filter(slot => slot.recentWarnings > 0)
          .map(slot => ({
            slotName: slot.slotName,
            warningCount: slot.recentWarnings,
            latestDate: slot.latestSnapshotDate || ''
          }))
          .sort((a, b) => b.warningCount - a.warningCount)
          .slice(0, 5)
      }

      setStats(aggregatedStats)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '통계를 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">통계를 계산하는 중...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">오류 발생</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">선택된 슬롯 집계</h3>
            <p className="text-sm text-gray-500">
              {stats.totalSlots}개 슬롯에 대한 통계 정보
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-600">총 슬롯 수</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalSlots}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-600">총 교사 수</p>
                <p className="text-2xl font-bold text-green-900">{stats.totalTeachers}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-600">총 반 수</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalClasses}</p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-600">총 경고 수</p>
                <p className="text-2xl font-bold text-red-900">{stats.totalWarnings}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">사용자 통계</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">고유 소유자 수</span>
                <span className="font-medium">{stats.uniqueOwners}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">스냅샷 보유 슬롯</span>
                <span className="font-medium">{stats.slotsWithSnapshots}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">슬롯당 평균 교사</span>
                <span className="font-medium">{stats.averageTeachersPerSlot}명</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">슬롯당 평균 반</span>
                <span className="font-medium">{stats.averageClassesPerSlot}개</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-medium text-gray-900 mb-4">활동 통계</h4>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">가장 활발한 슬롯</span>
                <div className="mt-1">
                  <span className="font-medium">{stats.mostActiveSlot.name}</span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({stats.mostActiveSlot.snapshotCount}개 스냅샷)
                  </span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">스냅샷 보유율</span>
                <span className="font-medium">
                  {Math.round((stats.slotsWithSnapshots / stats.totalSlots) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Warnings */}
        {stats.recentWarnings.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8">
            <h4 className="text-lg font-medium text-gray-900 mb-4">최근 경고 (상위 5개)</h4>
            <div className="space-y-2">
              {stats.recentWarnings.map((warning, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <span className="font-medium text-gray-900">{warning.slotName}</span>
                    {warning.latestDate && (
                      <span className="text-sm text-gray-500 ml-2">
                        ({formatDate(warning.latestDate)})
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    ⚠️ {warning.warningCount}개
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Selected Slots List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4">선택된 슬롯 목록</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {selectedSlots.map((slot) => (
              <div key={slot.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                <span className="text-sm font-medium text-gray-900">{slot.name}</span>
                <span className="text-xs text-gray-500">{slot.ownerDisplayName}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
