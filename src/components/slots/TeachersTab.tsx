import { useState, useEffect } from 'react'
import { getSlotTeachers, addSlotTeacher, removeSlotTeacher } from '../../services/db/slots'
import { useToast } from '../Toast'
import { LoadingState } from '../ErrorStates'
import type { DbSlotTeacher } from '../../services/db/types'
import type { SlotConfig } from '../../engine/types'

interface TeachersTabProps {
  slotId: string
  slotConfig: SlotConfig
  onUpdate: (config: SlotConfig) => void
}

export function TeachersTab({ slotId, slotConfig, onUpdate }: TeachersTabProps) {
  const [teachers, setTeachers] = useState<DbSlotTeacher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherKind, setNewTeacherKind] = useState<'H_K_POOL' | 'FOREIGN'>('H_K_POOL')
  const [isAdding, setIsAdding] = useState(false)
  
  const toast = useToast()

  useEffect(() => {
    loadTeachers()
  }, [slotId])

  const loadTeachers = async () => {
    setIsLoading(true)
    try {
      const teachersData = await getSlotTeachers(slotId)
      setTeachers(teachersData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '선생님 목록을 불러오는 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTeacherName.trim()) {
      toast.error('선생님 이름을 입력해주세요.')
      return
    }

    // Check for duplicates
    const existingTeacher = teachers.find(t => 
      t.teacher_name.toLowerCase() === newTeacherName.toLowerCase().trim() && 
      t.kind === newTeacherKind
    )
    
    if (existingTeacher) {
      toast.error('같은 종류의 선생님이 이미 존재합니다.')
      return
    }

    setIsAdding(true)
    
    try {
      const newTeacher = await addSlotTeacher(slotId, newTeacherName.trim(), newTeacherKind)
      setTeachers(prev => [...prev, newTeacher])
      
      // Update slot config
      if (newTeacherKind === 'H_K_POOL') {
        onUpdate({
          ...slotConfig,
          teachers: {
            ...slotConfig.teachers,
            homeroomKoreanPool: [...slotConfig.teachers.homeroomKoreanPool, newTeacher.teacher_name]
          }
        })
      } else {
        onUpdate({
          ...slotConfig,
          teachers: {
            ...slotConfig.teachers,
            foreignPool: [...slotConfig.teachers.foreignPool, newTeacher.teacher_name]
          }
        })
      }
      
      setNewTeacherName('')
      toast.success('선생님이 추가되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '선생님 추가 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveTeacher = async (teacherId: string, teacherName: string, kind: 'H_K_POOL' | 'FOREIGN') => {
    if (!window.confirm(`${teacherName} 선생님을 제거하시겠습니까?`)) {
      return
    }

    try {
      await removeSlotTeacher(teacherId)
      setTeachers(prev => prev.filter(t => t.id !== teacherId))
      
      // Update slot config
      if (kind === 'H_K_POOL') {
        onUpdate({
          ...slotConfig,
          teachers: {
            ...slotConfig.teachers,
            homeroomKoreanPool: slotConfig.teachers.homeroomKoreanPool.filter(name => name !== teacherName)
          }
        })
      } else {
        onUpdate({
          ...slotConfig,
          teachers: {
            ...slotConfig.teachers,
            foreignPool: slotConfig.teachers.foreignPool.filter(name => name !== teacherName)
          }
        })
      }
      
      toast.success('선생님이 제거되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '선생님 제거 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  const homeroomTeachers = teachers.filter(t => t.kind === 'H_K_POOL')
  const foreignTeachers = teachers.filter(t => t.kind === 'FOREIGN')

  if (isLoading) {
    return <LoadingState message="선생님 목록을 불러오는 중..." />
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">선생님 관리</h3>
        <p className="text-sm text-gray-600">
          홈룸/한국어 풀과 외국인 선생님을 관리하세요
        </p>
      </div>

      {/* Add Teacher Form */}
      <form onSubmit={handleAddTeacher} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700 mb-1">
              선생님 이름
            </label>
            <input
              type="text"
              id="teacherName"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              placeholder="선생님 이름을 입력하세요"
              disabled={isAdding}
            />
          </div>
          <div>
            <label htmlFor="teacherKind" className="block text-sm font-medium text-gray-700 mb-1">
              종류
            </label>
            <select
              id="teacherKind"
              value={newTeacherKind}
              onChange={(e) => setNewTeacherKind(e.target.value as 'H_K_POOL' | 'FOREIGN')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm"
              disabled={isAdding}
            >
              <option value="H_K_POOL">홈룸/한국어</option>
              <option value="FOREIGN">외국인</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isAdding || !newTeacherName.trim()}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center text-sm"
            >
              {isAdding ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  추가 중...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  추가
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Teachers Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Homeroom/Korean Teachers */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">홈룸/한국어 선생님</h4>
              <p className="text-blue-600 font-semibold text-sm">{homeroomTeachers.length}명</p>
            </div>
          </div>
          
          {homeroomTeachers.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium text-sm">등록된 홈룸/한국어 선생님이 없습니다</p>
              <p className="text-xs text-gray-500 mt-1">위의 폼에서 선생님을 추가해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homeroomTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between bg-white rounded-md p-3 shadow-sm border border-blue-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-blue-600 font-semibold text-xs">
                        {teacher.teacher_name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 text-sm">{teacher.teacher_name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(teacher.id, teacher.teacher_name, teacher.kind)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                    title="제거"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Foreign Teachers */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center mr-3">
              <span className="text-lg">🌍</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-gray-900">외국인 선생님</h4>
              <p className="text-green-600 font-semibold text-sm">{foreignTeachers.length}명</p>
            </div>
          </div>
          
          {foreignTeachers.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium text-sm">등록된 외국인 선생님이 없습니다</p>
              <p className="text-xs text-gray-500 mt-1">위의 폼에서 선생님을 추가해보세요</p>
            </div>
          ) : (
            <div className="space-y-2">
              {foreignTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between bg-white rounded-md p-3 shadow-sm border border-green-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-2">
                      <span className="text-green-600 font-semibold text-xs">
                        {teacher.teacher_name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900 text-sm">{teacher.teacher_name}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(teacher.id, teacher.teacher_name, teacher.kind)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                    title="제거"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


