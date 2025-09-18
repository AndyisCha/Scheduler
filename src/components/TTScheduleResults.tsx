// TT Schedule Results with tabs for Class/Teacher/Day views
import { VirtualizedTable } from './common/VirtualizedTable'
import { FilteredScheduleView } from './FilteredScheduleView'
import { AccessibleTabs } from './a11y/AccessibleTabs'
import type { UnifiedWeekResult } from '../utils/unifiedGenerator'

interface TTScheduleResultsProps {
  result: UnifiedWeekResult
}

export function TTScheduleResults({ result }: TTScheduleResultsProps) {

  const renderClassView = (classSummary = result.classSummary) => {
    const classes = Object.keys(classSummary)
    
    // Use virtualization for large datasets
    if (classes.length > 200) {
      const classData = classes.map(classId => {
        const assignments = classSummary[classId]
        const totalAssignments = Object.values(assignments).flat().length
        const unassignedCount = Object.values(assignments).flat().filter(a => a.teacher === '(미배정)').length
        
        return {
          classId,
          totalAssignments,
          unassignedCount,
          assignedCount: totalAssignments - unassignedCount,
          daysWithAssignments: Object.keys(assignments).length
        }
      })

      return (
        <VirtualizedTable
          data={classData}
          columns={[
            { key: 'classId', label: '클래스', width: 120 },
            { key: 'assignedCount', label: '배정됨', width: 100 },
            { key: 'unassignedCount', label: '미배정', width: 100 },
            { key: 'totalAssignments', label: '총 수업', width: 100 },
            { key: 'daysWithAssignments', label: '활성 요일', width: 100 }
          ]}
          height={400}
        />
      )
    }
    
    return (
      <div className="space-y-4">
        {classes.map(classId => (
          <div key={classId} className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{classId}</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {(['월', '화', '수', '목', '금'] as const).map(day => (
                <div key={day} className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">{day}</h5>
                  <div className="space-y-1">
                    {result.classSummary[classId]?.[day]?.map((assignment, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-medium">{assignment.period}교시</div>
                        <div className="text-gray-600">{assignment.time}</div>
                        <div className={`font-medium ${
                          assignment.role === 'EXAM' ? 'text-purple-600' :
                          assignment.role === 'H' ? 'text-blue-600' :
                          assignment.role === 'K' ? 'text-green-600' :
                          'text-orange-600'
                        }`}>
                          {assignment.role} - {assignment.teacher}
                        </div>
                      </div>
                    )) || <div className="text-xs text-gray-400">배정 없음</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderTeacherView = (teacherSummary = result.teacherSummary) => {
    const teachers = Object.keys(teacherSummary)
    
    return (
      <div className="space-y-4">
        {teachers.map(teacher => (
          <div key={teacher} className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{teacher}</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {(['월', '화', '수', '목', '금'] as const).map(day => (
                <div key={day} className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">{day}</h5>
                  <div className="space-y-1">
                    {teacherSummary[teacher]?.[day]?.map((assignment, idx) => (
                      <div key={idx} className="text-xs p-2 bg-gray-50 rounded">
                        <div className="font-medium">{assignment.period}교시</div>
                        <div className="text-gray-600">{assignment.time}</div>
                        <div className={`font-medium ${
                          assignment.role === 'EXAM' ? 'text-purple-600' :
                          assignment.role === 'H' ? 'text-blue-600' :
                          assignment.role === 'K' ? 'text-green-600' :
                          'text-orange-600'
                        }`}>
                          {assignment.role} - {assignment.classId}
                        </div>
                      </div>
                    )) || <div className="text-xs text-gray-400">배정 없음</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const renderDayView = (dayGrid = result.dayGrid) => {
    return (
      <div className="space-y-4">
        {(['월', '화', '수', '목', '금'] as const).map(day => (
          <div key={day} className="border rounded-lg p-4">
            <h4 className="font-medium mb-3">{day}요일</h4>
            <div className="space-y-2">
              {Object.keys(dayGrid[day] || {}).map(period => (
                <div key={period} className="p-3 bg-gray-50 rounded">
                  <h5 className="text-sm font-medium mb-2">{period}교시</h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {dayGrid[day]?.[parseInt(period)]?.map((assignment, idx) => (
                      <div key={idx} className="text-xs p-2 bg-white rounded border">
                        <div className="font-medium">{assignment.classId}</div>
                        <div className={`font-medium ${
                          assignment.role === 'EXAM' ? 'text-purple-600' :
                          assignment.role === 'H' ? 'text-blue-600' :
                          assignment.role === 'K' ? 'text-green-600' :
                          'text-orange-600'
                        }`}>
                          {assignment.role} - {assignment.teacher}
                        </div>
                        <div className="text-gray-600">{assignment.time}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <FilteredScheduleView
      result={result}
      showFilters={true}
      showActiveChips={true}
    >
      {(filteredResult) => (
        <AccessibleTabs
          tabs={[
            {
              id: 'class',
              label: '반별 보기',
              content: filteredResult ? renderClassView() : renderClassView()
            },
            {
              id: 'teacher',
              label: '교사별 보기',
              content: filteredResult ? renderTeacherView() : renderTeacherView()
            },
            {
              id: 'day',
              label: '요일별 보기',
              content: filteredResult ? renderDayView() : renderDayView()
            }
          ]}
          defaultActiveTab="class"
          aria-label="TT 스케줄 보기 옵션"
          className="bg-white rounded-lg shadow"
        />
      )}
    </FilteredScheduleView>
  )
}
