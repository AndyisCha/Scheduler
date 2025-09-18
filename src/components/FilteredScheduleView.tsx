import { ScheduleFilters } from './ScheduleFilters'
import { ActiveFilterChips } from './ActiveFilterChips'
import { useScheduleFilter } from '../hooks/useScheduleFilter'
import type { ScheduleResult } from '../types/scheduler'

interface FilteredScheduleViewProps {
  result: ScheduleResult | null
  children: (filteredResult: ReturnType<typeof useScheduleFilter>['filteredResult']) => React.ReactNode
  showFilters?: boolean
  showActiveChips?: boolean
}

export function FilteredScheduleView({
  result,
  children,
  showFilters = true,
  showActiveChips = true
}: FilteredScheduleViewProps) {
  const {
    filters,
    filteredResult,
    filterOptions,
    isLoading,
    hasActiveFilters,
    activeFilterCount,
    updateFilter,
    toggleFilter,
    clearFilter,
    clearAllFilters
  } = useScheduleFilter(result)

  return (
    <div className="space-y-6">
      {/* Filters Panel */}
      {showFilters && (
        <ScheduleFilters
          filters={filters}
          filterOptions={filterOptions}
          onFilterChange={updateFilter}
          onToggleFilter={toggleFilter}
          onClearFilter={clearFilter}
          onClearAll={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
          isLoading={isLoading}
        />
      )}

      {/* Active Filter Chips */}
      {showActiveChips && hasActiveFilters && (
        <ActiveFilterChips
          filters={filters}
          filterOptions={filterOptions}
          onRemoveFilter={(filterType, value) => toggleFilter(filterType, value)}
          onClearFilter={clearFilter}
          onClearAll={clearAllFilters}
          hasActiveFilters={hasActiveFilters}
          activeFilterCount={activeFilterCount}
        />
      )}

      {/* Filtered Content */}
      {children(filteredResult)}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">필터 적용 중...</span>
        </div>
      )}
    </div>
  )
}


