// Schedule comparison view component
import { useState, useEffect } from 'react'
import { historyService } from '../../services/historyService'
import { LoadingState, ErrorState } from '../ErrorStates'
import { useToast } from '../Toast'
import { useAuthStore } from '../../store/auth'
import type { ComparisonResult } from '../../services/historyService'

interface ComparisonViewProps {
  leftSnapshotId: string
  rightSnapshotId: string
  onBack: () => void
}

export function ComparisonView({ leftSnapshotId, rightSnapshotId, onBack }: ComparisonViewProps) {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  const toast = useToast()
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)

  useEffect(() => {
    loadComparison()
  }, [leftSnapshotId, rightSnapshotId])

  const loadComparison = async () => {
    if (!user || !profile) return
    
    setIsLoading(true)
    setError('')
    try {
      const result = await historyService.compareSnapshots(leftSnapshotId, rightSnapshotId, user.id, profile.role)
      setComparison(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '비교 데이터 로딩 실패'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!comparison) return

    const csvData = generateComparisonCSV(comparison)
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
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

  const generateComparisonCSV = (comparison: ComparisonResult): string => {
    const headers = ['교사명', '변경 유형', '요일', '교시', '역할', '클래스', '변경 내용']
    const rows = [headers.join(',')]

    comparison.teacher_diff.forEach(diff => {
      diff.added_sessions.forEach(session => {
        rows.push([
          diff.teacher_name,
          '추가',
          session.day,
          session.period,
          session.role,
          session.classId || '',
          '새로 할당됨'
        ].join(','))
      })

      diff.removed_sessions.forEach(session => {
        rows.push([
          diff.teacher_name,
          '제거',
          session.day,
          session.period,
          session.role,
          session.classId || '',
          '할당 해제됨'
        ].join(','))
      })

      diff.changed_sessions.forEach(change => {
        rows.push([
          diff.teacher_name,
          '변경',
          change.day,
          change.period,
          change.role,
          change.classId || '',
          `${change.oldValue} → ${change.newValue}`
        ].join(','))
      })
    })

    return rows.join('\n')
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getKPIDiffColor = (diff: number) => {
    if (diff === 0) return 'text-gray-600'
    if (diff > 0) return 'text-red-600'
    return 'text-green-600'
  }

  const getKPIDiffIcon = (diff: number) => {
    if (diff === 0) return '→'
    if (diff > 0) return '↑'
    return '↓'
  }

  if (isLoading) {
    return <LoadingState message="비교 데이터를 로딩하는 중..." />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (!comparison) {
    return <ErrorState message="비교 데이터를 찾을 수 없습니다." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">스케줄 비교</h2>
        <div className="flex space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            CSV 내보내기
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            뒤로가기
          </button>
        </div>
      </div>

      {/* Snapshot Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">이전 버전</h3>
          <p className="text-sm text-blue-700">{formatDate(comparison.left.created_at)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-900 mb-2">현재 버전</h3>
          <p className="text-sm text-green-700">{formatDate(comparison.right.created_at)}</p>
        </div>
      </div>

      {/* KPI Comparison */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium mb-4">주요 지표 비교</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Unassigned Count */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {comparison.kpi_diff.unassigned_count.left} → {comparison.kpi_diff.unassigned_count.right}
            </div>
            <div className="text-sm text-gray-500">미할당 수</div>
            <div className={`text-sm font-medium ${getKPIDiffColor(comparison.kpi_diff.unassigned_count.diff)}`}>
              {getKPIDiffIcon(comparison.kpi_diff.unassigned_count.diff)} {Math.abs(comparison.kpi_diff.unassigned_count.diff)}
            </div>
          </div>

          {/* Fairness Deviation */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {comparison.kpi_diff.fairness_deviation.left.toFixed(2)} → {comparison.kpi_diff.fairness_deviation.right.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500">공정성 편차</div>
            <div className={`text-sm font-medium ${getKPIDiffColor(comparison.kpi_diff.fairness_deviation.diff)}`}>
              {getKPIDiffIcon(comparison.kpi_diff.fairness_deviation.diff)} {Math.abs(comparison.kpi_diff.fairness_deviation.diff).toFixed(2)}
            </div>
          </div>

          {/* TT Foreign Usage */}
          {comparison.kpi_diff.tt_foreign_capacity_usage && (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {(comparison.kpi_diff.tt_foreign_capacity_usage.left * 100).toFixed(1)}% → {(comparison.kpi_diff.tt_foreign_capacity_usage.right * 100).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">TT 외국어 사용률</div>
              <div className={`text-sm font-medium ${getKPIDiffColor(comparison.kpi_diff.tt_foreign_capacity_usage.diff)}`}>
                {getKPIDiffIcon(comparison.kpi_diff.tt_foreign_capacity_usage.diff)} {(Math.abs(comparison.kpi_diff.tt_foreign_capacity_usage.diff) * 100).toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Teacher Assignment Changes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">교사 할당 변경사항</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교사명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  변경 유형
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
                  클래스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  변경 내용
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comparison.teacher_diff.flatMap(diff => [
                ...diff.added_sessions.map(session => (
                  <tr key={`${diff.teacher_name}-added-${session.day}-${session.period}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        추가
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.classId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">새로 할당됨</td>
                  </tr>
                )),
                ...diff.removed_sessions.map(session => (
                  <tr key={`${diff.teacher_name}-removed-${session.day}-${session.period}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        제거
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.classId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">할당 해제됨</td>
                  </tr>
                )),
                ...diff.changed_sessions.map(change => (
                  <tr key={`${diff.teacher_name}-changed-${change.day}-${change.period}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        변경
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.classId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {change.oldValue} → {change.newValue}
                    </td>
                  </tr>
                ))
              ]).length > 0 ? comparison.teacher_diff.flatMap(diff => [
                ...diff.added_sessions.map(session => (
                  <tr key={`${diff.teacher_name}-added-${session.day}-${session.period}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                        추가
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.classId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">새로 할당됨</td>
                  </tr>
                )),
                ...diff.removed_sessions.map(session => (
                  <tr key={`${diff.teacher_name}-removed-${session.day}-${session.period}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                        제거
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{session.classId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">할당 해제됨</td>
                  </tr>
                )),
                ...diff.changed_sessions.map(change => (
                  <tr key={`${diff.teacher_name}-changed-${change.day}-${change.period}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {diff.teacher_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                        변경
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{change.classId || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {change.oldValue} → {change.newValue}
                    </td>
                  </tr>
                ))
              ]) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    변경사항이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}