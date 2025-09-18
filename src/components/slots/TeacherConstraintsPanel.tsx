// Teacher constraints management panel
// import { useState } from 'react'

interface Teacher {
  name: string
  kind: 'homeroomKorean' | 'foreign'
}

interface Teachers {
  homeroomKoreanPool: Teacher[]
  foreignPool: Teacher[]
}

interface TeacherConstraints {
  [teacherName: string]: {
    teacherName: string
    unavailablePeriods: number[]
    homeroomDisabled: boolean
    maxHomerooms?: number
  }
}

interface TeacherConstraintsPanelProps {
  constraints: TeacherConstraints
  teachers: Teachers
  onUpdate: (constraints: TeacherConstraints) => void
  onSave: () => void
  isSaving: boolean
}

export function TeacherConstraintsPanel({ constraints, teachers, onUpdate, onSave, isSaving }: TeacherConstraintsPanelProps) {
  const allTeachers = [...teachers.homeroomKoreanPool, ...teachers.foreignPool]

  const updateTeacherConstraint = (teacherName: string, field: keyof TeacherConstraints[string], value: any) => {
    const currentConstraints = constraints[teacherName] || {
      unavailablePeriods: [],
      homeroomDisabled: false,
      maxHomerooms: undefined
    }

    onUpdate({
      ...constraints,
      [teacherName]: {
        ...currentConstraints,
        [field]: value
      }
    })
  }

  const toggleUnavailable = (teacherName: string, timeSlot: string) => {
    const currentUnavailable = constraints[teacherName]?.unavailablePeriods || []
    const periodNumber = parseInt(timeSlot.split('|')[1]) // Extract period number from "day|period" format
    const newUnavailable = currentUnavailable.includes(periodNumber)
      ? currentUnavailable.filter(slot => slot !== periodNumber)
      : [...currentUnavailable, periodNumber]

    updateTeacherConstraint(teacherName, 'unavailablePeriods', newUnavailable)
  }

  // Generate time slots for the day group
  const generateTimeSlots = () => {
    const days = ['월', '화', '수', '목', '금']
    const periods = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    
    return days.map(day => 
      periods.map(period => `${day}|${period}`)
    ).flat()
  }

  const timeSlots = generateTimeSlots()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">교사 제약 조건</h3>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      {allTeachers.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          먼저 교사 풀에 교사를 추가해주세요.
        </div>
      ) : (
        <div className="space-y-6">
          {allTeachers.map(teacher => {
            const teacherConstraints = constraints[teacher.name] || {
              unavailablePeriods: [],
              homeroomDisabled: false,
              maxHomerooms: undefined
            }

            return (
              <div key={teacher.name} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    {teacher.name}
                    <span className={`ml-2 px-2 py-1 text-xs rounded ${
                      teacher.kind === 'homeroomKorean' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {teacher.kind === 'homeroomKorean' ? '홈룸/한국어' : '외국어'}
                    </span>
                  </h4>
                </div>

                <div className="space-y-4">
                  {/* Homeroom Settings (only for homeroomKorean teachers) */}
                  {teacher.kind === 'homeroomKorean' && (
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id={`homeroom-disabled-${teacher.name}`}
                          checked={teacherConstraints.homeroomDisabled}
                          onChange={(e) => updateTeacherConstraint(teacher.name, 'homeroomDisabled', e.target.checked)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`homeroom-disabled-${teacher.name}`} className="ml-2 text-sm text-gray-700">
                          홈룸 담당 비활성화
                        </label>
                      </div>

                      <div>
                        <label htmlFor={`max-homerooms-${teacher.name}`} className="block text-sm font-medium text-gray-700 mb-1">
                          최대 홈룸 수
                        </label>
                        <input
                          type="number"
                          id={`max-homerooms-${teacher.name}`}
                          min="0"
                          max="10"
                          value={teacherConstraints.maxHomerooms || ''}
                          onChange={(e) => updateTeacherConstraint(
                            teacher.name, 
                            'maxHomerooms', 
                            e.target.value ? parseInt(e.target.value) : undefined
                          )}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="제한 없음"
                        />
                      </div>
                    </div>
                  )}

                  {/* Unavailable Time Slots */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      사용 불가 시간
                    </label>
                    <div className="grid grid-cols-10 gap-1 max-h-40 overflow-y-auto border border-gray-200 rounded p-2">
                      {timeSlots.map(timeSlot => {
                        const periodNumber = parseInt(timeSlot.split('|')[1])
                        const isUnavailable = teacherConstraints.unavailablePeriods.includes(periodNumber)
                        return (
                          <button
                            key={timeSlot}
                            onClick={() => toggleUnavailable(teacher.name, timeSlot)}
                            className={`text-xs p-1 rounded ${
                              isUnavailable
                                ? 'bg-red-100 text-red-800 hover:bg-red-200'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                            title={timeSlot}
                          >
                            {timeSlot}
                          </button>
                        )
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      클릭하여 사용 불가 시간을 설정/해제하세요
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 p-3 rounded text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-gray-600">사용 불가 시간:</span>
                        <span className="ml-1 font-medium">{teacherConstraints.unavailablePeriods.length}개</span>
                      </div>
                      {teacher.kind === 'homeroomKorean' && (
                        <div>
                          <span className="text-gray-600">최대 홈룸:</span>
                          <span className="ml-1 font-medium">
                            {teacherConstraints.maxHomerooms || '제한 없음'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
