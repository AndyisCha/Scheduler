// Virtualized table component for large datasets
import { memo } from 'react'

interface VirtualizedTableProps {
  data: any[]
  columns: {
    key: string
    label: string
    width: number
    render?: (value: any, row: any, index: number) => React.ReactNode
  }[]
  height?: number
  className?: string
}

// Simple virtualization without react-window for now
const VirtualizedRow = memo(({ item, columns, index }: { item: any, columns: VirtualizedTableProps['columns'], index: number }) => {
  return (
    <div className="flex items-center border-b border-gray-200 hover:bg-gray-50">
      {columns.map((column) => (
        <div
          key={column.key}
          className="px-3 py-2 text-sm text-gray-900 truncate"
          style={{ width: column.width }}
        >
          {column.render 
            ? column.render(item[column.key], item, index)
            : item[column.key]
          }
        </div>
      ))}
    </div>
  )
})

VirtualizedRow.displayName = 'VirtualizedTableRow'

export function VirtualizedTable({ 
  data, 
  columns, 
  height = 400, 
  className = ''
}: VirtualizedTableProps) {
  if (data.length === 0) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        {columns.map((column) => (
          <div
            key={column.key}
            className="px-3 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider"
            style={{ width: column.width }}
          >
            {column.label}
          </div>
        ))}
      </div>
      
      {/* Virtualized Content */}
      <div style={{ height, overflowY: 'auto' }}>
        {data.map((item, index) => (
          <VirtualizedRow
            key={index}
            item={item}
            columns={columns}
            index={index}
          />
        ))}
      </div>
    </div>
  )
}
