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
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`homeroom-disabled-${teacher.name}`}
                            checked={teacherConstraints.homeroomDisabled}
                            onChange={(e) => updateTeacherConstraint(teacher.name, 'homeroomDisabled', e.target.checked)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                          />
                          <label htmlFor={`homeroom-disabled-${teacher.name}`} className="ml-3 text-sm font-medium text-gray-700">
                            홈룸 담당 비활성화
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 mt-2 ml-8">
                          체크하면 이 교사는 홈룸을 담당하지 않습니다.
                        </p>
                      </div>

                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <label htmlFor={`max-homerooms-${teacher.name}`} className="block text-sm font-medium text-gray-700 mb-2">
                          최대 홈룸 담당 수
                        </label>
                        <div className="flex items-center space-x-3">
                          <input
                            type="number"
                            id={`max-homerooms-${teacher.name}`}
                            min="0"
                            max="20"
                            value={teacherConstraints.maxHomerooms || ''}
                            onChange={(e) => updateTeacherConstraint(
                              teacher.name, 
                              'maxHomerooms', 
                              e.target.value ? parseInt(e.target.value) : undefined
                            )}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                            placeholder="제한 없음"
                          />
                          <button
                            onClick={() => updateTeacherConstraint(teacher.name, 'maxHomerooms', undefined)}
                            className="px-3 py-2 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            제한 없음
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          이 교사가 담당할 수 있는 최대 홈룸 수를 설정합니다. 비워두면 제한이 없습니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Unavailable Time Slots */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      사용 불가 시간 설정
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {['월', '화', '수', '목', '금'].map(day => (
                          <div key={day} className="text-center">
                            <div className="text-sm font-medium text-gray-700 mb-2">{day}</div>
                            <div className="space-y-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8].map(period => {
                                const timeSlot = `${day}|${period}`;
                                const periodNumber = parseInt(timeSlot.split('|')[1]);
                                const isUnavailable = teacherConstraints.unavailablePeriods.includes(periodNumber);
                                return (
                                  <button
                                    key={timeSlot}
                                    onClick={() => toggleUnavailable(teacher.name, timeSlot)}
                                    className={`w-full h-8 text-xs rounded-md transition-colors ${
                                      isUnavailable
                                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-sm'
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                    title={`${day}요일 ${period}교시`}
                                  >
                                    {period}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-white border border-gray-200 rounded mr-1"></div>
                            <span>사용 가능</span>
                          </div>
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                            <span>사용 불가</span>
                          </div>
                        </div>
                        <span>클릭하여 토글</span>
                      </div>
                    </div>
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
