import React, { useState, useEffect } from 'react'
import { getTeacherConstraints, upsertTeacherConstraint, deleteTeacherConstraint } from '../../services/db/slots'
import { useToast } from '../Toast'
import { LoadingState } from '../ErrorStates'
import type { DbTeacherConstraint } from '../../services/db/types'
import type { SlotConfig } from '../../engine/types'

interface ConstraintsTabProps {
  slotId: string
  slotConfig: SlotConfig
  onUpdate: (config: SlotConfig) => void
}

const DAYS = ['월', '화', '수', '목', '금'] as const
const PERIODS = [1, 2, 3, 4, 5, 6] as const

export function ConstraintsTab({ slotId, slotConfig, onUpdate }: ConstraintsTabProps) {
  const [constraints, setConstraints] = useState<DbTeacherConstraint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  const toast = useToast()

  useEffect(() => {
    loadConstraints()
  }, [slotId])

  const loadConstraints = async () => {
    setIsLoading(true)
    try {
      const constraintsData = await getTeacherConstraints(slotId)
      setConstraints(constraintsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '제약 조건을 불러오는 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getAvailableTeachers = () => {
    return [
      ...slotConfig.teachers.homeroomKoreanPool,
      ...slotConfig.teachers.foreignPool
    ].filter(name => !constraints.some(c => c.teacher_name === name))
  }

  const handleAddConstraint = async () => {
    if (!selectedTeacher) {
      toast.error('선생님을 선택해주세요.')
      return
    }

    setIsSaving(true)
    
    try {
      const newConstraint = await upsertTeacherConstraint(slotId, selectedTeacher, {
        homeroom_disabled: false,
        max_homerooms: 0,
        unavailable: []
      })
      
      setConstraints(prev => [...prev, newConstraint])
      
      // Update slot config
      onUpdate({
        ...slotConfig,
        teacherConstraints: {
          ...slotConfig.teacherConstraints,
          [selectedTeacher]: {
            teacherName: selectedTeacher,
            unavailablePeriods: [],
            homeroomDisabled: false,
            maxHomerooms: 0
          }
        }
      })
      
      setSelectedTeacher('')
      toast.success('제약 조건이 추가되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '제약 조건 추가 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUpdateConstraint = async (constraintId: string, teacherName: string, updates: {
    homeroom_disabled?: boolean
    max_homerooms?: number
    unavailable?: string[]
  }) => {
    try {
      const updatedConstraint = await upsertTeacherConstraint(slotId, teacherName, {
        homeroom_disabled: updates.homeroom_disabled ?? false,
        max_homerooms: updates.max_homerooms ?? 0,
        unavailable: updates.unavailable ?? []
      })
      
      setConstraints(prev => prev.map(c => c.id === constraintId ? updatedConstraint : c))
      
      // Update slot config
      onUpdate({
        ...slotConfig,
        teacherConstraints: {
          ...slotConfig.teacherConstraints,
          [teacherName]: {
            teacherName: teacherName,
            unavailablePeriods: (updatedConstraint.unavailable || []).map(Number),
            homeroomDisabled: updatedConstraint.homeroom_disabled,
            maxHomerooms: updatedConstraint.max_homerooms
          }
        }
      })
      
      toast.success('제약 조건이 업데이트되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '제약 조건 업데이트 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  const handleDeleteConstraint = async (constraintId: string, teacherName: string) => {
    if (!window.confirm(`${teacherName} 선생님의 제약 조건을 삭제하시겠습니까?`)) {
      return
    }

    try {
      await deleteTeacherConstraint(constraintId)
      setConstraints(prev => prev.filter(c => c.id !== constraintId))
      
      // Update slot config
      const newConstraints = { ...slotConfig.teacherConstraints }
      delete newConstraints[teacherName]
      onUpdate({
        ...slotConfig,
        teacherConstraints: newConstraints
      })
      
      toast.success('제약 조건이 삭제되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '제약 조건 삭제 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  const toggleUnavailable = (constraint: DbTeacherConstraint, day: string, period: number) => {
    const unavailableStr = `${day}|${period}`
    const newUnavailable = constraint.unavailable.includes(unavailableStr)
      ? constraint.unavailable.filter(u => u !== unavailableStr)
      : [...constraint.unavailable, unavailableStr]
    
    handleUpdateConstraint(constraint.id, constraint.teacher_name, {
      unavailable: newUnavailable
    })
  }

  if (isLoading) {
    return <LoadingState message="제약 조건을 불러오는 중..." />
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">선생님 제약 조건</h3>
        <p className="text-sm text-gray-600">
          각 선생님의 스케줄링 제약 조건을 설정하세요
        </p>
      </div>

      {/* Add Constraint */}
      <div className="mb-8 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="block w-64 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            disabled={isSaving}
          >
            <option value="">선생님을 선택하세요</option>
            {getAvailableTeachers().map(teacher => (
              <option key={teacher} value={teacher}>{teacher}</option>
            ))}
          </select>
          <button
            onClick={handleAddConstraint}
            disabled={isSaving || !selectedTeacher}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? '추가 중...' : '제약 조건 추가'}
          </button>
        </div>
      </div>

      {/* Constraints List */}
      {constraints.length === 0 ? (
        <p className="text-gray-500 text-center py-8">설정된 제약 조건이 없습니다.</p>
      ) : (
        <div className="space-y-6">
          {constraints.map((constraint) => (
            <div key={constraint.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900">{constraint.teacher_name}</h4>
                <button
                  onClick={() => handleDeleteConstraint(constraint.id, constraint.teacher_name)}
                  className="text-red-600 hover:text-red-900 text-sm"
                >
                  제거
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Homeroom Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    홈룸 설정
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={constraint.homeroom_disabled}
                        onChange={(e) => handleUpdateConstraint(constraint.id, constraint.teacher_name, {
                          homeroom_disabled: e.target.checked
                        })}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">홈룸 비활성화</span>
                    </label>
                    <div className="flex items-center space-x-2">
                      <label htmlFor={`max-homerooms-${constraint.id}`} className="text-sm text-gray-700">
                        최대 홈룸:
                      </label>
                      <input
                        type="number"
                        id={`max-homerooms-${constraint.id}`}
                        min="0"
                        max="10"
                        value={constraint.max_homerooms}
                        onChange={(e) => handleUpdateConstraint(constraint.id, constraint.teacher_name, {
                          max_homerooms: parseInt(e.target.value) || 0
                        })}
                        className="w-20 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Unavailable Times */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    불가능한 시간 (클릭하여 토글)
                  </label>
                  <div className="grid grid-cols-6 gap-1">
                    {/* Header */}
                    <div></div>
                    {PERIODS.map(period => (
                      <div key={period} className="text-xs text-center font-medium text-gray-600">
                        {period}교시
                      </div>
                    ))}
                    
                    {/* Day rows */}
                    {DAYS.map(day => (
                      <React.Fragment key={day}>
                        <div className="text-xs font-medium text-gray-600 flex items-center justify-center">
                          {day}
                        </div>
                        {PERIODS.map(period => {
                          const isUnavailable = constraint.unavailable.includes(`${day}|${period}`)
                          return (
                            <button
                              key={`${day}-${period}`}
                              onClick={() => toggleUnavailable(constraint, day, period)}
                              className={`w-8 h-8 text-xs rounded border ${
                                isUnavailable
                                  ? 'bg-red-100 border-red-300 text-red-700'
                                  : 'bg-green-100 border-green-300 text-green-700'
                              } hover:opacity-75`}
                            >
                              {isUnavailable ? '✗' : '✓'}
                            </button>
                          )
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
