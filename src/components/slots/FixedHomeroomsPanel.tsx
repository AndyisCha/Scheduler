// Fixed homerooms management panel
import { useState } from 'react'

interface Teacher {
  name: string
  kind: 'homeroomKorean' | 'foreign'
}

interface Teachers {
  homeroomKoreanPool: Teacher[]
  foreignPool: Teacher[]
}

import type { GlobalOptions } from '../../engine/types'

interface FixedHomeroomsPanelProps {
  fixedHomerooms: { [teacherName: string]: string }
  teachers: Teachers
  globalOptions: GlobalOptions
  onUpdate: (fixedHomerooms: { [teacherName: string]: string }) => void
  onSave: () => void
  isSaving: boolean
}

export function FixedHomeroomsPanel({ 
  fixedHomerooms, 
  teachers, 
  globalOptions, 
  onUpdate, 
  onSave, 
  isSaving 
}: FixedHomeroomsPanelProps) {
  const [selectedTeacher, setSelectedTeacher] = useState<string>('')
  const [selectedClassId, setSelectedClassId] = useState<string>('')

  // Generate class IDs based on round class counts
  const generateClassIds = () => {
    const classIds: string[] = []
    Object.entries(globalOptions.roundClassCounts).forEach(([round, count]) => {
      for (let i = 1; i <= count; i++) {
        classIds.push(`R${round}C${i}`)
      }
    })
    return classIds
  }

  const classIds = generateClassIds()
  const homeroomTeachers = teachers.homeroomKoreanPool

  const addFixedHomeroom = () => {
    if (!selectedTeacher || !selectedClassId) return

    // Check if class is already assigned
    const existingTeacher = Object.keys(fixedHomerooms).find(
      teacher => fixedHomerooms[teacher] === selectedClassId
    )
    
    if (existingTeacher && existingTeacher !== selectedTeacher) {
      // Remove existing assignment
      const newFixedHomerooms = { ...fixedHomerooms }
      delete newFixedHomerooms[existingTeacher]
      onUpdate(newFixedHomerooms)
      return
    }

    onUpdate({
      ...fixedHomerooms,
      [selectedTeacher]: selectedClassId
    })

    setSelectedTeacher('')
    setSelectedClassId('')
  }

  const removeFixedHomeroom = (teacherName: string) => {
    const newFixedHomerooms = { ...fixedHomerooms }
    delete newFixedHomerooms[teacherName]
    onUpdate(newFixedHomerooms)
  }

  const getAvailableClassIds = () => {
    const assignedClassIds = Object.values(fixedHomerooms)
    return classIds.filter(classId => !assignedClassIds.includes(classId))
  }

  const getTeacherForClass = (classId: string) => {
    return Object.keys(fixedHomerooms).find(teacher => fixedHomerooms[teacher] === classId)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">고정 홈룸 할당</h3>
        <button
          onClick={onSave}
          disabled={isSaving}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Add Fixed Homeroom */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-3">새 고정 홈룸 할당</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">교사 선택</option>
            {homeroomTeachers.map(teacher => (
              <option key={teacher.name} value={teacher.name}>
                {teacher.name}
              </option>
            ))}
          </select>

          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">클래스 선택</option>
            {getAvailableClassIds().map(classId => (
              <option key={classId} value={classId}>
                {classId}
              </option>
            ))}
          </select>

          <button
            onClick={addFixedHomeroom}
            disabled={!selectedTeacher || !selectedClassId}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            할당
          </button>
        </div>
      </div>

      {/* Current Assignments */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">현재 할당</h4>
        
        {Object.keys(fixedHomerooms).length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            고정 홈룸 할당이 없습니다.
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(fixedHomerooms).map(([teacher, classId]) => (
              <div key={teacher} className="flex items-center justify-between bg-blue-50 p-3 rounded">
                <div className="flex items-center space-x-3">
                  <span className="font-medium">{teacher}</span>
                  <span className="text-gray-400">→</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {classId}
                  </span>
                </div>
                <button
                  onClick={() => removeFixedHomeroom(teacher)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Class Grid View */}
      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">클래스별 할당 현황</h4>
        
        {Object.entries(globalOptions.roundClassCounts).map(([round, count]) => (
          <div key={round} className="border border-gray-200 rounded-lg p-4">
            <h5 className="font-medium text-gray-700 mb-3">R{round} 라운드 ({count}개 클래스)</h5>
            <div className="grid grid-cols-6 gap-2">
              {Array.from({ length: count }, (_, i) => {
                const classId = `R${round}C${i + 1}`
                const assignedTeacher = getTeacherForClass(classId)
                
                return (
                  <div
                    key={classId}
                    className={`p-3 rounded text-center text-sm ${
                      assignedTeacher
                        ? 'bg-green-100 border-2 border-green-300'
                        : 'bg-gray-100 border-2 border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{classId}</div>
                    {assignedTeacher ? (
                      <div className="text-green-800 font-medium">{assignedTeacher}</div>
                    ) : (
                      <div className="text-gray-500">미할당</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">고정 홈룸 요약</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-blue-700">총 클래스 수:</span>
            <span className="ml-2 font-medium">{classIds.length}개</span>
          </div>
          <div>
            <span className="text-blue-700">할당된 클래스:</span>
            <span className="ml-2 font-medium">{Object.keys(fixedHomerooms).length}개</span>
          </div>
        </div>
      </div>
    </div>
  )
}
