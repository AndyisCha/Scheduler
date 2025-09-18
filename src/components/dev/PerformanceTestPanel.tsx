import { useState } from 'react'
import { runBenchmarkSuite, quickPerformanceCheck } from '../../utils/performanceBenchmark'
import type { BenchmarkResult } from '../../utils/performanceBenchmark'

export function PerformanceTestPanel() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<BenchmarkResult[]>([])
  const [quickCheckResult, setQuickCheckResult] = useState<boolean | null>(null)
  const [lastRunTime, setLastRunTime] = useState<Date | null>(null)

  const handleQuickCheck = async () => {
    setIsRunning(true)
    setQuickCheckResult(null)
    
    try {
      const result = await quickPerformanceCheck()
      setQuickCheckResult(result)
    } catch (error) {
      console.error('Quick check failed:', error)
      setQuickCheckResult(false)
    } finally {
      setIsRunning(false)
    }
  }

  const handleFullBenchmark = async () => {
    setIsRunning(true)
    setResults([])
    
    try {
      const startTime = new Date()
      const benchmarkResults = await runBenchmarkSuite()
      const endTime = new Date()
      
      setResults(benchmarkResults)
      setLastRunTime(endTime)
      
      console.log(`Benchmark completed in ${endTime.getTime() - startTime.getTime()}ms`)
    } catch (error) {
      console.error('Full benchmark failed:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getPerformanceStatus = (timeMs: number) => {
    if (timeMs < 500) return { status: 'excellent', color: 'text-green-600', icon: 'FAST' }
    if (timeMs < 1000) return { status: 'good', color: 'text-yellow-600', icon: 'MED' }
    return { status: 'poor', color: 'text-red-600', icon: 'SLOW' }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">성능 테스트 도구 (개발용)</h3>
      
      {/* Quick Check */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-700">빠른 성능 체크</h4>
          <button
            onClick={handleQuickCheck}
            disabled={isRunning}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '체크 중...' : '빠른 체크'}
          </button>
        </div>
        
        {quickCheckResult !== null && (
          <div className={`p-3 rounded-md ${
            quickCheckResult ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center">
              <span className="text-lg mr-2">{quickCheckResult ? 'OK' : 'FAIL'}</span>
              <span className={quickCheckResult ? 'text-green-800' : 'text-red-800'}>
                {quickCheckResult ? '성능 목표 달성' : '성능 목표 미달성'}
              </span>
            </div>
            <p className="text-sm mt-1 text-gray-600">
              목표: 4R*6C*20T &lt; 1000ms
            </p>
          </div>
        )}
      </div>

      {/* Full Benchmark */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-md font-medium text-gray-700">전체 벤치마크</h4>
          <button
            onClick={handleFullBenchmark}
            disabled={isRunning}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? '테스트 중...' : '전체 벤치마크'}
          </button>
        </div>
        
        {lastRunTime && (
          <p className="text-sm text-gray-500 mb-3">
            마지막 실행: {lastRunTime.toLocaleString('ko-KR')}
          </p>
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-700 mb-3">벤치마크 결과</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">테스트</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">평균 시간</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">범위</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">성공률</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">배정</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">경고</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">캐시</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => {
                  const perf = getPerformanceStatus(result.averageTimeMs)
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">
                        {result.testName}
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`font-medium ${perf.color}`}>
                          {perf.icon} {result.averageTimeMs}ms
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {result.minTimeMs}-{result.maxTimeMs}ms
                      </td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          result.successRate >= 95 
                            ? 'bg-green-100 text-green-800' 
                            : result.successRate >= 90 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.successRate}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {result.averageAssignments}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {result.averageWarnings}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {result.cacheHitRate}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-medium text-gray-900 mb-2">요약</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">전체 테스트:</span>
                <span className="ml-2 font-medium">{results.length}개</span>
              </div>
              <div>
                <span className="text-gray-600">목표 달성:</span>
                <span className="ml-2 font-medium text-green-600">
                  {results.filter(r => r.averageTimeMs < 1000).length}개
                </span>
              </div>
              <div>
                <span className="text-gray-600">평균 성공률:</span>
                <span className="ml-2 font-medium">
                  {Math.round(results.reduce((sum, r) => sum + r.successRate, 0) / results.length)}%
                </span>
              </div>
              <div>
                <span className="text-gray-600">평균 캐시율:</span>
                <span className="ml-2 font-medium">
                  {Math.round(results.reduce((sum, r) => sum + r.cacheHitRate, 0) / results.length)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {isRunning && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">성능 테스트 실행 중...</span>
        </div>
      )}
    </div>
  )
}
