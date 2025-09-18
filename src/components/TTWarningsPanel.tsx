// TT Warnings Panel with filtering
import { useState, useMemo } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { VirtualizedTable } from './VirtualizedTable'

interface TTWarningsPanelProps {
  warnings: string[]
}

type WarningFilter = 'all' | 'mwf' | 'tt' | 'critical' | 'korean' | 'foreign'

export function TTWarningsPanel({ warnings }: TTWarningsPanelProps) {
  const [filter, setFilter] = useState<WarningFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Debounce search term to avoid excessive filtering
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  const filteredWarnings = useMemo(() => {
    let filtered = warnings

    // Apply category filter
    if (filter === 'critical') filtered = filtered.filter(w => w.includes('CRITICAL') || w.includes('INFEASIBLE'))
    else if (filter === 'mwf') filtered = filtered.filter(w => w.includes('월') || w.includes('수') || w.includes('금'))
    else if (filter === 'tt') filtered = filtered.filter(w => w.includes('화') || w.includes('목'))
    else if (filter === 'korean') filtered = filtered.filter(w => w.includes('한국인') || w.includes('K'))
    else if (filter === 'foreign') filtered = filtered.filter(w => w.includes('외국인') || w.includes('F'))

    // Apply search term filter
    if (debouncedSearchTerm) {
      filtered = filtered.filter(w => 
        w.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      )
    }

    return filtered
  }, [warnings, filter, debouncedSearchTerm])

  const getWarningSeverity = (warning: string): 'info' | 'warning' | 'error' => {
    if (warning.includes('CRITICAL') || warning.includes('INFEASIBLE') || warning.includes('배정 실패')) {
      return 'error'
    }
    if (warning.includes('부족') || warning.includes('불가')) {
      return 'warning'
    }
    return 'info'
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">경고 및 알림</h3>
        <span className="text-sm text-gray-500">{filteredWarnings.length}개</span>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="경고 메시지 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {[
          { key: 'all', label: '전체' },
          { key: 'critical', label: '중요' },
          { key: 'mwf', label: 'MWF' },
          { key: 'tt', label: 'TT' },
          { key: 'korean', label: '한국인' },
          { key: 'foreign', label: '외국인' }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as WarningFilter)}
            className={`px-3 py-1 text-sm rounded ${
              filter === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Warnings List */}
      {filteredWarnings.length === 0 ? (
        <p className="text-gray-500 text-sm">선택된 필터에 해당하는 경고가 없습니다.</p>
      ) : (
        <VirtualizedTable
          data={filteredWarnings.map((warning, index) => ({ warning, index }))}
          columns={[{
            key: 'warning',
            header: '경고 내용',
            width: 800,
            render: (item) => {
              const severity = getWarningSeverity(item.warning)
              return (
                <div className={`p-3 rounded border text-sm ${getSeverityColor(severity)}`}>
                  <div className="flex items-start space-x-2">
                    <span className="font-medium capitalize">{severity}:</span>
                    <span>{item.warning}</span>
                  </div>
                </div>
              )
            }
          }]}
          height={Math.min(400, filteredWarnings.length * 60)}
          itemHeight={60}
          threshold={50}
        />
      )}
    </div>
  )
}
