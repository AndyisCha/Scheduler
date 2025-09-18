import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getGeneratedSchedules } from '../services/db/slots'
import { useToast } from '../components/Toast'
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorStates'
import type { DbGeneratedSchedule } from '../services/db/types'

export function SlotHistoryPage() {
  const { id } = useParams<{ id: string }>()
  const [schedules, setSchedules] = useState<DbGeneratedSchedule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedSchedules, setSelectedSchedules] = useState<string[]>([])
  
  const toast = useToast()

  useEffect(() => {
    if (id) {
      loadSchedules()
    }
  }, [id])

  const loadSchedules = async () => {
    if (!id) return

    setIsLoading(true)
    setError('')

    try {
      const schedulesData = await getGeneratedSchedules(id)
      setSchedules(schedulesData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스케줄 히스토리를 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getKPIs = (result: any) => {
    if (!result) return { unassignedCount: 0, totalAssignments: 0 }
    
    // Calculate basic KPIs from result
    const mwfResult = result.mwfResult || result
    const classSummary = mwfResult.classSummary || {}
    
    let unassignedCount = 0
    let totalAssignments = 0
    
    // Count unassigned slots
    Object.values(classSummary).forEach((cls: any) => {
      if (cls && cls.assignments) {
        Object.values(cls.assignments).forEach((period: any) => {
          if (period && period.assignments) {
            Object.values(period.assignments).forEach((assignment: any) => {
              if (!assignment.teacher) {
                unassignedCount++
              } else {
                totalAssignments++
              }
            })
          }
        })
      }
    })
    
    return { unassignedCount, totalAssignments }
  }

  const handleScheduleSelect = (scheduleId: string) => {
    setSelectedSchedules(prev => {
      if (prev.includes(scheduleId)) {
        return prev.filter(id => id !== scheduleId)
      } else if (prev.length < 2) {
        return [...prev, scheduleId]
      } else {
        // Replace the first selected item
        return [prev[1], scheduleId]
      }
    })
  }

  const handleCompare = () => {
    if (selectedSchedules.length !== 2) {
      toast.error('비교하려면 정확히 2개의 스케줄을 선택해주세요.')
      return
    }
    
    // Navigate to compare page
    const [schedule1Id, schedule2Id] = selectedSchedules
    window.location.href = `/slots/${id}/history/compare?schedule1=${schedule1Id}&schedule2=${schedule2Id}`
  }

  if (isLoading) {
    return <LoadingState message="스케줄 히스토리를 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSchedules} />
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
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
                <Link to={`/slots/${id}`} className="ml-4 text-gray-400 hover:text-gray-500">
                  슬롯 편집
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-4 text-gray-500">스케줄 히스토리</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">스케줄 히스토리</h1>
        <p className="mt-2 text-gray-600">
          생성된 스케줄의 히스토리를 확인하고 비교하세요
        </p>
      </div>

      {/* Action Bar */}
      {selectedSchedules.length > 0 && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedSchedules.length}개 선택됨
              </span>
              {selectedSchedules.length === 2 && (
                <button
                  onClick={handleCompare}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  비교하기
                </button>
              )}
            </div>
            <button
              onClick={() => setSelectedSchedules([])}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              선택 해제
            </button>
          </div>
        </div>
      )}

      {/* Schedules List */}
      {schedules.length === 0 ? (
        <EmptyState
          title="스케줄 히스토리가 없습니다"
          description="아직 생성된 스케줄이 없습니다. 먼저 스케줄을 생성해보세요."
          action={{
            label: "스케줄 생성하러 가기",
            onClick: () => window.location.href = "/"
          }}
        />
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {schedules.map((schedule) => {
              const isSelected = selectedSchedules.includes(schedule.id)
              const kpis = getKPIs(schedule.result)
              const warningsCount = schedule.warnings?.length || 0
              
              return (
                <li key={schedule.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleScheduleSelect(schedule.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          disabled={!isSelected && selectedSchedules.length >= 2}
                        />
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">
                            {formatDate(schedule.created_at)}
                          </h3>
                          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                            <span>⚠️ 경고: {warningsCount}개</span>
                            <span>📊 미배정: {kpis.unassignedCount}개</span>
                            <span>✅ 배정: {kpis.totalAssignments}개</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/slots/${id}/history/${schedule.id}`}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          상세 보기
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}


