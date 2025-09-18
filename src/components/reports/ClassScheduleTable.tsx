import type { ClassReportsData } from '../../pages/ClassReportsPage'

interface ClassScheduleTableProps {
  data: ClassReportsData
  isPrintMode?: boolean
}

export function ClassScheduleTable({ data, isPrintMode = false }: ClassScheduleTableProps) {
  const days = ['월', '수', '금'] // MWF only for class reports
  const periods = [1, 2, 3, 4, 5, 6, 7, 8]

  const getRoleColor = (role: string) => {
    if (isPrintMode) {
      switch (role) {
        case 'H':
          return 'role-h'
        case 'K':
          return 'role-k'
        case 'F':
          return 'role-f'
        case 'EXAM':
          return 'role-exam'
        default:
          return 'role-h'
      }
    } else {
      switch (role) {
        case 'H':
          return 'text-green-600 bg-green-50'
        case 'K':
          return 'text-purple-600 bg-purple-50'
        case 'F':
          return 'text-blue-600 bg-blue-50'
        case 'EXAM':
          return 'text-red-600 bg-red-50'
        default:
          return 'text-gray-600 bg-gray-50'
      }
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'H':
        return '담임'
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

  const renderClassRow = (classData: any) => {
    return (
      <tr key={classData.classId} className="border-b border-gray-200">
        {/* Class ID Column */}
        <td className="px-4 py-3 text-center font-medium text-gray-900 bg-gray-50">
          {classData.classId}
        </td>

        {/* Day Columns */}
        {days.map(day => {
          const daySchedule = classData.schedule[day] || {}
          const examInfo = data.examInfo[classData.classId]
          const hasExam = examInfo?.periods?.length > 0

          return (
            <td key={day} className={`px-2 py-3 ${isPrintMode ? 'class-schedule-cell' : ''}`}>
              <div className="space-y-1">
                {/* Regular Periods */}
                {periods.map(period => {
                  const assignment = daySchedule[period]
                  
                  return (
                    <div key={period} className="text-xs">
                      {assignment ? (
                        <div className={`px-2 py-1 rounded ${getRoleColor(assignment.role)} ${isPrintMode ? 'assignment-block' : ''}`}>
                          <div className={`font-medium ${isPrintMode ? 'teacher-name' : ''}`}>
                            {assignment.teacher}
                          </div>
                          <div className={`${isPrintMode ? 'role-label' : 'opacity-75'}`}>
                            {getRoleLabel(assignment.role)}
                          </div>
                          <div className={`${isPrintMode ? 'time' : 'opacity-60'}`}>
                            {formatTime(assignment.time)}
                          </div>
                        </div>
                      ) : (
                        <div className="px-2 py-1 text-gray-400 text-center">
                          -
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Exam Information Row */}
                {hasExam && examInfo?.periods?.some(p => 
                  Object.keys(daySchedule).includes(p.toString())
                ) && (
                  <div className={`mt-2 pt-2 border-t border-gray-200 ${isPrintMode ? 'exam-info' : ''}`}>
                    <div className={`text-xs font-medium ${isPrintMode ? 'text-black' : 'text-red-600'}`}>
                      시험: {examInfo.invigilator || '미배정'}
                    </div>
                  </div>
                )}
              </div>
            </td>
          )
        })}
      </tr>
    )
  }

  return (
    <div className={isPrintMode ? 'print-table' : ''}>
      {/* Print Header */}
      {isPrintMode && (
        <div className="print-header mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            클래스 스케줄 리포트
          </h1>
          <div className="text-sm text-gray-600 space-y-1">
            <div>슬롯: {data.slotName}</div>
            <div>주차: {data.weekDate}</div>
            <div>인쇄일: {new Date().toLocaleDateString('ko-KR')}</div>
          </div>
          <hr className="my-4 border-gray-300" />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={`min-w-full ${isPrintMode ? 'print-table-styles' : 'border-collapse'}`}>
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-900 border border-gray-300">
                클래스
              </th>
              {days.map(day => (
                <th key={day} className="px-2 py-3 text-center text-sm font-medium text-gray-900 border border-gray-300">
                  {day}요일
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.classes.map(renderClassRow)}
          </tbody>
        </table>
      </div>

      {/* Print Footer */}
      {isPrintMode && (
        <div className="print-footer mt-6 pt-4 border-t border-gray-300">
          <div className="print-legend space-y-1">
            <div>
              <strong>범례:</strong>
              <span className="mx-2">담임</span>
              <span className="mx-2">한국어</span>
              <span className="mx-2">외국어</span>
              <span className="mx-2">시험</span>
            </div>
            <div>총 {data.classes.length}개 클래스</div>
          </div>
        </div>
      )}

      {/* Non-print Summary */}
      {!isPrintMode && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              총 {data.classes.length}개 클래스의 스케줄
            </div>
            <div className="flex items-center space-x-4">
              <span className="flex items-center">
                <span className="w-3 h-3 bg-green-100 rounded mr-1"></span>
                담임
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-purple-100 rounded mr-1"></span>
                한국어
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-blue-100 rounded mr-1"></span>
                외국어
              </span>
              <span className="flex items-center">
                <span className="w-3 h-3 bg-red-100 rounded mr-1"></span>
                시험
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
