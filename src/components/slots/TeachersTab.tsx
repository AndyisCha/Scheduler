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
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">선생님 관리</h3>
        <p className="text-sm text-gray-600">
          홈룸/한국어 풀과 외국인 선생님을 관리하세요
        </p>
      </div>

      {/* Add Teacher Form */}
      <form onSubmit={handleAddTeacher} className="mb-8 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700">
              선생님 이름
            </label>
            <input
              type="text"
              id="teacherName"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="선생님 이름을 입력하세요"
              disabled={isAdding}
            />
          </div>
          <div>
            <label htmlFor="teacherKind" className="block text-sm font-medium text-gray-700">
              종류
            </label>
            <select
              id="teacherKind"
              value={newTeacherKind}
              onChange={(e) => setNewTeacherKind(e.target.value as 'H_K_POOL' | 'FOREIGN')}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      </form>

      {/* Teachers Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Homeroom/Korean Teachers */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🏠</span>
            홈룸/한국어 선생님 ({homeroomTeachers.length})
          </h4>
          {homeroomTeachers.length === 0 ? (
            <p className="text-gray-500 text-sm">등록된 홈룸/한국어 선생님이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {homeroomTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-3"
                >
                  <span className="text-sm font-medium text-gray-900">{teacher.teacher_name}</span>
                  <button
                    onClick={() => handleRemoveTeacher(teacher.id, teacher.teacher_name, teacher.kind)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    제거
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Foreign Teachers */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <span className="mr-2">🌍</span>
            외국인 선생님 ({foreignTeachers.length})
          </h4>
          {foreignTeachers.length === 0 ? (
            <p className="text-gray-500 text-sm">등록된 외국인 선생님이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {foreignTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-md p-3"
                >
                  <span className="text-sm font-medium text-gray-900">{teacher.teacher_name}</span>
                  <button
                    onClick={() => handleRemoveTeacher(teacher.id, teacher.teacher_name, teacher.kind)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    제거
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


