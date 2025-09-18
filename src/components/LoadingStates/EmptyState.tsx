import React from 'react'

interface EmptyStateProps {
  title: string
  description?: string
  illustration?: React.ReactNode
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ 
  title, 
  description, 
  illustration, 
  action, 
  className = '' 
}: EmptyStateProps) {
  const defaultIllustration = (
    <svg
      className="mx-auto h-24 w-24 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  )

  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Illustration */}
        <div className="mb-6">
          {illustration || defaultIllustration}
        </div>

        {/* Title */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-gray-500 mb-6">
            {description}
          </p>
        )}

        {/* Action Button */}
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

// Specialized empty state components
export function EmptyScheduleState({ onGenerate }: { onGenerate: () => void }) {
  return (
    <EmptyState
      title="스케줄이 없습니다"
      description="아직 생성된 스케줄이 없습니다. 새로운 스케줄을 생성해보세요."
      illustration={
        <svg
          className="mx-auto h-24 w-24 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      }
      action={{
        label: '스케줄 생성',
        onClick: onGenerate
      }}
    />
  )
}

export function EmptySlotState({ onCreateSlot }: { onCreateSlot: () => void }) {
  return (
    <EmptyState
      title="슬롯이 없습니다"
      description="새로운 슬롯을 생성하여 스케줄링을 시작하세요."
      illustration={
        <svg
          className="mx-auto h-24 w-24 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
      }
      action={{
        label: '슬롯 생성',
        onClick: onCreateSlot
      }}
    />
  )
}

export function EmptyFilterState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <EmptyState
      title="필터 결과가 없습니다"
      description="선택한 필터 조건에 맞는 데이터가 없습니다. 필터를 조정해보세요."
      illustration={
        <svg
          className="mx-auto h-24 w-24 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z"
          />
        </svg>
      }
      action={{
        label: '필터 초기화',
        onClick: onClearFilters
      }}
    />
  )
}


