import { useState } from 'react'
import type { FilterState } from '../hooks/useScheduleFilter'

interface ScheduleFiltersProps {
  filters: FilterState
  filterOptions: {
    teachers: string[]
    classes: string[]
    days: string[]
    roles: string[]
    rounds: string[]
  }
  onFilterChange: (filterType: keyof FilterState, value: string | string[]) => void
  onToggleFilter: (filterType: keyof FilterState, value: string) => void
  onClearFilter: (filterType?: keyof FilterState) => void
  onClearAll: () => void
  hasActiveFilters: boolean
  activeFilterCount: number
  isLoading?: boolean
}

export function ScheduleFilters({
  filters,
  filterOptions,
  onToggleFilter,
  onClearFilter,
  onClearAll,
  hasActiveFilters,
  activeFilterCount,
  isLoading = false
}: ScheduleFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['teachers', 'classes']))

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
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

  const getDayLabel = (day: string) => {
    return day
  }

  const renderMultiSelect = (
    title: string,
    options: string[],
    selectedValues: string[],
    filterType: keyof FilterState,
    keyPrefix: string
  ) => {
    const isExpanded = expandedSections.has(keyPrefix)

    return (
      <div className="border border-gray-200 rounded-lg">
        <button
          onClick={() => toggleSection(keyPrefix)}
          className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">{title}</span>
            {selectedValues.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {selectedValues.length}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isExpanded && (
          <div className="px-4 pb-4">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {options.map((option) => (
                <label
                  key={option}
                  className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option)}
                    onChange={() => onToggleFilter(filterType, option)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>
            {selectedValues.length > 0 && (
              <button
                onClick={() => onClearFilter(filterType)}
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                모두 선택 해제
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  const renderChipSelect = (
    title: string,
    options: string[],
    selectedValues: string[],
    filterType: keyof FilterState,
    getLabel?: (value: string) => string,
    getColor?: (value: string) => string
  ) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">{title}</h3>
          {selectedValues.length > 0 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {selectedValues.length}개 선택
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const isSelected = selectedValues.includes(option)
            const label = getLabel ? getLabel(option) : option
            const colorClass = isSelected 
              ? (getColor ? getColor(option) : 'bg-blue-100 text-blue-800 border-blue-200')
              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'

            return (
              <button
                key={option}
                onClick={() => onToggleFilter(filterType, option)}
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors ${colorClass}`}
              >
                {label}
              </button>
            )
          })}
        </div>
        {selectedValues.length > 0 && (
          <button
            onClick={() => onClearFilter(filterType)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            모두 선택 해제
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">스케줄 필터</h2>
          <p className="text-sm text-gray-500">
            조건에 맞는 스케줄을 빠르게 찾아보세요
          </p>
        </div>
        {hasActiveFilters && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              {activeFilterCount}개 필터 활성
            </span>
            <button
              onClick={onClearAll}
              className="text-sm text-red-600 hover:text-red-800 font-medium"
            >
              모두 초기화
            </button>
          </div>
        )}
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-sm text-gray-600">필터 적용 중...</span>
        </div>
      )}

      {/* Filter Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teachers */}
        {renderMultiSelect(
          '교사',
          filterOptions.teachers,
          filters.teachers,
          'teachers',
          'teachers'
        )}

        {/* Classes */}
        {renderMultiSelect(
          '클래스',
          filterOptions.classes,
          filters.classes,
          'classes',
          'classes'
        )}

        {/* Days */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">요일</h3>
            {filters.days.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {filters.days.length}개 선택
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {filterOptions.days.map((day) => (
              <label
                key={day}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={filters.days.includes(day)}
                  onChange={() => onToggleFilter('days', day)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{getDayLabel(day)}</span>
              </label>
            ))}
          </div>
          {filters.days.length > 0 && (
            <button
              onClick={() => onClearFilter('days')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              모두 선택 해제
            </button>
          )}
        </div>

        {/* Roles */}
        {renderChipSelect(
          '역할',
          filterOptions.roles,
          filters.roles,
          'roles',
          getRoleLabel,
          getRoleColor
        )}

        {/* Rounds */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">라운드</h3>
            {filters.rounds.length > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {filters.rounds.length}개 선택
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {filterOptions.rounds.map((round) => (
              <button
                key={round}
                onClick={() => onToggleFilter('rounds', round)}
                className={`inline-flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                  filters.rounds.includes(round)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                }`}
              >
                {round}
              </button>
            ))}
          </div>
          {filters.rounds.length > 0 && (
            <button
              onClick={() => onClearFilter('rounds')}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              모두 선택 해제
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {hasActiveFilters && (
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              활성 필터가 적용되어 결과가 필터링됩니다
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onClearAll}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                모든 필터 초기화
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


