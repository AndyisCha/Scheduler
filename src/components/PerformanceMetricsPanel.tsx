import { useState, useEffect } from 'react'
import type { ScheduleResult } from '../types/scheduler'

interface PerformanceMetricsPanelProps {
  scheduleResult: ScheduleResult | null
  isGenerating: boolean
  className?: string
}

interface MetricsDisplay {
  generationTimeMs: number
  totalAssignments: number
  assignedCount: number
  unassignedCount: number
  warningsCount: number
  teachersCount: number
  classesCount: number
  sortOperations: number
  cacheHits: number
  cacheMisses: number
  cacheHitRate: number
}

export function PerformanceMetricsPanel({ 
  scheduleResult, 
  isGenerating, 
  className = '' 
}: PerformanceMetricsPanelProps) {
  const [metrics, setMetrics] = useState<MetricsDisplay | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (scheduleResult?.metrics) {
      const m = scheduleResult.metrics
      setMetrics({
        generationTimeMs: m.generationTimeMs || 0,
        totalAssignments: m.totalAssignments || 0,
        assignedCount: m.assignedCount || 0,
        unassignedCount: m.unassignedCount || 0,
        warningsCount: m.warningsCount || 0,
        teachersCount: m.teachersCount || 0,
        classesCount: m.classesCount || 0,
        sortOperations: (m as any).sortOperations || 0,
        cacheHits: (m as any).cacheHits || 0,
        cacheMisses: (m as any).cacheMisses || 0,
        cacheHitRate: (m as any).cacheHitRate || 0,
      })
    }
  }, [scheduleResult])

  const getPerformanceColor = (timeMs: number) => {
    if (timeMs < 500) return 'text-green-600'
    if (timeMs < 1000) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceIcon = (timeMs: number) => {
    if (timeMs < 500) return '⚡'
    if (timeMs < 1000) return '🟡'
    return '🔴'
  }

  const getAssignmentRate = () => {
    if (!metrics || metrics.totalAssignments === 0) return 0
    return Math.round((metrics.assignedCount / metrics.totalAssignments) * 100)
  }

  const getAssignmentColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 90) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (isGenerating) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">성능 메트릭</h3>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-500">생성 중...</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">⏱️</div>
            <div className="text-sm text-gray-500">생성 시간</div>
            <div className="text-lg font-semibold text-gray-700">계산 중...</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-sm text-gray-500">배정률</div>
            <div className="text-lg font-semibold text-gray-700">계산 중...</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">⚠️</div>
            <div className="text-sm text-gray-500">경고 수</div>
            <div className="text-lg font-semibold text-gray-700">계산 중...</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-1">💾</div>
            <div className="text-sm text-gray-500">캐시 효율</div>
            <div className="text-lg font-semibold text-gray-700">계산 중...</div>
          </div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">성능 메트릭</h3>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📈</div>
          <p className="text-gray-500">스케줄을 생성하면 성능 메트릭이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  const assignmentRate = getAssignmentRate()

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">성능 메트릭</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showDetails ? '간단히 보기' : '상세 보기'}
        </button>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">{getPerformanceIcon(metrics.generationTimeMs)}</div>
          <div className="text-sm text-gray-500 mb-1">생성 시간</div>
          <div className={`text-xl font-bold ${getPerformanceColor(metrics.generationTimeMs)}`}>
            {metrics.generationTimeMs}ms
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.generationTimeMs < 1000 ? '빠름' : '느림'}
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm text-gray-500 mb-1">배정률</div>
          <div className={`text-xl font-bold ${getAssignmentColor(assignmentRate)}`}>
            {assignmentRate}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.assignedCount}/{metrics.totalAssignments}
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">⚠️</div>
          <div className="text-sm text-gray-500 mb-1">경고 수</div>
          <div className={`text-xl font-bold ${metrics.warningsCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {metrics.warningsCount}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.unassignedCount}개 미배정
          </div>
        </div>

        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-2xl mb-2">💾</div>
          <div className="text-sm text-gray-500 mb-1">캐시 효율</div>
          <div className={`text-xl font-bold ${metrics.cacheHitRate >= 80 ? 'text-green-600' : 'text-yellow-600'}`}>
            {metrics.cacheHitRate}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {metrics.cacheHits} 히트
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <div className="border-t pt-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">상세 성능 분석</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Assignment Statistics */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-3">📋 할당 통계</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">총 시도</span>
                  <span className="font-medium">{metrics.totalAssignments}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">성공</span>
                  <span className="font-medium text-green-600">{metrics.assignedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">실패</span>
                  <span className="font-medium text-red-600">{metrics.unassignedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">교사 수</span>
                  <span className="font-medium">{metrics.teachersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">반 수</span>
                  <span className="font-medium">{metrics.classesCount}</span>
                </div>
              </div>
            </div>

            {/* Performance Analysis */}
            <div className="bg-green-50 rounded-lg p-4">
              <h5 className="font-medium text-green-900 mb-3">⚡ 성능 분석</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700">정렬 작업</span>
                  <span className="font-medium">{metrics.sortOperations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">캐시 히트</span>
                  <span className="font-medium">{metrics.cacheHits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">캐시 미스</span>
                  <span className="font-medium">{metrics.cacheMisses}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">캐시 효율</span>
                  <span className="font-medium">{metrics.cacheHitRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">평균 처리량</span>
                  <span className="font-medium">
                    {metrics.generationTimeMs > 0 
                      ? Math.round(metrics.totalAssignments / metrics.generationTimeMs * 1000) 
                      : 0} 할당/초
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Recommendations */}
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h5 className="font-medium text-yellow-900 mb-2">💡 성능 개선 제안</h5>
            <div className="text-sm text-yellow-800 space-y-1">
              {metrics.generationTimeMs > 1000 && (
                <div>• 생성 시간이 1초를 초과했습니다. 교사 수나 반 수를 줄여보세요.</div>
              )}
              {assignmentRate < 95 && (
                <div>• 배정률이 낮습니다. 교사 풀을 늘리거나 제약 조건을 완화해보세요.</div>
              )}
              {metrics.cacheHitRate < 80 && (
                <div>• 캐시 효율이 낮습니다. 반복적인 제약 조건이 있는지 확인해보세요.</div>
              )}
              {metrics.sortOperations > 50 && (
                <div>• 정렬 작업이 많습니다. 데이터 구조를 최적화해보세요.</div>
              )}
              {metrics.generationTimeMs < 500 && assignmentRate >= 95 && metrics.cacheHitRate >= 80 && (
                <div>• 훌륭한 성능입니다! 현재 설정이 최적화되어 있습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


