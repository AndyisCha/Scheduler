// Performance metrics panel for development
import { useState } from 'react'

interface PerformanceMetrics {
  generationTimeMs: number
  totalAssignments: number
  assignedCount: number
  unassignedCount: number
  warningsCount: number
  teachersCount: number
  classesCount: number
}

interface PerformanceMetricsProps {
  mwfMetrics?: PerformanceMetrics
  ttMetrics?: PerformanceMetrics
  unifiedMetrics?: {
    totalGenerationTimeMs: number
    totalWarnings: number
    combinedTeachers: number
    combinedClasses: number
  }
}

export function PerformanceMetrics({ 
  mwfMetrics, 
  ttMetrics, 
  unifiedMetrics 
}: PerformanceMetricsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!mwfMetrics && !ttMetrics && !unifiedMetrics) {
    return null
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getPerformanceColor = (ms: number) => {
    if (ms < 500) return 'text-green-600'
    if (ms < 1000) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        <svg 
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span>성능 메트릭스</span>
        <span className="text-xs text-gray-500">(개발용)</span>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Unified Metrics */}
          {unifiedMetrics && (
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-900 mb-2">통합 생성 성능</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">총 생성 시간:</span>
                  <span className={`ml-2 font-medium ${getPerformanceColor(unifiedMetrics.totalGenerationTimeMs)}`}>
                    {formatTime(unifiedMetrics.totalGenerationTimeMs)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">총 경고:</span>
                  <span className="ml-2 font-medium">{unifiedMetrics.totalWarnings}개</span>
                </div>
                <div>
                  <span className="text-gray-600">통합 교사:</span>
                  <span className="ml-2 font-medium">{unifiedMetrics.combinedTeachers}명</span>
                </div>
                <div>
                  <span className="text-gray-600">통합 클래스:</span>
                  <span className="ml-2 font-medium">{unifiedMetrics.combinedClasses}개</span>
                </div>
              </div>
            </div>
          )}

          {/* MWF Metrics */}
          {mwfMetrics && (
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-900 mb-2">MWF 스케줄러</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">생성 시간:</span>
                  <span className={`ml-2 font-medium ${getPerformanceColor(mwfMetrics.generationTimeMs)}`}>
                    {formatTime(mwfMetrics.generationTimeMs)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">배정 성공:</span>
                  <span className="ml-2 font-medium text-green-600">{mwfMetrics.assignedCount}개</span>
                </div>
                <div>
                  <span className="text-gray-600">미배정:</span>
                  <span className={`ml-2 font-medium ${mwfMetrics.unassignedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {mwfMetrics.unassignedCount}개
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">교사 수:</span>
                  <span className="ml-2 font-medium">{mwfMetrics.teachersCount}명</span>
                </div>
                <div>
                  <span className="text-gray-600">클래스 수:</span>
                  <span className="ml-2 font-medium">{mwfMetrics.classesCount}개</span>
                </div>
                <div>
                  <span className="text-gray-600">경고:</span>
                  <span className={`ml-2 font-medium ${mwfMetrics.warningsCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {mwfMetrics.warningsCount}개
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TT Metrics */}
          {ttMetrics && (
            <div className="bg-white p-3 rounded border">
              <h4 className="font-medium text-gray-900 mb-2">TT 스케줄러</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">생성 시간:</span>
                  <span className={`ml-2 font-medium ${getPerformanceColor(ttMetrics.generationTimeMs)}`}>
                    {formatTime(ttMetrics.generationTimeMs)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">배정 성공:</span>
                  <span className="ml-2 font-medium text-green-600">{ttMetrics.assignedCount}개</span>
                </div>
                <div>
                  <span className="text-gray-600">미배정:</span>
                  <span className={`ml-2 font-medium ${ttMetrics.unassignedCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {ttMetrics.unassignedCount}개
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">교사 수:</span>
                  <span className="ml-2 font-medium">{ttMetrics.teachersCount}명</span>
                </div>
                <div>
                  <span className="text-gray-600">클래스 수:</span>
                  <span className="ml-2 font-medium">{ttMetrics.classesCount}개</span>
                </div>
                <div>
                  <span className="text-gray-600">경고:</span>
                  <span className={`ml-2 font-medium ${ttMetrics.warningsCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {ttMetrics.warningsCount}개
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <h5 className="font-medium text-blue-900 mb-1">성능 팁</h5>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• 생성 시간 &lt; 1초가 목표입니다</li>
              <li>• 미배정이 많으면 교사 풀을 늘려보세요</li>
              <li>• 경고가 많으면 제약 조건을 확인하세요</li>
              <li>• 200행 이상 테이블은 가상화됩니다</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}


