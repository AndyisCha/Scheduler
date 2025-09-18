import { useState } from 'react'
import type { FilterState } from '../hooks/useScheduleFilter'

interface ActiveFilterChipsProps {
  filters: FilterState
  filterOptions: {
    teachers: string[]
    classes: string[]
    days: string[]
    roles: string[]
    rounds: string[]
  }
  onRemoveFilter: (filterType: keyof FilterState, value: string) => void
  onClearFilter: (filterType: keyof FilterState) => void
  onClearAll: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
}

export function ActiveFilterChips({
  filters,
  onRemoveFilter,
  onClearFilter,
  onClearAll,
  hasActiveFilters,
  activeFilterCount
}: ActiveFilterChipsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (!hasActiveFilters) {
    return null
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'H':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'K':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'F':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'EXAM':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'H':
        return '홈룸'
      case 'K':
        return '한국어'
      case 'F':
        return '외국어'
      case 'EXAM':
        return '시험'
      default:
        return role
    }
  }

  const getFilterTypeLabel = (filterType: keyof FilterState) => {
    switch (filterType) {
      case 'teachers':
        return '교사'
      case 'classes':
        return '클래스'
      case 'days':
        return '요일'
      case 'roles':
        return '역할'
      case 'rounds':
        return '라운드'
      default:
        return filterType
    }
  }

  const getFilterDisplayValue = (filterType: keyof FilterState, value: string) => {
    switch (filterType) {
      case 'roles':
        return getRoleLabel(value)
      case 'rounds':
        return value
      default:
        return value
    }
  }

  const getFilterColor = (filterType: keyof FilterState, value: string) => {
    switch (filterType) {
      case 'roles':
        return getRoleColor(value)
      case 'teachers':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'classes':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'days':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'rounds':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const renderFilterChips = () => {
    const allChips: Array<{
      type: keyof FilterState
      value: string
      label: string
      color: string
    }> = []

    // Collect all active filter chips
    Object.entries(filters).forEach(([filterType, values]) => {
      if (values.length > 0) {
        values.forEach((value: any) => {
          allChips.push({
            type: filterType as keyof FilterState,
            value,
            label: getFilterDisplayValue(filterType as keyof FilterState, value),
            color: getFilterColor(filterType as keyof FilterState, value)
          })
        })
      }
    })

    return allChips
  }

  const allChips = renderFilterChips()
  const visibleChips = isExpanded ? allChips : allChips.slice(0, 6)
  const hiddenCount = allChips.length - visibleChips.length

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
          </svg>
          <span className="text-sm font-medium text-blue-900">
            활성 필터 ({activeFilterCount}개)
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {hiddenCount > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {isExpanded ? '접기' : `${hiddenCount}개 더 보기`}
            </button>
          )}
          <button
            onClick={onClearAll}
            className="text-xs text-red-600 hover:text-red-800 font-medium"
          >
            모두 제거
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleChips.map((chip, index) => (
          <div
            key={`${chip.type}-${chip.value}-${index}`}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${chip.color}`}
          >
            <span className="mr-1 text-xs opacity-75">
              {getFilterTypeLabel(chip.type)}:
            </span>
            <span className="mr-2">{chip.label}</span>
            <button
              onClick={() => onRemoveFilter(chip.type, chip.value)}
              className="ml-1 hover:bg-black hover:bg-opacity-10 rounded-full p-0.5 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Quick Clear Buttons */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex flex-wrap gap-2">
          {Object.entries(filters).map(([filterType, values]) => {
            if (values.length === 0) return null
            
            return (
              <button
                key={filterType}
                onClick={() => onClearFilter(filterType as keyof FilterState)}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <span className="mr-1">×</span>
                {getFilterTypeLabel(filterType as keyof FilterState)} ({values.length})
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}


