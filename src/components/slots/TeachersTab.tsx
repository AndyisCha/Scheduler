import { useState } from 'react'
import { unifiedSlotService } from '../../services/unifiedSlotService'
import { useToast } from '../Toast'
import type { SlotConfig } from '../../engine/types'

interface TeachersTabProps {
  slotId: string
  slotConfig: SlotConfig
  onUpdate: (config: SlotConfig) => void
}

export function TeachersTab({ slotId, slotConfig, onUpdate }: TeachersTabProps) {
  const [newTeacherName, setNewTeacherName] = useState('')
  const [newTeacherKind, setNewTeacherKind] = useState<'homeroomKorean' | 'foreign'>('homeroomKorean')
  const [isAdding, setIsAdding] = useState(false)
  
  const toast = useToast()

  // Get teachers from slotConfig
  const homeroomTeachers = slotConfig.teachers?.homeroomKoreanPool || []
  const foreignTeachers = slotConfig.teachers?.foreignPool || []

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newTeacherName.trim()) {
      toast.error('선생님 이름을 입력해주세요.')
      return
    }

    const teacherName = newTeacherName.trim()

    // Check for duplicates
    const allTeachers = [...homeroomTeachers, ...foreignTeachers]
    if (allTeachers.includes(teacherName)) {
      toast.error('이미 존재하는 선생님입니다.')
      return
    }

    setIsAdding(true)
    
    try {
      console.log('💾 Adding teacher:', { slotId, teacherName, newTeacherKind })
      
      // Update slot config first
      const updatedConfig = { ...slotConfig }
      if (!updatedConfig.teachers) {
        updatedConfig.teachers = { homeroomKoreanPool: [], foreignPool: [] }
      }
      
      if (newTeacherKind === 'homeroomKorean') {
        updatedConfig.teachers.homeroomKoreanPool = [...homeroomTeachers, teacherName]
      } else {
        updatedConfig.teachers.foreignPool = [...foreignTeachers, teacherName]
      }
      
      // Save to database
      await unifiedSlotService.updateSlotTeachers(slotId, {
        homeroomKoreanPool: updatedConfig.teachers.homeroomKoreanPool,
        foreignPool: updatedConfig.teachers.foreignPool
      })
      
      // Update parent component
      onUpdate(updatedConfig)
      
      setNewTeacherName('')
      toast.success(`${teacherName} 선생님이 추가되었습니다.`)
      console.log('✅ Teacher added successfully')
    } catch (err) {
      console.error('❌ Error adding teacher:', err)
      const errorMessage = err instanceof Error ? err.message : '선생님 추가 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    } finally {
      setIsAdding(false)
    }
  }

  const handleRemoveTeacher = async (teacherName: string, kind: 'homeroomKorean' | 'foreign') => {
    if (!window.confirm(`${teacherName} 선생님을 제거하시겠습니까?`)) {
      return
    }

    try {
      console.log('🗑️ Removing teacher:', { slotId, teacherName, kind })
      
      // Update slot config first
      const updatedConfig = { ...slotConfig }
      if (!updatedConfig.teachers) {
        updatedConfig.teachers = { homeroomKoreanPool: [], foreignPool: [] }
      }
      
      if (kind === 'homeroomKorean') {
        updatedConfig.teachers.homeroomKoreanPool = homeroomTeachers.filter(name => name !== teacherName)
      } else {
        updatedConfig.teachers.foreignPool = foreignTeachers.filter(name => name !== teacherName)
      }
      
      // Save to database
      await unifiedSlotService.updateSlotTeachers(slotId, {
        homeroomKoreanPool: updatedConfig.teachers.homeroomKoreanPool,
        foreignPool: updatedConfig.teachers.foreignPool
      })
      
      // Update parent component
      onUpdate(updatedConfig)
      
      toast.success(`${teacherName} 선생님이 제거되었습니다.`)
      console.log('✅ Teacher removed successfully')
    } catch (err) {
      console.error('❌ Error removing teacher:', err)
      const errorMessage = err instanceof Error ? err.message : '선생님 제거 중 오류가 발생했습니다.'
      toast.error(errorMessage)
    }
  }

  // Teachers are already extracted from slotConfig above

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="card">
        <div className="card-header text-center">
          <h3 className="card-title">선생님 관리</h3>
          <p className="card-description" style={{marginTop: '10px'}}>
            홈룸/한국어 풀과 외국인 선생님을 관리하세요
          </p>
        </div>

        {/* Add Teacher Form */}
        <form onSubmit={handleAddTeacher} className="form-container">
          <div className="form-grid">
            <div>
              <label htmlFor="teacherName" className="form-label">
                선생님 이름
              </label>
              <input
                type="text"
                id="teacherName"
                value={newTeacherName}
                onChange={(e) => setNewTeacherName(e.target.value)}
                className="dark-input"
                placeholder="선생님 이름을 입력하세요"
                disabled={isAdding}
              />
            </div>
            <div>
              <label htmlFor="teacherKind" className="form-label">
                종류
              </label>
              <select
                id="teacherKind"
                value={newTeacherKind}
                onChange={(e) => setNewTeacherKind(e.target.value as 'homeroomKorean' | 'foreign')}
                className="dark-input"
                disabled={isAdding}
              >
                <option value="homeroomKorean">홈룸/한국어</option>
                <option value="foreign">외국인</option>
              </select>
            </div>
          </div>
          
          {/* Circular Add Button */}
          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={isAdding || !newTeacherName.trim()}
              className="add-teacher-button rounded-full"
            >
              {isAdding ? (
                <div className="flex flex-col items-center gap-1">
                  <svg className="animate-spin button-icon text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span className="button-text text-white">추가중</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <svg className="button-icon text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="button-text text-white">추가</span>
                </div>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Teachers Lists */}
      <div className="teachers-grid grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Homeroom/Korean Teachers */}
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mr-4">
              <span className="text-lg">🏠</span>
            </div>
            <div>
              <h4 className="card-title text-lg">홈룸/한국어 선생님</h4>
              <span className="badge badge-primary">{homeroomTeachers.length}명</span>
            </div>
          </div>
          
          {homeroomTeachers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>등록된 홈룸/한국어 선생님이 없습니다</p>
                  <p className="text-xs" style={{color: 'var(--text-secondary)', opacity: 0.7}}>위의 폼에서 선생님을 추가해보세요</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {homeroomTeachers.map((teacherName, index) => (
                <div key={`homeroom-${index}`} className="teacher-card">
                  <div className="teacher-info">
                    <div className="teacher-avatar bg-blue-500">
                      {teacherName.charAt(0)}
                    </div>
                    <span className="teacher-name">{teacherName}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(teacherName, 'homeroomKorean')}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 rounded transition-colors"
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
        <div className="card">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4">
              <span className="text-lg">🌍</span>
            </div>
            <div>
              <h4 className="card-title text-lg">외국인 선생님</h4>
              <span className="badge badge-success">{foreignTeachers.length}명</span>
            </div>
          </div>
          
          {foreignTeachers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-illustration text-center">
                <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium" style={{color: 'var(--text-secondary)'}}>등록된 외국인 선생님이 없습니다</p>
                  <p className="text-xs" style={{color: 'var(--text-secondary)', opacity: 0.7}}>위의 폼에서 선생님을 추가해보세요</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {foreignTeachers.map((teacherName, index) => (
                <div key={`foreign-${index}`} className="teacher-card">
                  <div className="teacher-info">
                    <div className="teacher-avatar bg-green-500">
                      {teacherName.charAt(0)}
                    </div>
                    <span className="teacher-name">{teacherName}</span>
                  </div>
                  <button
                    onClick={() => handleRemoveTeacher(teacherName, 'foreign')}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 rounded transition-colors"
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


