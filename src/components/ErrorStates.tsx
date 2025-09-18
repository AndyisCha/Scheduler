// Error and empty state components

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  action?: {
    label: string
    onClick: () => void
  }
}

export function ErrorState({ title, message, onRetry, action }: ErrorStateProps) {
  return (
    <div className="bg-white p-8 rounded-lg shadow text-center">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
      <p className="text-gray-600 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          다시 시도
        </button>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title?: string
  message?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ title, message, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white p-8 rounded-lg shadow text-center">
      <div className="text-gray-400 text-6xl mb-4">📋</div>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>}
      {message && <p className="text-gray-600 mb-4">{message}</p>}
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

interface LoadingStateProps {
  message?: string
  skeleton?: boolean
}

export function LoadingState({ message = '로딩 중...', skeleton = false }: LoadingStateProps) {
  if (skeleton) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">{message}</p>
    </div>
  )
}

// Skeleton loading component for dropdowns
export function DropdownSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded-md mb-2"></div>
      <div className="h-10 bg-gray-200 rounded-md"></div>
    </div>
  )
}

// Skeleton loading component for slot cards
export function SlotCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 animate-pulse">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  )
}

interface NetworkErrorProps {
  onRetry: () => void
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <ErrorState
      title="네트워크 오류"
      message="서버에 연결할 수 없습니다. 네트워크 연결을 확인하고 다시 시도해주세요."
      action={{
        label: '다시 시도',
        onClick: onRetry
      }}
    />
  )
}

interface AccessDeniedProps {
  message?: string
}

export function AccessDenied({ message = '접근 권한이 없습니다.' }: AccessDeniedProps) {
  return (
    <ErrorState
      title="접근 거부"
      message={message}
    />
  )
}

interface NotFoundProps {
  item: string
  onGoBack?: () => void
}

export function NotFound({ item, onGoBack }: NotFoundProps) {
  return (
    <EmptyState
      title={`${item}을(를) 찾을 수 없습니다`}
      message={`요청하신 ${item}이 존재하지 않거나 삭제되었습니다.`}
      action={onGoBack ? {
        label: '돌아가기',
        onClick: onGoBack
      } : undefined}
    />
  )
}
