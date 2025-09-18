// Schedule history list component
import { useState, useEffect } from 'react'
import { historyService } from '../../services/historyService'
import { LoadingState, ErrorState, EmptyState } from '../ErrorStates'
import { useToast } from '../Toast'
import { useAuthStore } from '../../store/auth'
import { VirtualizedTable } from '../VirtualizedTable'
import type { HistoryListItem } from '../../services/historyService'

interface HistoryListProps {
  slotId: string
  onCompare: (leftId: string, rightId: string) => void
  onViewSnapshot: (snapshotId: string) => void
}

export function HistoryList({ slotId, onCompare, onViewSnapshot }: HistoryListProps) {
  const [historyItems, setHistoryItems] = useState<HistoryListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  
  const toast = useToast()
  const user = useAuthStore(state => state.user)
  const profile = useAuthStore(state => state.profile)

  useEffect(() => {
    loadHistory()
  }, [slotId])

  const loadHistory = async () => {
    if (!user || !profile) return
    
    setIsLoading(true)
    setError('')
    try {
      const items = await historyService.getHistoryList(slotId, user.id, profile.role)
      setHistoryItems(items)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '히스토리 로딩 실패'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleItemSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId)
    } else {
      newSelected.add(itemId)
      // 최대 2개까지만 선택 가능
      if (newSelected.size > 2) {
        const firstSelected = Array.from(newSelected)[0]
        newSelected.delete(firstSelected)
      }
    }
    setSelectedItems(newSelected)
  }

  const handleCompare = () => {
    const selectedArray = Array.from(selectedItems)
    if (selectedArray.length === 2) {
      onCompare(selectedArray[0], selectedArray[1])
    }
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
    return <LoadingState message="히스토리를 불러오는 중..." />
  }

  if (error) {
    return <ErrorState message={error} />
  }

  if (historyItems.length === 0) {
    return <EmptyState title="저장된 스냅샷이 없습니다" message="스케줄을 생성하고 스냅샷을 저장해보세요." />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">스케줄 히스토리</h2>
        <div className="flex space-x-2">
          {selectedItems.size === 2 && (
            <button
              onClick={handleCompare}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              비교하기
            </button>
          )}
          <button
            onClick={loadHistory}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Selection Info */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 p-3 rounded-md">
          <p className="text-sm text-blue-700">
            {selectedItems.size}개 선택됨 {selectedItems.size === 2 && '- 비교 준비 완료'}
          </p>
        </div>
      )}

      {/* History Table */}
      <VirtualizedTable
        data={historyItems}
        columns={[
          {
            key: 'select',
            header: '선택',
            width: 80,
            render: (item) => (
              <input
                type="checkbox"
                checked={selectedItems.has(item.id)}
                onChange={() => handleItemSelect(item.id)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            )
          },
          {
            key: 'created_at',
            header: '생성일시',
            width: 180,
            render: (item) => formatDate(item.created_at)
          },
          {
            key: 'warnings_count',
            header: '경고 수',
            width: 120,
            render: (item) => (
              <span className={`px-2 py-1 rounded-full text-xs ${
                item.warnings_count === 0 
                  ? 'bg-green-100 text-green-800' 
                  : item.warnings_count <= 3
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {item.warnings_count}
              </span>
            )
          },
          {
            key: 'unassigned_count',
            header: '미할당 수',
            width: 120,
            render: (item) => item.kpis.unassigned_count
          },
          {
            key: 'fairness_deviation',
            header: '공정성 편차',
            width: 140,
            render: (item) => (
              <span className={`px-2 py-1 rounded-full text-xs ${
                item.kpis.fairness_deviation <= 1 
                  ? 'bg-green-100 text-green-800' 
                  : item.kpis.fairness_deviation <= 2
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {item.kpis.fairness_deviation.toFixed(2)}
              </span>
            )
          },
          {
            key: 'tt_foreign_usage',
            header: 'TT 외국어 사용률',
            width: 160,
            render: (item) => (
              item.kpis.tt_foreign_capacity_usage !== undefined ? (
                <span className="text-sm">
                  {(item.kpis.tt_foreign_capacity_usage * 100).toFixed(1)}%
                </span>
              ) : (
                <span className="text-gray-400">N/A</span>
              )
            )
          },
          {
            key: 'actions',
            header: '작업',
            width: 100,
            render: (item) => (
              <button
                onClick={() => onViewSnapshot(item.id)}
                className="text-blue-600 hover:text-blue-900"
              >
                보기
              </button>
            )
          }
        ]}
        height={400}
        itemHeight={48}
        threshold={50}
      />
    </div>
  )
}