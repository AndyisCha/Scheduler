import { useState, useEffect } from 'react'
import { getFixedHomerooms, upsertFixedHomeroom, deleteFixedHomeroom } from '../../services/db/slots'
import { useToast } from '../Toast'
import { LoadingState } from '../ErrorStates'
import type { DbFixedHomeroom } from '../../services/db/types'
import type { SlotConfig } from '../../engine/types'

interface FixedHomeroomsTabProps {
  slotId: string
  slotConfig: SlotConfig
  onUpdate: (config: SlotConfig) => void
}

const CLASS_IDS = [
  'R1C1', 'R1C2', 'R1C3', 'R1C4',
  'R2C1', 'R2C2', 'R2C3', 'R2C4',
  'R3C1', 'R3C2', 'R3C3', 'R3C4',
  'R4C1', 'R4C2', 'R4C3', 'R4C4'
] as const

export function FixedHomeroomsTab({ slotId, slotConfig, onUpdate }: FixedHomeroomsTabProps) {
  const [fixedHomerooms, setFixedHomerooms] = useState<DbFixedHomeroom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newClassId, setNewClassId] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  
  const toast = useToast()

  useEffect(() => {
    loadFixedHomerooms()
  }, [slotId])

  const loadFixedHomerooms = async () => {
    setIsLoading(true)
    try {
      const fixedHomeroomsData = await getFixedHomerooms(slotId)
      setFixedHomerooms(fixedHomeroomsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '고정 홈룸을 불러오는 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getAvailableTeachers = () => {
    return slotConfig.teachers.homeroomKoreanPool.filter(name => 
      !fixedHomerooms.some(fh => fh.teacher_name === name)
    )
  }

  const getAvailableClassIds = () => {
    return CLASS_IDS.filter(classId => 
      !fixedHomerooms.some(fh => fh.class_id === classId)
    )
  }

  const handleAddFixedHomeroom = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTeacherName || !newClassId) {
      toast.error('선생님과 반을 모두 선택해주세요.')
      return
    }

    // Check for conflicts
    const teacherConflict = fixedHomerooms.some(fh => fh.teacher_name === newTeacherName)
    const classConflict = fixedHomerooms.some(fh => fh.class_id === newClassId)
    
    if (teacherConflict) {
      toast.error('이미 고정 홈룸이 설정된 선생님입니다.')
      return
    }
    
    if (classConflict) {
      toast.error('이미 다른 선생님이 배정된 반입니다.')
      return
    }

    setIsAdding(true)
    
    try {
      const newFixedHomeroom = await upsertFixedHomeroom(slotId, newTeacherName, newClassId)
      setFixedHomerooms(prev => [...prev, newFixedHomeroom])
      
      // Update slot config
      onUpdate({
        ...slotConfig,
        fixedHomerooms: {
          ...slotConfig.fixedHomerooms,
          [newTeacherName]: newClassId
        }
      })
      
      setNewTeacherName('')
      setNewClassId('')
      toast.success('고정 홈룸이 설정되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '고정 홈룸 설정 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveFixedHomeroom = async (homeroomId: string, teacherName: string) => {
    if (!window.confirm(`${teacherName} 선생님의 고정 홈룸을 제거하시겠습니까?`)) {
      return
    }

    try {
      await deleteFixedHomeroom(homeroomId)
      setFixedHomerooms(prev => prev.filter(fh => fh.id !== homeroomId))
      
      // Update slot config
      const newFixedHomerooms = { ...slotConfig.fixedHomerooms }
      delete newFixedHomerooms[teacherName]
      onUpdate({
        ...slotConfig,
        fixedHomerooms: newFixedHomerooms
      })
      
      toast.success('고정 홈룸이 제거되었습니다.')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '고정 홈룸 제거 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  if (isLoading) {
    return <LoadingState message="고정 홈룸을 불러오는 중..." />
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">고정 홈룸 설정</h3>
        <p className="text-sm text-gray-600">
          특정 선생님을 특정 반에 고정 배정하세요
        </p>
      </div>

      {/* Add Fixed Homeroom Form */}
      <form onSubmit={handleAddFixedHomeroom} className="mb-8 bg-gray-50 p-4 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="teacherName" className="block text-sm font-medium text-gray-700">
              선생님
            </label>
            <select
              id="teacherName"
              value={newTeacherName}
              onChange={(e) => setNewTeacherName(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isAdding}
            >
              <option value="">선생님을 선택하세요</option>
              {getAvailableTeachers().map(teacher => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="classId" className="block text-sm font-medium text-gray-700">
              반
            </label>
            <select
              id="classId"
              value={newClassId}
              onChange={(e) => setNewClassId(e.target.value)}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              disabled={isAdding}
            >
              <option value="">반을 선택하세요</option>
              {getAvailableClassIds().map(classId => (
                <option key={classId} value={classId}>{classId}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isAdding || !newTeacherName || !newClassId}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAdding ? '설정 중...' : '고정 홈룸 설정'}
            </button>
          </div>
        </div>
      </form>

      {/* Fixed Homerooms List */}
      {fixedHomerooms.length === 0 ? (
        <p className="text-gray-500 text-center py-8">설정된 고정 홈룸이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-gray-900">고정 홈룸 목록</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fixedHomerooms.map((homeroom) => (
              <div
                key={homeroom.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900">{homeroom.teacher_name}</h5>
                    <p className="text-sm text-gray-500">{homeroom.class_id}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveFixedHomeroom(homeroom.id, homeroom.teacher_name)}
                    className="text-red-600 hover:text-red-900 text-sm"
                  >
                    제거
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Classes Summary */}
      {fixedHomerooms.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">사용 가능한 반</h4>
          <div className="flex flex-wrap gap-2">
            {getAvailableClassIds().map(classId => (
              <span
                key={classId}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {classId}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


