// Schedule snapshot viewer component
import { useState, useEffect } from 'react'
import { historyService } from '../../services/historyService'
import { LoadingState, ErrorState } from '../ErrorStates'
import { useToast } from '../Toast'
import { useAuthStore } from '../../store/auth'
import type { ScheduleSnapshot } from '../../services/historyService'

interface SnapshotViewerProps {
  snapshotId: string
  onBack: () => void
}

export function SnapshotViewer({ snapshotId, onBack }: SnapshotViewerProps) {
  const [snapshot, setSnapshot] = useState<ScheduleSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  
  const toast = useToast()
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)

  useEffect(() => {
    loadSnapshot()
  }, [snapshotId])

  const loadSnapshot = async () => {
    if (!user || !profile) return
    
    setIsLoading(true)
    setError('')
    try {
      const result = await historyService.getSnapshot(snapshotId, user.id, profile.role)
      setSnapshot(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '스냅샷 로딩 실패'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExportCSV = () => {
    if (!snapshot) return

    const csvData = generateSnapshotCSV(snapshot)
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `schedule-snapshot-${snapshot.id}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    toast.success('CSV 파일이 다운로드되었습니다.')
  }

  const generateSnapshotCSV = (snapshot: ScheduleSnapshot): string => {
    const headers = ['교사명', '요일', '교시', '역할', '클래스']
    const rows = [headers.join(',')]

    // Add teacher assignments
    Object.entries(snapshot.result.teacherSummary).forEach(([teacherName, assignments]) => {
      if (Array.isArray(assignments)) {
        assignments.forEach((assignment: any) => {
          rows.push([
            teacherName,
            assignment.day,
            assignment.period,
            assignment.role,
            assignment.classId || ''
          ].join(','))
        })
      }
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

  if (isLoading) {
    return <LoadingState message="스냅샷을 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (!snapshot) {
    return <ErrorState message="스냅샷을 찾을 수 없습니다." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">스냅샷 상세보기</h2>
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
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">기본 정보</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-500">생성일시</dt>
                <dd className="text-sm text-gray-900">{formatDate(snapshot.created_at)}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">요일 그룹</dt>
                <dd className="text-sm text-gray-900">{snapshot.day_group}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">경고 수</dt>
                <dd className="text-sm text-gray-900">{snapshot.warnings.length}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">주요 지표</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-500">미할당 수</dt>
                <dd className="text-sm text-gray-900">{snapshot.kpis?.unassigned_count || 0}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">공정성 편차</dt>
                <dd className="text-sm text-gray-900">{snapshot.kpis?.fairness_deviation?.toFixed(2) || 'N/A'}</dd>
              </div>
              {snapshot.kpis?.tt_foreign_capacity_usage !== undefined && (
                <div>
                  <dt className="text-sm text-gray-500">TT 외국어 사용률</dt>
                  <dd className="text-sm text-gray-900">{(snapshot.kpis.tt_foreign_capacity_usage * 100).toFixed(1)}%</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {snapshot.warnings.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium">경고사항</h3>
          </div>
          <div className="px-6 py-4">
            <ul className="space-y-2">
              {snapshot.warnings.map((warning, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  <span className="text-sm text-gray-700">{warning}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Teacher Assignments */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">교사 할당 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교사명
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
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(snapshot.result.teacherSummary).map(([teacherName, assignments]) =>
                Array.isArray(assignments) ? assignments.map((assignment: any, index: number) => (
                  <tr key={`${teacherName}-${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {teacherName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.day}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.period}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{assignment.classId || '-'}</td>
                  </tr>
                )) : []
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Class Summary */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium">클래스별 할당 현황</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  클래스
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  요일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  교시
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  홈룸 교사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  한국어 교사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  외국어 교사
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(snapshot.result.classSummary).map(([classId, classData]) =>
                Object.entries((classData as any).assignments || {}).map(([day, dayData]) =>
                  Object.entries(dayData as any).map(([period, assignment]) => (
                    <tr key={`${classId}-${day}-${period}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {classId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{day}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{period}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(assignment as any).homeroom || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(assignment as any).korean || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(assignment as any).foreign || '-'}
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}