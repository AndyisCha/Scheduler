import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import { listSlots, getGeneratedSchedules } from '../services/db/slots'
import { LoadingState, ErrorState, EmptyState } from '../components/ErrorStates'
import { useToast } from '../components/Toast/ToastProvider'
import { TeacherCalendarGrid } from '../components/teacher/TeacherCalendarGrid'
import { TeacherTimelineView } from '../components/teacher/TeacherTimelineView'
import { TeacherScheduleDetailDrawer } from '../components/teacher/TeacherScheduleDetailDrawer'
import { FilteredScheduleView } from '../components/FilteredScheduleView'
import type { Assignment } from '../types/scheduler'

export interface TeacherSchedule {
  day: string
  period: number
  time: string
  classId: string
  role: string
  round: number
  isExam: boolean
  teacher?: string
}

interface TeacherDashboardData {
  teacherName: string
  weeklySchedule: TeacherSchedule[]
  totalAssignments: number
  roleDistribution: {
    H: number
    K: number
    F: number
  }
  examSessions: number
}

export function TeacherDashboardPage() {
  const { user, profile } = useAuthStore()
  const toast = useToast()
  
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<Array<{ id: string; name: string }>>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [showDetailDrawer, setShowDetailDrawer] = useState(false)

  useEffect(() => {
    if (user && profile) {
      loadTeacherSchedule()
    }
  }, [user, profile])

  useEffect(() => {
    if (selectedSlot) {
      loadScheduleData()
    }
  }, [selectedSlot])

  const loadTeacherSchedule = async () => {
    if (!user || !profile) return

    setIsLoading(true)
    setError('')

    try {
      // Load available slots for the teacher
      const slots = await listSlots('mine')
      const slotOptions = slots.map(slot => ({ id: slot.id, name: slot.name }))
      
      setAvailableSlots(slotOptions)
      
      // Select the first slot by default
      if (slotOptions.length > 0) {
        setSelectedSlot(slotOptions[0].id)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스케줄을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.showToast({
        type: 'error',
        title: '스케줄 로딩 실패',
        message: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const loadScheduleData = async () => {
    if (!selectedSlot || !profile) return

    try {
      setIsLoading(true)
      
      // Get the latest generated schedule for the selected slot
      const schedules = await getGeneratedSchedules(selectedSlot)
      
      if (schedules.length === 0) {
        setDashboardData(null)
        return
      }

      const latestSchedule = schedules[0]
      const result = latestSchedule.result

      // Filter teacher schedule by current user's display name
      const teacherName = profile.display_name
      const teacherSchedule = result.teacherSummary?.[teacherName]

      if (!teacherSchedule) {
        setDashboardData(null)
        return
      }

      // Transform data to our format
      const weeklySchedule: TeacherSchedule[] = []
      let totalAssignments = 0
      const roleDistribution = { H: 0, K: 0, F: 0 }
      let examSessions = 0

      Object.entries(teacherSchedule).forEach(([day, assignments]) => {
        (assignments as any[]).forEach((assignment: Assignment) => {
          const period = parseInt(assignment.period.toString())
          const role = assignment.role === 'EXAM' ? 'EXAM' : assignment.role
          const isExam = assignment.role === 'EXAM'
          
          weeklySchedule.push({
            day,
            period,
            time: assignment.time,
            classId: assignment.classId,
            role,
            round: assignment.round,
            isExam,
            teacher: assignment.teacher
          })

          totalAssignments++
          
          if (isExam) {
            examSessions++
          } else {
            roleDistribution[assignment.role as keyof typeof roleDistribution]++
          }
        })
      })

      setDashboardData({
        teacherName,
        weeklySchedule: weeklySchedule.sort((a, b) => {
          const dayOrder = ['월', '화', '수', '목', '금']
          const dayA = dayOrder.indexOf(a.day)
          const dayB = dayOrder.indexOf(b.day)
          if (dayA !== dayB) return dayA - dayB
          return a.period - b.period
        }),
        totalAssignments,
        roleDistribution,
        examSessions
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스케줄 데이터를 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.showToast({
        type: 'error',
        title: '데이터 로딩 실패',
        message: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSlotChange = (slotId: string) => {
    setSelectedSlot(slotId)
  }

  const handleAssignmentClick = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setShowDetailDrawer(true)
  }


  if (isLoading) {
    return <LoadingState message="교사 스케줄을 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadTeacherSchedule} />
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">프로필 없음</h3>
            <p className="text-gray-500">교사 정보를 불러올 수 없습니다.</p>
          </div>
        </div>
      </div>
    )
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
                  <span className="text-gray-400">대시보드</span>
                </li>
                <li>
                  <div className="flex items-center">
                    <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="ml-4 text-gray-500">내 스케줄</span>
                  </div>
                </li>
              </ol>
            </nav>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">교사 스케줄 대시보드</h1>
            <p className="mt-2 text-gray-600">
              {profile.display_name}님의 주간 스케줄을 확인하세요
            </p>
          </div>
        </div>
      </div>

      {/* Slot Selector */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">슬롯 선택</h2>
              <p className="text-sm text-gray-500">스케줄을 확인할 슬롯을 선택하세요</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedSlot}
                onChange={(e) => handleSlotChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">슬롯 선택...</option>
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium text-gray-900">보기 모드</h2>
              <p className="text-sm text-gray-500">캘린더 그리드 또는 타임라인으로 스케줄을 확인하세요</p>
            </div>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                캘린더 그리드
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                타임라인
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      {!selectedSlot ? (
        <EmptyState
          title="슬롯을 선택해주세요"
          description="스케줄을 확인하려면 먼저 슬롯을 선택하세요."
        />
      ) : !dashboardData ? (
        <EmptyState
          title="스케줄 데이터 없음"
          description="선택한 슬롯에 대한 최신 스케줄이 없습니다."
        />
      ) : (
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-blue-600">총 배정</p>
                  <p className="text-2xl font-bold text-blue-900">{dashboardData.totalAssignments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-green-600">홈룸</p>
                  <p className="text-2xl font-bold text-green-900">{dashboardData.roleDistribution.H}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-purple-600">한국어</p>
                  <p className="text-2xl font-bold text-purple-900">{dashboardData.roleDistribution.K}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-red-600">외국어</p>
                  <p className="text-2xl font-bold text-red-900">{dashboardData.roleDistribution.F}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule View */}
          <FilteredScheduleView
            result={dashboardData.weeklySchedule.length > 0 ? {
              classSummary: {},
              teacherSummary: {
                [dashboardData.teacherName]: {
                  월: dashboardData.weeklySchedule.filter(s => s.day === '월').map(s => ({
                    teacher: dashboardData.teacherName,
                    role: s.role as 'H' | 'K' | 'F',
                    classId: s.classId,
                    round: s.round as 1 | 2 | 3 | 4,
                    period: s.period as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
                    time: s.time,
                    isExam: s.isExam
                  })),
                  수: dashboardData.weeklySchedule.filter(s => s.day === '수').map(s => ({
                    teacher: dashboardData.teacherName,
                    role: s.role as 'H' | 'K' | 'F',
                    classId: s.classId,
                    round: s.round as 1 | 2 | 3 | 4,
                    period: s.period as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
                    time: s.time,
                    isExam: s.isExam
                  })),
                  금: dashboardData.weeklySchedule.filter(s => s.day === '금').map(s => ({
                    teacher: dashboardData.teacherName,
                    role: s.role as 'H' | 'K' | 'F',
                    classId: s.classId,
                    round: s.round as 1 | 2 | 3 | 4,
                    period: s.period as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
                    time: s.time,
                    isExam: s.isExam
                  }))
                }
              },
              dayGrid: {
                월: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] },
                수: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] },
                금: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] }
              },
              warnings: [],
              metrics: {
                generationTimeMs: 0,
                totalAssignments: 0,
                assignedCount: 0,
                unassignedCount: 0,
                warningsCount: 0,
                teachersCount: 0,
                classesCount: 0
              }
            } : null}
            showFilters={true}
            showActiveChips={true}
          >
            {(filteredResult) => {
              if (!filteredResult) {
                return (
                  <EmptyState
                    title="스케줄 데이터 없음"
                    description="선택한 슬롯에 대한 최신 스케줄이 없습니다."
                  />
                )
              }

              const filteredSchedule = filteredResult.teacherSummary[dashboardData.teacherName] || {}
              const transformedSchedule = Object.entries(filteredSchedule).flatMap(([day, dayAssignments]) => 
                (dayAssignments as unknown as any[]).map((assignment: any) => ({
                  day: day,
                  period: parseInt(assignment.period.toString()),
                  time: assignment.time,
                  classId: assignment.classId,
                  role: assignment.role,
                  round: assignment.round,
                  isExam: assignment.role === 'EXAM',
                  teacher: assignment.teacher
                }))
              )

              return viewMode === 'grid' ? (
                <TeacherCalendarGrid 
                  schedule={transformedSchedule}
                  onAssignmentClick={handleAssignmentClick}
                />
              ) : (
                <TeacherTimelineView 
                  schedule={transformedSchedule}
                  onAssignmentClick={handleAssignmentClick}
                />
              )
            }}
          </FilteredScheduleView>
        </div>
      )}

      {/* Detail Drawer */}
      {showDetailDrawer && selectedAssignment && (
        <TeacherScheduleDetailDrawer
          assignment={selectedAssignment}
          isOpen={showDetailDrawer}
          onClose={() => setShowDetailDrawer(false)}
        />
      )}
    </div>
  )
}
