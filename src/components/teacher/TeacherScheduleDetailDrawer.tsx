import { useEffect } from 'react'
import type { Assignment } from '../../types/scheduler'

interface TeacherScheduleDetailDrawerProps {
  assignment: Assignment
  isOpen: boolean
  onClose: () => void
}

export function TeacherScheduleDetailDrawer({ 
  assignment, 
  isOpen, 
  onClose 
}: TeacherScheduleDetailDrawerProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'H':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'K':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'F':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EXAM':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'H':
        return '홈룸 담임'
      case 'K':
        return '한국어 수업'
      case 'F':
        return '외국어 수업'
      case 'EXAM':
        return '시험 감독'
      default:
        return role
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'H':
        return '학급 담임 교사로서 학생들의 생활 지도와 학급 관리 업무를 담당합니다.'
      case 'K':
        return '한국어 수업을 진행하며, 학생들의 한국어 실력 향상을 도와줍니다.'
      case 'F':
        return '외국어 수업을 진행하며, 학생들의 외국어 실력 향상을 도와줍니다.'
      case 'EXAM':
        return '시험 감독 업무를 담당하며, 공정한 시험 환경을 조성합니다.'
      default:
        return '수업 관련 업무를 담당합니다.'
    }
  }

  const getPeriodInfo = (period: number) => {
    const periodInfo = {
      1: { start: '09:00', end: '09:50', duration: '50분' },
      2: { start: '10:00', end: '10:50', duration: '50분' },
      3: { start: '11:00', end: '11:50', duration: '50분' },
      4: { start: '12:00', end: '12:50', duration: '50분' },
      5: { start: '14:00', end: '14:50', duration: '50분' },
      6: { start: '15:00', end: '15:50', duration: '50분' },
      7: { start: '16:00', end: '16:50', duration: '50분' },
      8: { start: '17:00', end: '17:50', duration: '50분' },
    }
    return periodInfo[period as keyof typeof periodInfo] || { start: '00:00', end: '00:00', duration: '50분' }
  }

  if (!isOpen) return null

  const periodInfo = getPeriodInfo(parseInt(assignment.period.toString()))

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">수업 상세 정보</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Role Badge */}
              <div className="flex items-center justify-center">
                <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getRoleColor(assignment.role)}`}>
                  {getRoleLabel(assignment.role)}
                </span>
              </div>

              {/* Basic Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">기본 정보</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">클래스</dt>
                    <dd className="text-sm font-medium text-gray-900">{assignment.classId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">라운드</dt>
                    <dd className="text-sm font-medium text-gray-900">R{assignment.round}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">교시</dt>
                    <dd className="text-sm font-medium text-gray-900">{assignment.period}교시</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">시간</dt>
                    <dd className="text-sm font-medium text-gray-900">{assignment.time}</dd>
                  </div>
                </dl>
              </div>

              {/* Time Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">시간 정보</h3>
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">시작 시간</dt>
                    <dd className="text-sm font-medium text-gray-900">{periodInfo.start}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">종료 시간</dt>
                    <dd className="text-sm font-medium text-gray-900">{periodInfo.end}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-600">수업 시간</dt>
                    <dd className="text-sm font-medium text-gray-900">{periodInfo.duration}</dd>
                  </div>
                </dl>
              </div>

              {/* Role Description */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">업무 설명</h3>
                <p className="text-sm text-gray-600">
                  {getRoleDescription(assignment.role)}
                </p>
              </div>

              {/* Special Flags */}
              {assignment.role === 'EXAM' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <h3 className="text-sm font-medium text-red-800">시험 감독</h3>
                  </div>
                  <p className="mt-2 text-sm text-red-700">
                    이 시간은 시험 감독 업무입니다. 시험 규정을 준수하고 공정한 시험 환경을 조성해주세요.
                  </p>
                </div>
              )}

              {/* Teacher Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">담당 교사</h3>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{assignment.teacher}</p>
                    <p className="text-sm text-gray-500">{getRoleLabel(assignment.role)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={onClose}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


