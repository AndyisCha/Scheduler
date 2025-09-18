import React, { useState, useEffect } from 'react';
import { metricsService, type EngineMetrics } from '../services/metricsService';
import { useAuthStore } from '../store/auth';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface MetricsPanelProps {
  isVisible: boolean;
  onToggle: () => void;
  slotId?: string;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  isVisible,
  onToggle,
  slotId
}) => {
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [engineStats, setEngineStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'performance' | 'engine' | 'recent'>('performance');
  
  const { profile } = useAuthStore();

  useEffect(() => {
    if (isVisible) {
      loadMetrics();
    }
  }, [isVisible, slotId]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const [performanceSummary, enginePerformance] = await Promise.all([
        metricsService.getPerformanceSummary(),
        metricsService.getEnginePerformanceStats(slotId)
      ]);

      setPerformanceStats(performanceSummary);
      setEngineStats(enginePerformance);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={onToggle}
          className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Metrics Panel"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-[80vh] bg-white border border-gray-200 rounded-lg shadow-xl z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={loadMetrics}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Refresh metrics"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={onToggle}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Close metrics panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'performance'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Performance
          </button>
          <button
            onClick={() => setActiveTab('engine')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'engine'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Engine
          </button>
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'recent'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Recent
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <LoadingSpinner size="md" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Performance Tab */}
            {activeTab === 'performance' && performanceStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {performanceStats.totalOperations}
                    </div>
                    <div className="text-sm text-gray-600">Total Operations</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((performanceStats.successfulOperations / performanceStats.totalOperations) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {performanceStats.averageDuration}ms
                  </div>
                  <div className="text-sm text-gray-600">Average Duration</div>
                </div>

                {performanceStats.slowestOperation && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="text-sm font-medium text-yellow-800">Slowest Operation</div>
                    <div className="text-xs text-yellow-700 mt-1">
                      {performanceStats.slowestOperation.operation}: {performanceStats.slowestOperation.duration}ms
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Engine Tab */}
            {activeTab === 'engine' && engineStats && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {engineStats.totalGenerations}
                    </div>
                    <div className="text-sm text-gray-600">Total Generations</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {engineStats.successRate}%
                    </div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {engineStats.averageGenerationTime}ms
                  </div>
                  <div className="text-sm text-gray-600">Avg Generation Time</div>
                </div>

                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {engineStats.warningsRate}%
                  </div>
                  <div className="text-sm text-gray-600">Warnings Rate</div>
                </div>
              </div>
            )}

            {/* Recent Tab */}
            {activeTab === 'recent' && engineStats && (
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-700">Recent Metrics</div>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {engineStats.recentMetrics.map((metric: EngineMetrics, index: number) => (
                    <div key={index} className="p-2 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{metric.scheduleType}</span>
                        <span className="text-gray-500">{metric.generationTimeMs}ms</span>
                      </div>
                      <div className="text-gray-600 mt-1">
                        {metric.assignedCount}/{metric.totalAssignments} assignments
                        {metric.warningsCount > 0 && (
                          <span className="text-yellow-600 ml-2">
                            {metric.warningsCount} warnings
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {engineStats.recentMetrics.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      No recent metrics available
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Environment Info */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>Environment: {import.meta.env.VITE_ENVIRONMENT || 'development'}</div>
            <div>User: {profile?.display_name || 'Unknown'}</div>
            <div>Role: {profile?.role || 'Unknown'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
