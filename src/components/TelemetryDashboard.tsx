import React, { useState, useEffect } from 'react';
import { metricsService, type EngineMetrics } from '../services/metricsService';
import { sentryService } from '../lib/sentry';
import { Card } from './ui/Card';
import { AccessibleButton } from './a11y/AccessibleButton';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { DatabasePerformanceGuide } from './DatabasePerformanceGuide';

interface TelemetryStats {
  averageGenerationTime: number;
  totalGenerations: number;
  successRate: number;
  warningsRate: number;
  recentMetrics: EngineMetrics[];
}

interface PerformanceStats {
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  averageDuration: number;
  slowestOperation?: {
    operation: string;
    duration: number;
    success: boolean;
    error?: string;
    context?: Record<string, any>;
  };
}

export const TelemetryDashboard: React.FC = () => {
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats | null>(null);
  const [performanceStats, setPerformanceStats] = useState<PerformanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState(30);
  const [selectedSlotId] = useState<string>('');

  useEffect(() => {
    loadTelemetryData();
  }, [selectedTimeRange, selectedSlotId]);

  const loadTelemetryData = async () => {
    try {
      setLoading(true);
      
      // Load engine performance stats
      const engineStats = await metricsService.getEnginePerformanceStats(
        selectedSlotId || undefined, 
        selectedTimeRange
      );
      setTelemetryStats(engineStats);

      // Load client-side performance stats
      const perfStats = metricsService.getPerformanceSummary();
      setPerformanceStats(perfStats);

    } catch (error) {
      console.error('Failed to load telemetry data:', error);
      sentryService.captureException(error as Error, {
        operation: 'loadTelemetryData',
        selectedTimeRange,
        selectedSlotId
      });
    } finally {
      setLoading(false);
    }
  };

  const clearPerformanceMetrics = () => {
    metricsService.clearPerformanceMetrics();
    setPerformanceStats(metricsService.getPerformanceSummary());
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPerformanceColor = (duration: number, type: 'generation' | 'operation') => {
    const threshold = type === 'generation' ? 5000 : 2000;
    if (duration > threshold) return 'text-red-600';
    if (duration > threshold / 2) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <LoadingSpinner />
        <span className="ml-2 text-gray-600">텔레메트리 데이터 로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          운영 텔레메트리 대시보드
        </h2>
        <div className="flex space-x-4">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white dark:bg-gray-800 dark:border-gray-600"
          >
            <option value={7}>최근 7일</option>
            <option value={30}>최근 30일</option>
            <option value={90}>최근 90일</option>
          </select>
          <AccessibleButton
            onClick={loadTelemetryData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            🔄 새로고침
          </AccessibleButton>
        </div>
      </div>

      {/* Engine Performance Overview */}
      {telemetryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatDuration(telemetryStats.averageGenerationTime)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                평균 생성 시간
              </div>
              <div className={`text-xs mt-1 ${getPerformanceColor(telemetryStats.averageGenerationTime, 'generation')}`}>
                {telemetryStats.averageGenerationTime > 5000 ? '⚠️ 느림' : '✅ 정상'}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {telemetryStats.totalGenerations}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                총 생성 횟수
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {telemetryStats.successRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                성공률
              </div>
              <div className={`text-xs mt-1 ${telemetryStats.successRate > 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                {telemetryStats.successRate > 90 ? '✅ 우수' : '⚠️ 개선 필요'}
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {telemetryStats.warningsRate.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                평균 경고 수
              </div>
              <div className={`text-xs mt-1 ${telemetryStats.warningsRate < 5 ? 'text-green-600' : 'text-red-600'}`}>
                {telemetryStats.warningsRate < 5 ? '✅ 양호' : '⚠️ 많음'}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceStats && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              클라이언트 성능 메트릭
            </h3>
            <AccessibleButton
              onClick={clearPerformanceMetrics}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              🗑️ 초기화
            </AccessibleButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {performanceStats.totalOperations}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">총 작업</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">
                {performanceStats.successfulOperations}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">성공</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-red-600">
                {performanceStats.failedOperations}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">실패</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${getPerformanceColor(performanceStats.averageDuration, 'operation')}`}>
                {formatDuration(performanceStats.averageDuration)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">평균 시간</div>
            </div>
          </div>

          {performanceStats.slowestOperation && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                🐌 가장 느린 작업
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                <strong>{performanceStats.slowestOperation.operation}</strong>: {formatDuration(performanceStats.slowestOperation.duration)}
                {performanceStats.slowestOperation.error && (
                  <span className="block text-red-600 dark:text-red-400">
                    오류: {performanceStats.slowestOperation.error}
                  </span>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Recent Engine Metrics */}
      {telemetryStats?.recentMetrics && telemetryStats.recentMetrics.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            최근 엔진 메트릭
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    타입
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    생성시간
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    배정률
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    경고
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {telemetryStats.recentMetrics.map((metric, index) => {
                  const assignmentRate = metric.totalAssignments > 0 
                    ? ((metric.assignedCount / metric.totalAssignments) * 100).toFixed(1)
                    : '0';
                  
                  return (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {new Date(metric.timestamp).toLocaleString('ko-KR')}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          metric.scheduleType === 'MWF' 
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {metric.scheduleType}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${getPerformanceColor(metric.generationTimeMs, 'generation')}`}>
                        {formatDuration(metric.generationTimeMs)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {assignmentRate}%
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          metric.warningsCount === 0 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : metric.warningsCount < 5
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {metric.warningsCount}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Sentry Status */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          에러 추적 상태
        </h3>
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            sentryService.initialized 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
          }`}>
            {sentryService.initialized ? '✅ Sentry 활성화' : '❌ Sentry 비활성화'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            환경: {import.meta.env.VITE_ENVIRONMENT || 'development'}
          </div>
        </div>
        {!sentryService.initialized && (
          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            ⚠️ Sentry는 프로덕션 환경에서만 활성화됩니다.
          </div>
        )}
      </Card>

      {/* Database Performance Guide */}
      <DatabasePerformanceGuide />
    </div>
  );
};
