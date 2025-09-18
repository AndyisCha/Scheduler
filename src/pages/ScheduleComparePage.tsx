import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { getSupabaseClient } from '../lib/supabase'
import { useToast } from '../components/Toast'
import { LoadingState, ErrorState } from '../components/ErrorStates'
import type { DbGeneratedSchedule } from '../services/db/types'

interface ComparisonResult {
  added: Array<{
    day: string
    period: number
    role: string
    classId: string
    teacher: string
  }>
  removed: Array<{
    day: string
    period: number
    role: string
    classId: string
    teacher: string
  }>
  changed: Array<{
    day: string
    period: number
    role: string
    classId: string
    oldTeacher: string
    newTeacher: string
  }>
}

export function ScheduleComparePage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const schedule1Id = searchParams.get('schedule1')
  const schedule2Id = searchParams.get('schedule2')
  
  const [schedule1, setSchedule1] = useState<DbGeneratedSchedule | null>(null)
  const [schedule2, setSchedule2] = useState<DbGeneratedSchedule | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  
  const toast = useToast()

  useEffect(() => {
    if (schedule1Id && schedule2Id && id) {
      loadSchedules()
    }
  }, [schedule1Id, schedule2Id, id])

  const loadSchedules = async () => {
    if (!schedule1Id || !schedule2Id || !id) return

    setIsLoading(true)
    setError('')

    try {
      const supabase = getSupabaseClient()
      
      const [result1, result2] = await Promise.all([
        supabase
          .from('generated_schedules')
          .select('*')
          .eq('id', schedule1Id)
          .single(),
        supabase
          .from('generated_schedules')
          .select('*')
          .eq('id', schedule2Id)
          .single()
      ])

      if (result1.error) throw result1.error
      if (result2.error) throw result2.error

      setSchedule1(result1.data)
      setSchedule2(result2.data)
      
      // Perform comparison
      const comparisonResult = compareSchedules(result1.data.result, result2.data.result)
      setComparison(comparisonResult)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스케줄을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const compareSchedules = (result1: any, result2: any): ComparisonResult => {
    const added: ComparisonResult['added'] = []
    const removed: ComparisonResult['removed'] = []
    const changed: ComparisonResult['changed'] = []

    // Get teacher summaries from both results
    const summary1 = result1?.teacherSummary || result1?.mwfResult?.teacherSummary || {}
    const summary2 = result2?.teacherSummary || result2?.mwfResult?.teacherSummary || {}

    // Create a map of all assignments from both schedules
    const assignments1 = new Map<string, any>()
    const assignments2 = new Map<string, any>()

    // Process schedule 1
    Object.entries(summary1).forEach(([teacher, assignments]: [string, any]) => {
      if (assignments && Array.isArray(assignments)) {
        assignments.forEach((assignment: any) => {
          const key = `${assignment.day}|${assignment.period}|${assignment.role}|${assignment.classId}`
          assignments1.set(key, { teacher, ...assignment })
        })
      }
    })

    // Process schedule 2
    Object.entries(summary2).forEach(([teacher, assignments]: [string, any]) => {
      if (assignments && Array.isArray(assignments)) {
        assignments.forEach((assignment: any) => {
          const key = `${assignment.day}|${assignment.period}|${assignment.role}|${assignment.classId}`
          assignments2.set(key, { teacher, ...assignment })
        })
      }
    })

    // Find differences
    const allKeys = new Set([...assignments1.keys(), ...assignments2.keys()])

    allKeys.forEach(key => {
      const assignment1 = assignments1.get(key)
      const assignment2 = assignments2.get(key)

      if (!assignment1 && assignment2) {
        // Added in schedule 2
        added.push({
          day: assignment2.day,
          period: assignment2.period,
          role: assignment2.role,
          classId: assignment2.classId,
          teacher: assignment2.teacher
        })
      } else if (assignment1 && !assignment2) {
        // Removed from schedule 2
        removed.push({
          day: assignment1.day,
          period: assignment1.period,
          role: assignment1.role,
          classId: assignment1.classId,
          teacher: assignment1.teacher
        })
      } else if (assignment1 && assignment2 && assignment1.teacher !== assignment2.teacher) {
        // Changed teacher
        changed.push({
          day: assignment1.day,
          period: assignment1.period,
          role: assignment1.role,
          classId: assignment1.classId,
          oldTeacher: assignment1.teacher,
          newTeacher: assignment2.teacher
        })
      }
    })

    return { added, removed, changed }
  }

  const getKPIs = (result: any) => {
    if (!result) return { unassignedCount: 0, totalAssignments: 0, fairnessDeviation: 0 }
    
    const mwfResult = result.mwfResult || result
    const classSummary = mwfResult.classSummary || {}
    
    let unassignedCount = 0
    let totalAssignments = 0
    const teacherCounts: Record<string, { H: number, K: number, F: number }> = {}
    
    // Count assignments and teacher workload
    Object.values(classSummary).forEach((cls: any) => {
      if (cls && cls.assignments) {
        Object.values(cls.assignments).forEach((period: any) => {
          if (period && period.assignments) {
            Object.values(period.assignments).forEach((assignment: any) => {
              if (!assignment.teacher) {
                unassignedCount++
              } else {
                totalAssignments++
                
                // Count teacher workload
                if (!teacherCounts[assignment.teacher]) {
                  teacherCounts[assignment.teacher] = { H: 0, K: 0, F: 0 }
                }
                teacherCounts[assignment.teacher][assignment.role as 'H' | 'K' | 'F']++
              }
            })
          }
        })
      }
    })
    
    // Calculate fairness deviation
    const counts = Object.values(teacherCounts).map(t => t.H + t.K + t.F)
    const avg = counts.reduce((sum, count) => sum + count, 0) / counts.length
    const deviation = counts.length > 0 
      ? counts.reduce((sum, count) => sum + Math.abs(count - avg), 0) / counts.length 
      : 0
    
    return { unassignedCount, totalAssignments, fairnessDeviation: Math.round(deviation * 100) / 100 }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportToCSV = () => {
    if (!comparison) return

    let csvContent = '구분,요일,교시,역할,반,변경 내용\n'
    
    // Add removed assignments
    comparison.removed.forEach(item => {
      csvContent += `제거,${item.day},${item.period},${item.role},${item.classId},"${item.teacher}"\n`
    })
    
    // Add added assignments
    comparison.added.forEach(item => {
      csvContent += `추가,${item.day},${item.period},${item.role},${item.classId},"${item.teacher}"\n`
    })
    
    // Add changed assignments
    comparison.changed.forEach(item => {
      csvContent += `변경,${item.day},${item.period},${item.role},${item.classId},"${item.oldTeacher} → ${item.newTeacher}"\n`
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `schedule-comparison-${Date.now()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('CSV 파일이 다운로드되었습니다.')
  }

  if (isLoading) {
    return <LoadingState message="스케줄을 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadSchedules} />
  }

  if (!schedule1 || !schedule2 || !comparison) {
    return <ErrorState message="스케줄을 찾을 수 없습니다." />
  }

  const kpis1 = getKPIs(schedule1.result)
  const kpis2 = getKPIs(schedule2.result)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="flex" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-4">
            <li>
              <Link to="/slots" className="text-gray-400 hover:text-gray-500">
                슬롯 목록
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <Link to={`/slots/${id}/history`} className="ml-4 text-gray-400 hover:text-gray-500">
                  스케줄 히스토리
                </Link>
              </div>
            </li>
            <li>
              <div className="flex items-center">
                <svg className="flex-shrink-0 h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-4 text-gray-500">스케줄 비교</span>
              </div>
            </li>
          </ol>
        </nav>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">스케줄 비교</h1>
        <p className="mt-2 text-gray-600">
          두 스케줄 버전을 비교하여 변경사항을 확인하세요
        </p>
      </div>

      {/* Schedule Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            스케줄 A ({formatDate(schedule1.created_at)})
          </h3>
          <div className="space-y-2 text-sm">
            <p>⚠️ 경고: {schedule1.warnings?.length || 0}개</p>
            <p>📊 미배정: {kpis1.unassignedCount}개</p>
            <p>✅ 배정: {kpis1.totalAssignments}개</p>
            <p>⚖️ 공정성 편차: {kpis1.fairnessDeviation}</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            스케줄 B ({formatDate(schedule2.created_at)})
          </h3>
          <div className="space-y-2 text-sm">
            <p>⚠️ 경고: {schedule2.warnings?.length || 0}개</p>
            <p>📊 미배정: {kpis2.unassignedCount}개</p>
            <p>✅ 배정: {kpis2.totalAssignments}개</p>
            <p>⚖️ 공정성 편차: {kpis2.fairnessDeviation}</p>
          </div>
        </div>
      </div>

      {/* KPI Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-2">추가된 배정</h4>
          <p className="text-2xl font-bold text-green-600">{comparison.added.length}</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-2">제거된 배정</h4>
          <p className="text-2xl font-bold text-red-600">{comparison.removed.length}</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-2">변경된 배정</h4>
          <p className="text-2xl font-bold text-blue-600">{comparison.changed.length}</p>
        </div>
      </div>

      {/* Export Button */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
        >
          CSV 내보내기
        </button>
      </div>

      {/* Diff Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            변경사항 상세
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            스케줄 A에서 B로의 변경사항
          </p>
        </div>
        
        {comparison.added.length === 0 && comparison.removed.length === 0 && comparison.changed.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            변경사항이 없습니다.
          </div>
        ) : (
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구분
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      요일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      교시
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      역할
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      반
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      변경 내용
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Removed assignments */}
                  {comparison.removed.map((item, index) => (
                    <tr key={`removed-${index}`} className="bg-red-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          제거
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.classId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.teacher}</td>
                    </tr>
                  ))}
                  
                  {/* Added assignments */}
                  {comparison.added.map((item, index) => (
                    <tr key={`added-${index}`} className="bg-green-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          추가
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.classId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.teacher}</td>
                    </tr>
                  ))}
                  
                  {/* Changed assignments */}
                  {comparison.changed.map((item, index) => (
                    <tr key={`changed-${index}`} className="bg-blue-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          변경
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.classId}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className="text-red-600">{item.oldTeacher}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{item.newTeacher}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


