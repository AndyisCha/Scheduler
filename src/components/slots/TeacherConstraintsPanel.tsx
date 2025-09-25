// Teacher constraints management panel
import { useState } from 'react'

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
}

export function TeacherConstraintsPanel({ constraints, teachers, onUpdate }: TeacherConstraintsPanelProps) {
  const allTeachers = [...teachers.homeroomKoreanPool, ...teachers.foreignPool]
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null)

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

  const addTeacherConstraint = () => {
    if (selectedTeacher && !constraints[selectedTeacher]) {
      updateTeacherConstraint(selectedTeacher, 'unavailablePeriods', [])
    }
  }

  const removeTeacherConstraint = (teacherName: string) => {
    const newConstraints = { ...constraints }
    delete newConstraints[teacherName]
    onUpdate(newConstraints)
  }


  return (
    <section className="section-card constraints-section">
      <h2>선생님 제약 조건</h2>
      <p className="desc">각 선생님의 스케줄링 제약 조건을 설정하세요</p>

      {/* 선생님 선택 및 추가 */}
      <div className="control-row">
        <select
          value={selectedTeacher || ''}
          onChange={(e) => setSelectedTeacher(e.target.value || null)}
        >
          <option value="">선생님을 선택하세요</option>
          {allTeachers.map(teacher => (
            <option key={teacher.name} value={teacher.name}>
              {teacher.name} ({teacher.kind === 'homeroomKorean' ? '홈룸/한국어' : '외국어'})
            </option>
          ))}
        </select>
        <button
          onClick={addTeacherConstraint}
          disabled={!selectedTeacher || !!constraints[selectedTeacher]}
          className="btn primary"
        >
          제약 조건 추가
        </button>
      </div>

      {allTeachers.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-gray-400 font-medium">먼저 선생님 풀에 선생님을 추가해주세요</p>
          <p className="text-gray-500 text-sm mt-1">Teachers 탭에서 선생님을 추가한 후 제약 조건을 설정할 수 있습니다</p>
        </div>
      ) : (
        <div>
          {Object.keys(constraints).map(teacherName => {
            const teacher = allTeachers.find(t => t.name === teacherName)
            if (!teacher) return null

            const teacherConstraints = constraints[teacherName]

            return (
              <div key={teacherName} className="constraint-card">
                {/* 선생님 카드 헤더 */}
                <div className="card-head">
                  <span className="name">{teacher.name}</span>
                  <button
                    onClick={() => removeTeacherConstraint(teacherName)}
                    className="remove"
                    title="제약 조건 제거"
                  >
                    제거
                  </button>
                </div>

                {/* Homeroom Settings (only for homeroomKorean teachers) */}
                {teacher.kind === 'homeroomKorean' && (
                  <>
                    <div className="field-row">
                      <label htmlFor={`homeroom-disabled-${teacher.name}`}>
                        홈룸 담당 비활성화
                      </label>
                      <input
                        type="checkbox"
                        id={`homeroom-disabled-${teacher.name}`}
                        checked={teacherConstraints.homeroomDisabled}
                        onChange={(e) => updateTeacherConstraint(teacher.name, 'homeroomDisabled', e.target.checked)}
                      />
                    </div>

                    <div className="field-row">
                      <label htmlFor={`max-homerooms-${teacher.name}`}>
                        최대 홈룸 담당 수
                      </label>
                      <div className="flex gap-2">
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
                          placeholder="제한 없음"
                        />
                        <button
                          onClick={() => updateTeacherConstraint(teacher.name, 'maxHomerooms', undefined)}
                          className="btn"
                        >
                          제한 없음
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* 사용 불가 시간 설정 */}
                <div className="time-grid">
                  <table>
                    <thead>
                      <tr>
                        <th>교시</th>
                        {['월', '화', '수', '목', '금'].map(day => (
                          <th key={day}>
                            <div className="flex items-center justify-center gap-2">
                              {day}요일
                              <button
                                onClick={() => {
                                  const periods = [1, 2, 3, 4, 5, 6, 7, 8];
                                  const currentUnavailable = teacherConstraints.unavailablePeriods || [];
                                  const shouldSelectAll = periods.some(p => !currentUnavailable.includes(p));
                                  
                                  const newUnavailable = shouldSelectAll
                                    ? [...new Set([...currentUnavailable, ...periods])]
                                    : currentUnavailable.filter(p => !periods.includes(p));
                                  
                                  updateTeacherConstraint(teacherName, 'unavailablePeriods', newUnavailable);
                                }}
                                className="text-xs bg-blue-700 hover:bg-blue-800 px-2 py-1 rounded transition-colors"
                                title={`${day}요일 전체 선택/해제`}
                              >
                                전체
                              </button>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(period => (
                        <tr key={period}>
                          <td>{period}교시</td>
                          {['월', '화', '수', '목', '금'].map(day => {
                            const timeSlot = `${day}|${period}`;
                            const periodNumber = parseInt(timeSlot.split('|')[1]);
                            const isUnavailable = teacherConstraints.unavailablePeriods.includes(periodNumber);
                            return (
                              <td key={timeSlot}>
                                <button
                                  onClick={(e) => {
                                    toggleUnavailable(teacher.name, timeSlot);
                                    e.currentTarget.classList.toggle('is-selected');
                                  }}
                                  className={`time-cell ${isUnavailable ? 'is-selected' : ''}`}
                                  title={`${day}요일 ${period}교시 - ${isUnavailable ? '사용 불가' : '사용 가능'}`}
                                >
                                  {isUnavailable ? '✕' : '○'}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 요약 정보 */}
                <div className="bg-gray-700 p-4 rounded-lg text-sm border border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">사용 불가 시간:</span>
                      <span className="font-medium text-white bg-red-600 px-2 py-1 rounded-full text-xs">
                        {teacherConstraints.unavailablePeriods.length}개
                      </span>
                    </div>
                    {teacher.kind === 'homeroomKorean' && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400">최대 홈룸:</span>
                        <span className="font-medium text-white bg-blue-600 px-2 py-1 rounded-full text-xs">
                          {teacherConstraints.maxHomerooms || '제한 없음'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 하단 액션 버튼 */}
                <div className="footer-actions">
                  <button
                    onClick={addTeacherConstraint}
                    disabled={!selectedTeacher || !!constraints[selectedTeacher]}
                    className="btn primary"
                  >
                    {selectedTeacher && !constraints[selectedTeacher] 
                      ? `${selectedTeacher} 선생님 제약 조건 추가`
                      : '선생님을 선택하여 제약 조건 추가'
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
