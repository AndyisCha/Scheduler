import { useState } from 'react'
import type { TeacherSchedule } from '../../pages/TeacherDashboardPage'
import type { Assignment } from '../../types/scheduler'

interface TeacherTimelineViewProps {
  schedule: TeacherSchedule[]
  onAssignmentClick: (assignment: Assignment) => void
}

export function TeacherTimelineView({ schedule, onAssignmentClick }: TeacherTimelineViewProps) {
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set(['월', '화', '수', '목', '금']))

  const days = ['월', '화', '수', '목', '금']

  const getScheduleByDay = (day: string) => {
    return schedule
      .filter(s => s.day === day)
      .sort((a, b) => a.period - b.period)
  }

  const toggleDayExpansion = (day: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(day)) {
      newExpanded.delete(day)
    } else {
      newExpanded.add(day)
    }
    setExpandedDays(newExpanded)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'H':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'K':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'F':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EXAM':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'H':
        return '홈룸'
      case 'K':
        return '한국어'
      case 'F':
        return '외국어'
      case 'EXAM':
        return '시험'
      default:
        return role
    }
  }

  const formatTime = (time: string) => {
    return time
  }

  const getDaySummary = (day: string) => {
    const daySchedule = getScheduleByDay(day)
    const roleCounts = daySchedule.reduce((acc, s) => {
      acc[s.role] = (acc[s.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: daySchedule.length,
      roles: roleCounts,
      hasExam: daySchedule.some(s => s.isExam)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">주간 스케줄 타임라인</h2>
        <p className="text-sm text-gray-500">요일별로 정렬된 스케줄 목록</p>
      </div>

      <div className="divide-y divide-gray-200">
        {days.map((day) => {
          const daySchedule = getScheduleByDay(day)
          const summary = getDaySummary(day)
          const isExpanded = expandedDays.has(day)

          return (
            <div key={day} className="p-6">
              {/* Day Header */}
              <button
                onClick={() => toggleDayExpansion(day)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-medium text-gray-900">{day}요일</h3>
                    {summary.hasExam && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        시험
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>총 {summary.total}개 배정</span>
                    {Object.entries(summary.roles).map(([role, count]) => (
                      <span key={role} className="flex items-center space-x-1">
                        <div className={`w-3 h-3 rounded-full ${getRoleColor(role).split(' ')[0]}`}></div>
                        <span>{getRoleLabel(role)} {count}</span>
                      </span>
                    ))}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    isExpanded ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Day Schedule */}
              {isExpanded && (
                <div className="mt-4 space-y-2">
                  {daySchedule.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="mt-2">배정된 수업이 없습니다</p>
                    </div>
                  ) : (
                    daySchedule.map((assignment, index) => (
                      <div
                        key={`${day}-${assignment.period}-${index}`}
                        className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${getRoleColor(assignment.role)}`}
                        onClick={() => onAssignmentClick(assignment as Assignment)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-sm font-medium text-gray-900">
                              {assignment.period}교시
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-gray-900">
                                {assignment.classId}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(assignment.role)}`}>
                                {getRoleLabel(assignment.role)}
                              </span>
                              {assignment.isExam && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  시험 감독
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                              <span>시간: {formatTime(assignment.time)}</span>
                              <span>라운드: R{assignment.round}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Weekly Summary */}
      <div className="p-6 bg-gray-50 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">주간 요약</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {days.map((day) => {
            const summary = getDaySummary(day)
            return (
              <div key={day} className="text-center">
                <div className="text-lg font-bold text-gray-900">{summary.total}</div>
                <div className="text-sm text-gray-500">{day}요일</div>
                {summary.hasExam && (
                  <div className="mt-1">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      시험 있음
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


