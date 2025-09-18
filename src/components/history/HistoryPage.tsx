// Schedule history page component
import { useState } from 'react'
import { HistoryList } from './HistoryList'
import { ComparisonView } from './ComparisonView'
import { SnapshotViewer } from './SnapshotViewer'

interface HistoryPageProps {
  slotId: string
  onBack: () => void
}

type ViewMode = 'list' | 'compare' | 'snapshot'

export function HistoryPage({ slotId, onBack }: HistoryPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [leftSnapshotId, setLeftSnapshotId] = useState<string>('')
  const [rightSnapshotId, setRightSnapshotId] = useState<string>('')
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>('')

  const handleCompare = (leftId: string, rightId: string) => {
    setLeftSnapshotId(leftId)
    setRightSnapshotId(rightId)
    setViewMode('compare')
  }

  const handleViewSnapshot = (snapshotId: string) => {
    setSelectedSnapshotId(snapshotId)
    setViewMode('snapshot')
  }

  const handleBackToList = () => {
    setViewMode('list')
    setLeftSnapshotId('')
    setRightSnapshotId('')
    setSelectedSnapshotId('')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">스케줄 히스토리</h1>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
        >
          슬롯 관리로 돌아가기
        </button>
      </div>

      {/* Content */}
      {viewMode === 'list' && (
        <HistoryList
          slotId={slotId}
          onCompare={handleCompare}
          onViewSnapshot={handleViewSnapshot}
        />
      )}

      {viewMode === 'compare' && (
        <ComparisonView
          leftSnapshotId={leftSnapshotId}
          rightSnapshotId={rightSnapshotId}
          onBack={handleBackToList}
        />
      )}

      {viewMode === 'snapshot' && (
        <SnapshotViewer
          snapshotId={selectedSnapshotId}
          onBack={handleBackToList}
        />
      )}
    </div>
  )
}


