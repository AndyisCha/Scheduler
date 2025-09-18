// Schedule history and snapshot management service
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import type { UnifiedWeekResult } from '../utils/unifiedGenerator'

export interface ScheduleSnapshot {
  id: string
  slot_id: string
  day_group: 'MWF' | 'TT'
  created_by: string
  created_at: string
  generation_batch_id: string
  result: UnifiedWeekResult
  warnings: string[]
  kpis?: {
    unassigned_count: number
    fairness_deviation: number
    tt_foreign_capacity_usage?: number
  }
}

export interface HistoryListItem {
  id: string
  created_at: string
  warnings_count: number
  kpis: {
    unassigned_count: number
    fairness_deviation: number
    tt_foreign_capacity_usage?: number
  }
  created_by: string
}

export interface ComparisonResult {
  left: ScheduleSnapshot
  right: ScheduleSnapshot
  kpi_diff: {
    unassigned_count: { left: number; right: number; diff: number }
    fairness_deviation: { left: number; right: number; diff: number }
    tt_foreign_capacity_usage?: { left: number; right: number; diff: number }
  }
  teacher_diff: {
    teacher_name: string
    added_sessions: any[]
    removed_sessions: any[]
    changed_sessions: any[]
  }[]
}

class HistoryService {
  // Save a new snapshot
  async saveSnapshot(
    slotId: string,
    dayGroup: 'MWF' | 'TT',
    result: UnifiedWeekResult,
    warnings: string[],
    createdBy: string,
    generationBatchId?: string
  ): Promise<ScheduleSnapshot> {
    if (!isSupabaseConfigured || !supabase) {
      // Mock implementation
      const snapshot: ScheduleSnapshot = {
        id: `snapshot-${Date.now()}`,
        slot_id: slotId,
        day_group: dayGroup,
        created_by: createdBy,
        created_at: new Date().toISOString(),
        generation_batch_id: generationBatchId || `batch-${Date.now()}`,
        result,
        warnings,
        kpis: this.calculateKPIs(result)
      }
      return snapshot
    }

    // Real Supabase implementation
    const batchId = generationBatchId || `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const { data, error } = await supabase
      .from('generated_schedules')
      .insert({
        slot_id: slotId,
        day_group: dayGroup,
        created_by: createdBy,
        generation_batch_id: batchId,
        result: result,
        warnings: warnings
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to save snapshot: ${error.message}`)
    }

    return {
      id: data.id,
      slot_id: data.slot_id,
      day_group: data.day_group,
      created_by: data.created_by,
      created_at: data.created_at,
      generation_batch_id: data.generation_batch_id,
      result: data.result,
      warnings: data.warnings || [],
      kpis: this.calculateKPIs(result)
    }
  }

  // Get history list for a slot
  async getHistoryList(
    slotId: string,
    userId: string,
    userRole: 'ADMIN' | 'SUPER_ADMIN'
  ): Promise<HistoryListItem[]> {
    if (!isSupabaseConfigured || !supabase) {
      // Mock implementation
      return [
        {
          id: 'snapshot-1',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          warnings_count: 2,
          kpis: {
            unassigned_count: 0,
            fairness_deviation: 0.5,
            tt_foreign_capacity_usage: 85
          },
          created_by: userId
        },
        {
          id: 'snapshot-2',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          warnings_count: 1,
          kpis: {
            unassigned_count: 1,
            fairness_deviation: 0.8,
            tt_foreign_capacity_usage: 90
          },
          created_by: userId
        }
      ]
    }

    let query = supabase
      .from('generated_schedules')
      .select('*')
      .eq('slot_id', slotId)
      .order('created_at', { ascending: false })

    // Apply RLS based on user role
    if (userRole === 'ADMIN') {
      query = query.eq('created_by', userId)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch history: ${error.message}`)
    }

    return data.map(item => ({
      id: item.id,
      created_at: item.created_at,
      warnings_count: item.warnings?.length || 0,
      kpis: this.calculateKPIs(item.result),
      created_by: item.created_by
    }))
  }

  // Get full snapshot by ID
  async getSnapshot(
    snapshotId: string,
    userId: string,
    userRole: 'ADMIN' | 'SUPER_ADMIN'
  ): Promise<ScheduleSnapshot> {
    if (!isSupabaseConfigured || !supabase) {
      // Mock implementation
      throw new Error('Mock snapshot retrieval not implemented')
    }

    let query = supabase
      .from('generated_schedules')
      .select('*')
      .eq('id', snapshotId)
      .single()

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch snapshot: ${error.message}`)
    }

    // Check access permissions
    if (userRole === 'ADMIN' && data.created_by !== userId) {
      throw new Error('Access denied: You can only access your own snapshots')
    }

    return {
      id: data.id,
      slot_id: data.slot_id,
      day_group: data.day_group,
      created_by: data.created_by,
      created_at: data.created_at,
      generation_batch_id: data.generation_batch_id,
      result: data.result,
      warnings: data.warnings || [],
      kpis: this.calculateKPIs(data.result)
    }
  }

  // Compare two snapshots
  async compareSnapshots(
    leftId: string,
    rightId: string,
    userId: string,
    userRole: 'ADMIN' | 'SUPER_ADMIN'
  ): Promise<ComparisonResult> {
    const [left, right] = await Promise.all([
      this.getSnapshot(leftId, userId, userRole),
      this.getSnapshot(rightId, userId, userRole)
    ])

    return {
      left,
      right,
      kpi_diff: {
        unassigned_count: {
          left: left.kpis?.unassigned_count || 0,
          right: right.kpis?.unassigned_count || 0,
          diff: (right.kpis?.unassigned_count || 0) - (left.kpis?.unassigned_count || 0)
        },
        fairness_deviation: {
          left: left.kpis?.fairness_deviation || 0,
          right: right.kpis?.fairness_deviation || 0,
          diff: (right.kpis?.fairness_deviation || 0) - (left.kpis?.fairness_deviation || 0)
        },
        tt_foreign_capacity_usage: left.kpis?.tt_foreign_capacity_usage && right.kpis?.tt_foreign_capacity_usage ? {
          left: left.kpis.tt_foreign_capacity_usage,
          right: right.kpis.tt_foreign_capacity_usage,
          diff: right.kpis.tt_foreign_capacity_usage - left.kpis.tt_foreign_capacity_usage
        } : undefined
      },
      teacher_diff: this.calculateTeacherDiff(left.result, right.result)
    }
  }

  // Calculate KPIs from result
  private calculateKPIs(result: UnifiedWeekResult): {
    unassigned_count: number
    fairness_deviation: number
    tt_foreign_capacity_usage?: number
  } {
    const unassigned_count = result.warnings.filter(w => w.includes('미배정')).length
    const fairness_deviation = this.calculateFairnessDeviation(result)
    
    // Calculate TT foreign capacity usage if TT data exists
    let tt_foreign_capacity_usage: number | undefined
    if (result.ttResult) {
      const ttTeachers = Object.keys(result.ttResult.teacherSummary)
      const ttForeignTeachers = ttTeachers.filter(teacher => {
        const sessions = Object.values(result.ttResult!.teacherSummary[teacher]).flat()
        return sessions.some((session: any) => session.role === 'F')
      }).length
      tt_foreign_capacity_usage = ttTeachers.length > 0 ? (ttForeignTeachers / ttTeachers.length) * 100 : 0
    }

    return {
      unassigned_count,
      fairness_deviation,
      tt_foreign_capacity_usage
    }
  }

  // Calculate fairness deviation from teacher summary
  private calculateFairnessDeviation(result: UnifiedWeekResult): number {
    const mwfTeachers = result.mwfResult ? Object.keys(result.mwfResult.teacherSummary) : []
    const ttTeachers = result.ttResult ? Object.keys(result.ttResult.teacherSummary) : []
    const allTeachers = [...mwfTeachers, ...ttTeachers]
    
    if (allTeachers.length === 0) return 0

    // Calculate total sessions per teacher from unified summary
    const teacherSessionCounts = Object.keys(result.teacherSummary).map(teacher => {
      const totalSessions = Object.values(result.teacherSummary[teacher]).flat().length
      return totalSessions
    })

    if (teacherSessionCounts.length === 0) return 0

    const averageSessions = teacherSessionCounts.reduce((sum, count) => sum + count, 0) / teacherSessionCounts.length
    const deviations = teacherSessionCounts.map(count => Math.abs(count - averageSessions))
    return deviations.reduce((sum, d) => sum + d, 0) / deviations.length
  }

  // Calculate teacher-level differences between two results
  private calculateTeacherDiff(left: UnifiedWeekResult, right: UnifiedWeekResult): ComparisonResult['teacher_diff'] {
    // Use unified teacher summaries instead of individual results
    const leftTeacherSessions = new Map<string, any[]>()
    const rightTeacherSessions = new Map<string, any[]>()
    
    // Extract sessions from unified summaries
    Object.entries(left.teacherSummary).forEach(([teacher, days]) => {
      const allSessions = Object.values(days).flat()
      leftTeacherSessions.set(teacher, allSessions)
    })
    
    Object.entries(right.teacherSummary).forEach(([teacher, days]) => {
      const allSessions = Object.values(days).flat()
      rightTeacherSessions.set(teacher, allSessions)
    })

    const allTeacherNames = new Set([...leftTeacherSessions.keys(), ...rightTeacherSessions.keys()])
    const diff: ComparisonResult['teacher_diff'] = []

    for (const teacherName of allTeacherNames) {
      const leftSessions = leftTeacherSessions.get(teacherName) || []
      const rightSessions = rightTeacherSessions.get(teacherName) || []

      if (leftSessions.length === 0 && rightSessions.length > 0) {
        // Teacher added
        diff.push({
          teacher_name: teacherName,
          added_sessions: rightSessions,
          removed_sessions: [],
          changed_sessions: []
        })
      } else if (leftSessions.length > 0 && rightSessions.length === 0) {
        // Teacher removed
        diff.push({
          teacher_name: teacherName,
          added_sessions: [],
          removed_sessions: leftSessions,
          changed_sessions: []
        })
      } else if (leftSessions.length > 0 && rightSessions.length > 0) {
        // Compare sessions
        
        const addedSessions = rightSessions.filter((rs: any) => 
          !leftSessions.some((ls: any) => ls.timeSlot === rs.timeSlot && ls.classId === rs.classId)
        )
        const removedSessions = leftSessions.filter((ls: any) => 
          !rightSessions.some((rs: any) => rs.timeSlot === ls.timeSlot && ls.classId === rs.classId)
        )
        const changedSessions = rightSessions.filter((rs: any) => {
          const leftSession = leftSessions.find((ls: any) => ls.timeSlot === rs.timeSlot && ls.classId === rs.classId)
          return leftSession && JSON.stringify(leftSession) !== JSON.stringify(rs)
        })

        if (addedSessions.length > 0 || removedSessions.length > 0 || changedSessions.length > 0) {
          diff.push({
            teacher_name: teacherName,
            added_sessions: addedSessions,
            removed_sessions: removedSessions,
            changed_sessions: changedSessions
          })
        }
      }
    }

    return diff
  }

  // Export comparison to CSV
  exportComparisonToCSV(comparison: ComparisonResult): string {
    const headers = ['Teacher', 'Change Type', 'Time Slot', 'Class ID', 'Role', 'Details']
    const rows: string[][] = [headers]

    for (const teacherDiff of comparison.teacher_diff) {
      // Added sessions
      for (const session of teacherDiff.added_sessions) {
        rows.push([
          teacherDiff.teacher_name,
          'Added',
          session.timeSlot || '',
          session.classId || '',
          session.role || '',
          JSON.stringify(session)
        ])
      }

      // Removed sessions
      for (const session of teacherDiff.removed_sessions) {
        rows.push([
          teacherDiff.teacher_name,
          'Removed',
          session.timeSlot || '',
          session.classId || '',
          session.role || '',
          JSON.stringify(session)
        ])
      }

      // Changed sessions
      for (const session of teacherDiff.changed_sessions) {
        rows.push([
          teacherDiff.teacher_name,
          'Changed',
          session.timeSlot || '',
          session.classId || '',
          session.role || '',
          JSON.stringify(session)
        ])
      }
    }

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
  }
}

export const historyService = new HistoryService()
