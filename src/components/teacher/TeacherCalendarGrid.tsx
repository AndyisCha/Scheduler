import { useState } from 'react'
import type { TeacherSchedule } from '../../pages/TeacherDashboardPage'
import type { Assignment } from '../../types/scheduler'

interface TeacherCalendarGridProps {
  schedule: TeacherSchedule[]
  onAssignmentClick: (assignment: Assignment) => void
}

export function TeacherCalendarGrid({ schedule, onAssignmentClick }: TeacherCalendarGridProps) {
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)

  const days = ['월', '화', '수', '목', '금']
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  const getAssignmentForSlot = (day: string, period: number) => {
    return schedule.find(s => s.day === day && s.period === period)
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

  const cellKey = (day: string, period: number) => `${day}-${period}`

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">주간 스케줄 그리드</h2>
        <p className="text-sm text-gray-500">월요일부터 금요일까지의 교시별 배정 현황</p>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-100 border border-green-200 rounded mr-2"></div>
            <span className="text-gray-700">홈룸 (H)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded mr-2"></div>
            <span className="text-gray-700">한국어 (K)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded mr-2"></div>
            <span className="text-gray-700">외국어 (F)</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-100 border border-red-200 rounded mr-2"></div>
            <span className="text-gray-700">시험 (EXAM)</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                교시
              </th>
              {days.map((day) => (
                <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-32">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {periods.map((period) => (
              <tr key={period} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900 text-center">
                  {period}교시
                </td>
                {days.map((day) => {
                  const assignment = getAssignmentForSlot(day, period)
                  const cellId = cellKey(day, period)
                  const isHovered = hoveredCell === cellId

                  return (
                    <td key={cellId} className="px-2 py-3 text-center">
                      <div
                        className={`relative min-h-16 border rounded-lg transition-all duration-200 cursor-pointer ${
                          assignment
                            ? `${getRoleColor(assignment.role)} hover:shadow-md`
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        } ${isHovered ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}
                        onMouseEnter={() => setHoveredCell(cellId)}
                        onMouseLeave={() => setHoveredCell(null)}
                        onClick={() => {
                          if (assignment) {
                            onAssignmentClick(assignment as Assignment)
                          }
                        }}
                      >
                        {assignment ? (
                          <div className="p-2">
                            <div className="text-xs font-medium mb-1">
                              {assignment.classId}
                            </div>
                            <div className="text-xs opacity-75 mb-1">
                              {getRoleLabel(assignment.role)}
                            </div>
                            <div className="text-xs opacity-60">
                              {formatTime(assignment.time)}
                            </div>
                            {assignment.isExam && (
                              <div className="absolute top-1 right-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-16 text-gray-400 text-xs">
                            비어있음
                          </div>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-medium text-gray-900">{schedule.filter(s => s.role === 'H').length}</div>
            <div className="text-gray-500">홈룸 배정</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{schedule.filter(s => s.role === 'K').length}</div>
            <div className="text-gray-500">한국어 배정</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{schedule.filter(s => s.role === 'F').length}</div>
            <div className="text-gray-500">외국어 배정</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-gray-900">{schedule.filter(s => s.isExam).length}</div>
            <div className="text-gray-500">시험 감독</div>
          </div>
        </div>
      </div>
    </div>
  )
}


