// Virtualized table component for performance optimization
import React from 'react'

interface Column {
  key: string
  header: string
  width: number
  render: (item: any, index: number) => React.ReactNode
}

interface VirtualizedTableProps {
  data: any[]
  columns: Column[]
  height?: number
  itemHeight?: number
  threshold?: number // Only virtualize if data.length > threshold
  className?: string
}

export function VirtualizedTable({
  data,
  columns,
  height = 400,
  itemHeight = 48,
  threshold = 200,
  className = ''
}: VirtualizedTableProps) {

  // Use virtualization only if data exceeds threshold
  if (data.length <= threshold) {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    style={{ width: column.width }}
                  >
                    {column.render(item, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Optimized table for large datasets (pagination instead of virtualization for now)
  const itemsPerPage = 100
  const totalPages = Math.ceil(data.length / itemsPerPage)
  const [currentPage, setCurrentPage] = React.useState(0)
  
  const startIndex = currentPage * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, data.length)
  const currentData = data.slice(startIndex, endIndex)

  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="flex">
          {columns.map((column) => (
            <div
              key={column.key}
              className="text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: column.width }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ height: height, overflowY: 'auto' }}>
        {currentData.map((item, index) => (
          <div
            key={startIndex + index}
            className="flex items-center border-b border-gray-200 hover:bg-gray-50"
            style={{ height: itemHeight }}
          >
            {columns.map((column) => (
              <div
                key={column.key}
                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                style={{ width: column.width }}
              >
                {column.render(item, startIndex + index)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-700">
            {startIndex + 1}-{endIndex} of {data.length} items
          </span>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Hook for debounced filtering
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
