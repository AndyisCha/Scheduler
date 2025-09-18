
interface SkeletonProps {
  className?: string
  height?: string | number
  width?: string | number
  rounded?: boolean
  animated?: boolean
}

export function Skeleton({ 
  className = '', 
  height = '1rem', 
  width = '100%', 
  rounded = false,
  animated = true 
}: SkeletonProps) {
  const baseClasses = 'bg-gray-200'
  const animationClasses = animated ? 'animate-pulse' : ''
  const roundedClasses = rounded ? 'rounded-full' : 'rounded'
  
  return (
    <div
      className={`${baseClasses} ${animationClasses} ${roundedClasses} ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  )
}

// Predefined skeleton components
export function SkeletonText({ lines = 1, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.75rem"
          width={i === lines - 1 ? '75%' : '100%'}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="flex items-center space-x-3 mb-3">
        <Skeleton height="2.5rem" width="2.5rem" rounded />
        <div className="flex-1">
          <Skeleton height="1rem" width="60%" className="mb-2" />
          <Skeleton height="0.75rem" width="40%" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4, className = '' }: { 
  rows?: number; 
  columns?: number; 
  className?: string 
}) {
  return (
    <div className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex space-x-4 mb-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} height="1.25rem" width="25%" />
        ))}
      </div>
      
      {/* Rows */}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex space-x-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex} 
                height="1rem" 
                width={colIndex === 0 ? '20%' : '25%'} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonList({ items = 5, className = '' }: { items?: number; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
          <Skeleton height="2rem" width="2rem" rounded />
          <div className="flex-1">
            <Skeleton height="1rem" width="70%" className="mb-2" />
            <Skeleton height="0.75rem" width="50%" />
          </div>
          <Skeleton height="1.5rem" width="4rem" />
        </div>
      ))}
    </div>
  )
}


