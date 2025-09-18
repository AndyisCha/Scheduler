import { useState, useMemo, useCallback } from 'react'
import { useDebounce } from './useDebounce'
import type { ScheduleResult, Assignment } from '../types/scheduler'

export interface FilterState {
  teachers: string[]
  classes: string[]
  days: string[]
  roles: string[]
  rounds: string[]
}

export interface ScheduleFiltersProps {
  result: ScheduleResult | null
  onFiltersChange?: (filters: FilterState) => void
}

export interface FilteredResult {
  classSummary: Record<string, Assignment[]>
  teacherSummary: Record<string, Assignment[]>
  dayGrid: Record<string, Assignment[]>
  totalAssignments: number
  filteredAssignments: number
  filterStats: {
    teacherCount: number
    classCount: number
    dayCount: number
    roleCount: number
    roundCount: number
  }
}

const DEFAULT_FILTERS: FilterState = {
  teachers: [],
  classes: [],
  days: [],
  roles: [],
  rounds: []
}

export function useScheduleFilter(result: ScheduleResult | null) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [isLoading, setIsLoading] = useState(false)

  // Debounce filters to avoid excessive re-renders
  const debouncedFilters = useDebounce(filters, 150)

  // Memoize available filter options
  const filterOptions = useMemo(() => {
    if (!result) {
      return {
        teachers: [],
        classes: [],
        days: [],
        roles: [],
        rounds: []
      }
    }

    const teachers = new Set<string>()
    const classes = new Set<string>()
    const days = new Set<string>()
    const roles = new Set<string>()
    const rounds = new Set<string>()

    // Extract options from all assignments
    Object.values(result.teacherSummary || {}).forEach(assignments => {
      Object.values(assignments).forEach(dayAssignments => {
        dayAssignments.forEach((assignment: any) => {
          teachers.add(assignment.teacher)
          classes.add(assignment.classId)
          days.add(assignment.day)
          roles.add(assignment.role)
          rounds.add(`R${assignment.round}`)
        })
      })
    })

    return {
      teachers: Array.from(teachers).sort(),
      classes: Array.from(classes).sort(),
      days: Array.from(days).sort(),
      roles: Array.from(roles).sort(),
      rounds: Array.from(rounds).sort()
    }
  }, [result])

  // Create efficient indexes for fast filtering
  const indexes = useMemo(() => {
    if (!result) {
      return {
        byTeacher: new Map<string, Set<string>>(),
        byClass: new Map<string, Set<string>>(),
        byDay: new Map<string, Set<string>>(),
        byRole: new Map<string, Set<string>>(),
        byRound: new Map<string, Set<string>>(),
        assignmentIds: new Set<string>()
      }
    }

    const byTeacher = new Map<string, Set<string>>()
    const byClass = new Map<string, Set<string>>()
    const byDay = new Map<string, Set<string>>()
    const byRole = new Map<string, Set<string>>()
    const byRound = new Map<string, Set<string>>()
    const assignmentIds = new Set<string>()

    // Build indexes from all assignments
    Object.values(result.teacherSummary || {}).forEach(assignments => {
      Object.values(assignments).forEach(dayAssignments => {
        dayAssignments.forEach((assignment: any) => {
        const id = `${assignment.teacher}-${assignment.day}-${assignment.period}-${assignment.classId}`
        assignmentIds.add(id)

        // Teacher index
        if (!byTeacher.has(assignment.teacher)) {
          byTeacher.set(assignment.teacher, new Set())
        }
        byTeacher.get(assignment.teacher)!.add(id)

        // Class index
        if (!byClass.has(assignment.classId)) {
          byClass.set(assignment.classId, new Set())
        }
        byClass.get(assignment.classId)!.add(id)

        // Day index
        if (!byDay.has(assignment.day)) {
          byDay.set(assignment.day, new Set())
        }
        byDay.get(assignment.day)!.add(id)

        // Role index
        if (!byRole.has(assignment.role)) {
          byRole.set(assignment.role, new Set())
        }
        byRole.get(assignment.role)!.add(id)

        // Round index
        const roundKey = `R${assignment.round}`
        if (!byRound.has(roundKey)) {
          byRound.set(roundKey, new Set())
        }
        byRound.get(roundKey)!.add(id)
        })
      })
    })

    return {
      byTeacher,
      byClass,
      byDay,
      byRole,
      byRound,
      assignmentIds
    }
  }, [result])

  // Apply filters efficiently using set intersections
  const filteredResult = useMemo((): FilteredResult | null => {
    if (!result || !debouncedFilters) return null

    setIsLoading(true)

    try {
      // Start with all assignment IDs
      let filteredIds = new Set(indexes.assignmentIds)

      // Apply teacher filter
      if (debouncedFilters.teachers.length > 0) {
        const teacherIds = new Set<string>()
        debouncedFilters.teachers.forEach(teacher => {
          const ids = indexes.byTeacher.get(teacher)
          if (ids) {
            ids.forEach(id => teacherIds.add(id))
          }
        })
        filteredIds = new Set([...filteredIds].filter(id => teacherIds.has(id)))
      }

      // Apply class filter
      if (debouncedFilters.classes.length > 0) {
        const classIds = new Set<string>()
        debouncedFilters.classes.forEach(className => {
          const ids = indexes.byClass.get(className)
          if (ids) {
            ids.forEach(id => classIds.add(id))
          }
        })
        filteredIds = new Set([...filteredIds].filter(id => classIds.has(id)))
      }

      // Apply day filter
      if (debouncedFilters.days.length > 0) {
        const dayIds = new Set<string>()
        debouncedFilters.days.forEach(day => {
          const ids = indexes.byDay.get(day)
          if (ids) {
            ids.forEach(id => dayIds.add(id))
          }
        })
        filteredIds = new Set([...filteredIds].filter(id => dayIds.has(id)))
      }

      // Apply role filter
      if (debouncedFilters.roles.length > 0) {
        const roleIds = new Set<string>()
        debouncedFilters.roles.forEach(role => {
          const ids = indexes.byRole.get(role)
          if (ids) {
            ids.forEach(id => roleIds.add(id))
          }
        })
        filteredIds = new Set([...filteredIds].filter(id => roleIds.has(id)))
      }

      // Apply round filter
      if (debouncedFilters.rounds.length > 0) {
        const roundIds = new Set<string>()
        debouncedFilters.rounds.forEach(round => {
          const ids = indexes.byRound.get(round)
          if (ids) {
            ids.forEach(id => roundIds.add(id))
          }
        })
        filteredIds = new Set([...filteredIds].filter(id => roundIds.has(id)))
      }

      // Rebuild filtered summaries
      const filteredClassSummary: Record<string, Assignment[]> = {}
      const filteredTeacherSummary: Record<string, Assignment[]> = {}
      const filteredDayGrid: Record<string, Assignment[]> = {}

      // Collect all filtered assignments
      const filteredAssignments: Assignment[] = []
      
      Object.entries(result.teacherSummary || {}).forEach(([, assignments]) => {
        Object.values(assignments).forEach(dayAssignments => {
          dayAssignments.forEach((assignment: any) => {
          const id = `${assignment.teacher}-${assignment.day}-${assignment.period}-${assignment.classId}`
          if (filteredIds.has(id)) {
            filteredAssignments.push(assignment)

            // Add to class summary
            if (!filteredClassSummary[assignment.classId]) {
              filteredClassSummary[assignment.classId] = []
            }
            filteredClassSummary[assignment.classId].push(assignment)

            // Add to teacher summary
            if (!filteredTeacherSummary[assignment.teacher]) {
              filteredTeacherSummary[assignment.teacher] = []
            }
            filteredTeacherSummary[assignment.teacher].push(assignment)

            // Add to day grid
            if (!filteredDayGrid[assignment.day]) {
              filteredDayGrid[assignment.day] = []
            }
            filteredDayGrid[assignment.day].push(assignment)
          }
          })
        })
      })

      // Calculate total assignments for comparison
      const totalAssignments = indexes.assignmentIds.size

      // Calculate filter stats
      const filterStats = {
        teacherCount: filterOptions.teachers.length,
        classCount: filterOptions.classes.length,
        dayCount: filterOptions.days.length,
        roleCount: filterOptions.roles.length,
        roundCount: filterOptions.rounds.length
      }

      return {
        classSummary: filteredClassSummary,
        teacherSummary: filteredTeacherSummary,
        dayGrid: filteredDayGrid,
        totalAssignments,
        filteredAssignments: filteredAssignments.length,
        filterStats
      }
    } finally {
      setIsLoading(false)
    }
  }, [result, debouncedFilters, indexes, filterOptions])

  // Filter actions
  const updateFilter = useCallback((filterType: keyof FilterState, value: string | string[]) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: Array.isArray(value) ? value : [value]
    }))
  }, [])

  const toggleFilter = useCallback((filterType: keyof FilterState, value: string) => {
    setFilters(prev => {
      const currentValues = prev[filterType]
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value]
      
      return {
        ...prev,
        [filterType]: newValues
      }
    })
  }, [])

  const clearFilter = useCallback((filterType?: keyof FilterState) => {
    if (filterType) {
      setFilters(prev => ({
        ...prev,
        [filterType]: []
      }))
    } else {
      setFilters(DEFAULT_FILTERS)
    }
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(filterArray => filterArray.length > 0)
  }, [filters])

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).reduce((total, filterArray) => total + filterArray.length, 0)
  }, [filters])

  return {
    filters,
    filteredResult,
    filterOptions,
    isLoading,
    hasActiveFilters,
    activeFilterCount,
    updateFilter,
    toggleFilter,
    clearFilter,
    clearAllFilters,
    setFilters
  }
}


