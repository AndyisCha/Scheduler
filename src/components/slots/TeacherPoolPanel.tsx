// Teacher pool management panel
import { useState } from 'react'

interface Teachers {
  homeroomKoreanPool: string[]
  foreignPool: string[]
}

interface TeacherPoolPanelProps {
  teachers: Teachers
  onUpdate: (teachers: Teachers) => void
  onSave: () => void
  isSaving: boolean
}

export function TeacherPoolPanel({ teachers, onUpdate, onSave, isSaving }: TeacherPoolPanelProps) {
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherKind, setNewTeacherKind] = useState<'homeroomKorean' | 'foreign'>('homeroomKorean')

  const addTeacher = () => {
    if (!newTeacherName.trim()) return

    const teacherName = newTeacherName.trim()

    // Check for duplicates
    const allTeachers = [...teachers.homeroomKoreanPool, ...teachers.foreignPool]
    if (allTeachers.includes(teacherName)) {
      return // Duplicate
    }

    if (newTeacherKind === 'homeroomKorean') {
      onUpdate({
        ...teachers,
        homeroomKoreanPool: [...teachers.homeroomKoreanPool, teacherName]
      })
    } else {
      onUpdate({
        ...teachers,
        foreignPool: [...teachers.foreignPool, teacherName]
      })
    }

    setNewTeacherName('')
  }

  const removeTeacher = (teacherName: string, kind: 'homeroomKorean' | 'foreign') => {
    if (kind === 'homeroomKorean') {
      onUpdate({
        ...teachers,
        homeroomKoreanPool: teachers.homeroomKoreanPool.filter(name => name !== teacherName)
      })
    } else {
      onUpdate({
        ...teachers,
        foreignPool: teachers.foreignPool.filter(name => name !== teacherName)
      })
    }
  }

  const moveTeacher = (teacherName: string, fromKind: 'homeroomKorean' | 'foreign', toKind: 'homeroomKorean' | 'foreign') => {
    // Check for duplicates in target pool
    const targetPool = toKind === 'homeroomKorean' ? teachers.homeroomKoreanPool : teachers.foreignPool
    if (targetPool.includes(teacherName)) {
      return // Duplicate
    }

    // Remove from source pool and add to target pool
    if (fromKind === 'homeroomKorean') {
      onUpdate({
        ...teachers,
        homeroomKoreanPool: teachers.homeroomKoreanPool.filter(name => name !== teacherName),
        foreignPool: toKind === 'foreign' ? [...teachers.foreignPool, teacherName] : teachers.foreignPool
      })
    } else {
      onUpdate({
        ...teachers,
        foreignPool: teachers.foreignPool.filter(name => name !== teacherName),
        homeroomKoreanPool: toKind === 'homeroomKorean' ? [...teachers.homeroomKoreanPool, teacherName] : teachers.homeroomKoreanPool
      })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">교사 풀 관리</h3>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Add New Teacher */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">새 교사 추가</h4>
        <div className="flex space-x-3">
          <input
            type="text"
            value={newTeacherName}
            onChange={(e) => setNewTeacherName(e.target.value)}
            placeholder="교사 이름"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && addTeacher()}
          />
          <select
            value={newTeacherKind}
            onChange={(e) => setNewTeacherKind(e.target.value as 'homeroomKorean' | 'foreign')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="homeroomKorean">홈룸/한국어</option>
            <option value="foreign">외국어</option>
          </select>
          <button
            onClick={addTeacher}
            disabled={!newTeacherName.trim()}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </div>

      {/* Teacher Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Homeroom/Korean Pool */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            홈룸/한국어 교사 ({teachers.homeroomKoreanPool.length}명)
          </h4>
          {teachers.homeroomKoreanPool.length === 0 ? (
            <p className="text-gray-500 text-sm">교사가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {teachers.homeroomKoreanPool.map((teacherName, index) => (
                <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                  <span className="text-sm font-medium">{teacherName}</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => moveTeacher(teacherName, 'homeroomKorean', 'foreign')}
                      className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      title="외국어로 이동"
                    >
                      → 외국어
                    </button>
                    <button
                      onClick={() => removeTeacher(teacherName, 'homeroomKorean')}
                      className="text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded"
                      title="삭제"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Foreign Pool */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            외국어 교사 ({teachers.foreignPool.length}명)
          </h4>
          {teachers.foreignPool.length === 0 ? (
            <p className="text-gray-500 text-sm">교사가 없습니다</p>
          ) : (
            <div className="space-y-2">
              {teachers.foreignPool.map((teacherName, index) => (
                <div key={index} className="flex items-center justify-between bg-green-50 p-2 rounded">
                  <span className="text-sm font-medium">{teacherName}</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => moveTeacher(teacherName, 'foreign', 'homeroomKorean')}
                      className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded"
                      title="홈룸/한국어로 이동"
                    >
                      → 홈룸/한국어
                    </button>
                    <button
                      onClick={() => removeTeacher(teacherName, 'foreign')}
                      className="text-xs bg-red-200 hover:bg-red-300 text-red-800 px-2 py-1 rounded"
                      title="삭제"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">교사 풀 요약</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">홈룸/한국어 교사:</span>
            <span className="ml-2 font-medium">{teachers.homeroomKoreanPool.length}명</span>
          </div>
          <div>
            <span className="text-blue-700">외국어 교사:</span>
            <span className="ml-2 font-medium">{teachers.foreignPool.length}명</span>
          </div>
        </div>
      </div>
    </div>
  )
}
