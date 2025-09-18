import { supabase } from '../lib/supabase';
import { sentryService } from '../lib/sentry';

export interface ScheduleSnapshot {
  id: string;
  slotId: string;
  slotName: string;
  scheduleType: 'MWF' | 'TT' | 'UNIFIED';
  name: string;
  description?: string;
  result: any;
  metrics: {
    generationTimeMs: number;
    totalAssignments: number;
    assignedCount: number;
    unassignedCount: number;
    warningsCount: number;
    teachersCount: number;
    classesCount: number;
    engineVersion: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryFilters {
  slotId?: string;
  scheduleType?: 'MWF' | 'TT' | 'UNIFIED';
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  searchTerm?: string;
}

export interface HistorySortOptions {
  field: 'createdAt' | 'slotName' | 'scheduleType' | 'generationTime' | 'assignedCount';
  direction: 'asc' | 'desc';
}

export interface ScheduleDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  teacher?: string;
  classId?: string;
  day?: string;
  period?: number;
  role?: string;
  oldValue?: any;
  newValue?: any;
  details?: string;
  editType?: 'auto' | 'manual';
  editSessionId?: string;
  editedBy?: string;
  editedAt?: string;
}

export interface ComparisonResult {
  snapshot1: ScheduleSnapshot;
  snapshot2: ScheduleSnapshot;
  differences: ScheduleDiff[];
  summary: {
    totalChanges: number;
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

class ScheduleHistoryService {
  /**
   * Get paginated list of schedule snapshots with filtering and sorting
   */
  async getSnapshots(
    filters: HistoryFilters = {},
    sortOptions: HistorySortOptions = { field: 'createdAt', direction: 'desc' },
    page: number = 1,
    pageSize: number = 20
  ): Promise<{
    snapshots: ScheduleSnapshot[];
    totalCount: number;
    totalPages: number;
  }> {
    try {
      let query = supabase
        .from('generated_schedules')
        .select(`
          *,
          slots (
            name,
            description,
            day_group
          )
        `, { count: 'exact' });

      // Apply filters
      if (filters.slotId) {
        query = query.eq('slot_id', filters.slotId);
      }

      if (filters.scheduleType) {
        query = query.eq('schedule_type', filters.scheduleType);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.createdBy) {
        query = query.eq('created_by', filters.createdBy);
      }

      if (filters.searchTerm) {
        query = query.or(`name.ilike.%${filters.searchTerm}%,slots.name.ilike.%${filters.searchTerm}%`);
      }

      // Apply sorting
      const sortField = sortOptions.field === 'generationTime' ? 'metrics->generation_time_ms' :
                       sortOptions.field === 'assignedCount' ? 'metrics->assigned_count' :
                       sortOptions.field === 'slotName' ? 'slots.name' :
                       sortOptions.field;

      query = query.order(sortField, { ascending: sortOptions.direction === 'asc' });

      // Apply pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        throw new Error(`Failed to fetch snapshots: ${error.message}`);
      }

      const snapshots: ScheduleSnapshot[] = (data || []).map((record: any) => ({
        id: record.id,
        slotId: record.slot_id,
        slotName: record.slots?.name || 'Unknown Slot',
        scheduleType: record.schedule_type,
        name: record.name || `${record.slots?.name || 'Schedule'} - ${new Date(record.created_at).toLocaleDateString()}`,
        description: record.description,
        result: record.result,
        metrics: record.metrics || {},
        createdBy: record.created_by,
        createdAt: record.created_at,
        updatedAt: record.updated_at || record.created_at,
      }));

      const totalPages = Math.ceil((count || 0) / pageSize);

      return {
        snapshots,
        totalCount: count || 0,
        totalPages,
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getSnapshots',
        filters,
        sortOptions,
      });
      throw error;
    }
  }

  /**
   * Get a specific snapshot by ID
   */
  async getSnapshot(snapshotId: string): Promise<ScheduleSnapshot> {
    try {
      const { data, error } = await supabase
        .from('generated_schedules')
        .select(`
          *,
          slots (
            name,
            description,
            day_group
          )
        `)
        .eq('id', snapshotId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch snapshot: ${error.message}`);
      }

      if (!data) {
        throw new Error('Snapshot not found');
      }

      return {
        id: data.id,
        slotId: data.slot_id,
        slotName: data.slots?.name || 'Unknown Slot',
        scheduleType: data.schedule_type,
        name: data.name || `${data.slots?.name || 'Schedule'} - ${new Date(data.created_at).toLocaleDateString()}`,
        description: data.description,
        result: data.result,
        metrics: data.metrics || {},
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at || data.created_at,
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getSnapshot',
        snapshotId,
      });
      throw error;
    }
  }


  /**
   * Compare two schedule snapshots and generate diff
   */
  async compareSnapshots(snapshot1Id: string, snapshot2Id: string): Promise<ComparisonResult> {
    try {
      const [snapshot1, snapshot2] = await Promise.all([
        this.getSnapshot(snapshot1Id),
        this.getSnapshot(snapshot2Id),
      ]);

      const differences = this.generateScheduleDiff(snapshot1.result, snapshot2.result);

      const summary = {
        totalChanges: differences.length,
        added: differences.filter(d => d.type === 'added').length,
        removed: differences.filter(d => d.type === 'removed').length,
        modified: differences.filter(d => d.type === 'modified').length,
        unchanged: differences.filter(d => d.type === 'unchanged').length,
      };

      return {
        snapshot1,
        snapshot2,
        differences,
        summary,
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'compareSnapshots',
        snapshot1Id,
        snapshot2Id,
      });
      throw error;
    }
  }

  /**
   * Generate detailed diff between two schedule results
   */
  private generateScheduleDiff(result1: any, result2: any): ScheduleDiff[] {
    const differences: ScheduleDiff[] = [];

    // Handle MWF schedule comparison
    if (result1.월 || result1.수 || result1.금 || result2.월 || result2.수 || result2.금) {
      const days = ['월', '수', '금'] as const;
      
      days.forEach(day => {
        const day1 = result1[day] || {};
        const day2 = result2[day] || {};
        
        // Compare each period
        for (let period = 1; period <= 8; period++) {
          const assignment1 = day1[period];
          const assignment2 = day2[period];
          
          if (!assignment1 && !assignment2) continue;
          
          if (!assignment1 && assignment2) {
            differences.push({
              type: 'added',
              day,
              period,
              teacher: assignment2.teacher,
              classId: assignment2.classId,
              role: assignment2.role,
              newValue: assignment2,
              details: `Added ${assignment2.role} assignment for ${assignment2.teacher} in ${assignment2.classId}`,
            });
          } else if (assignment1 && !assignment2) {
            differences.push({
              type: 'removed',
              day,
              period,
              teacher: assignment1.teacher,
              classId: assignment1.classId,
              role: assignment1.role,
              oldValue: assignment1,
              details: `Removed ${assignment1.role} assignment for ${assignment1.teacher} in ${assignment1.classId}`,
            });
          } else if (assignment1 && assignment2) {
            // Check for changes
            const changes: string[] = [];
            
            if (assignment1.teacher !== assignment2.teacher) {
              changes.push(`Teacher: ${assignment1.teacher} → ${assignment2.teacher}`);
            }
            if (assignment1.classId !== assignment2.classId) {
              changes.push(`Class: ${assignment1.classId} → ${assignment2.classId}`);
            }
            if (assignment1.role !== assignment2.role) {
              changes.push(`Role: ${assignment1.role} → ${assignment2.role}`);
            }
            if (assignment1.time !== assignment2.time) {
              changes.push(`Time: ${assignment1.time} → ${assignment2.time}`);
            }
            
            if (changes.length > 0) {
              differences.push({
                type: 'modified',
                day,
                period,
                teacher: assignment2.teacher,
                classId: assignment2.classId,
                role: assignment2.role,
                oldValue: assignment1,
                newValue: assignment2,
                details: changes.join(', '),
              });
            } else {
              differences.push({
                type: 'unchanged',
                day,
                period,
                teacher: assignment1.teacher,
                classId: assignment1.classId,
                role: assignment1.role,
                oldValue: assignment1,
                newValue: assignment2,
              });
            }
          }
        }
      });
    }

    // Handle TT schedule comparison
    if (result1.화 || result1.목 || result2.화 || result2.목) {
      const days = ['화', '목'] as const;
      
      days.forEach(day => {
        const day1 = result1[day] || {};
        const day2 = result2[day] || {};
        
        // Compare each period
        for (let period = 1; period <= 6; period++) {
          const assignment1 = day1[period];
          const assignment2 = day2[period];
          
          if (!assignment1 && !assignment2) continue;
          
          if (!assignment1 && assignment2) {
            differences.push({
              type: 'added',
              day,
              period,
              teacher: assignment2.teacher,
              classId: assignment2.classId,
              role: assignment2.role,
              newValue: assignment2,
              details: `Added ${assignment2.role} assignment for ${assignment2.teacher} in ${assignment2.classId}`,
            });
          } else if (assignment1 && !assignment2) {
            differences.push({
              type: 'removed',
              day,
              period,
              teacher: assignment1.teacher,
              classId: assignment1.classId,
              role: assignment1.role,
              oldValue: assignment1,
              details: `Removed ${assignment1.role} assignment for ${assignment1.teacher} in ${assignment1.classId}`,
            });
          } else if (assignment1 && assignment2) {
            // Check for changes (same logic as MWF)
            const changes: string[] = [];
            
            if (assignment1.teacher !== assignment2.teacher) {
              changes.push(`Teacher: ${assignment1.teacher} → ${assignment2.teacher}`);
            }
            if (assignment1.classId !== assignment2.classId) {
              changes.push(`Class: ${assignment1.classId} → ${assignment2.classId}`);
            }
            if (assignment1.role !== assignment2.role) {
              changes.push(`Role: ${assignment1.role} → ${assignment2.role}`);
            }
            if (assignment1.time !== assignment2.time) {
              changes.push(`Time: ${assignment1.time} → ${assignment2.time}`);
            }
            
            if (changes.length > 0) {
              differences.push({
                type: 'modified',
                day,
                period,
                teacher: assignment2.teacher,
                classId: assignment2.classId,
                role: assignment2.role,
                oldValue: assignment1,
                newValue: assignment2,
                details: changes.join(', '),
              });
            } else {
              differences.push({
                type: 'unchanged',
                day,
                period,
                teacher: assignment1.teacher,
                classId: assignment1.classId,
                role: assignment1.role,
                oldValue: assignment1,
                newValue: assignment2,
              });
            }
          }
        }

        // Compare exam assignments for TT
        const exam1 = day1.exam || [];
        const exam2 = day2.exam || [];
        
        // Simple comparison for exam arrays
        if (exam1.length !== exam2.length) {
          differences.push({
            type: 'modified',
            day,
            period: 4, // Exam period
            role: 'EXAM',
            oldValue: exam1,
            newValue: exam2,
            details: `Exam count changed: ${exam1.length} → ${exam2.length}`,
          });
        }
      });
    }

    return differences;
  }

  /**
   * Delete a snapshot
   */
  async deleteSnapshot(snapshotId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('generated_schedules')
        .delete()
        .eq('id', snapshotId);

      if (error) {
        throw new Error(`Failed to delete snapshot: ${error.message}`);
      }

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'deleteSnapshot',
        snapshotId,
      });
      throw error;
    }
  }

  /**
   * Get slots for filtering
   */
  async getSlotsForFilter(): Promise<Array<{ id: string; name: string; dayGroup: string }>> {
    try {
      const { data, error } = await supabase
        .from('slots')
        .select('id, name, day_group')
        .order('name');

      if (error) {
        throw new Error(`Failed to fetch slots: ${error.message}`);
      }

      return (data || []).map(slot => ({
        id: slot.id,
        name: slot.name,
        dayGroup: slot.day_group,
      }));

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getSlotsForFilter',
      });
      throw error;
    }
  }

  /**
   * Export comparison as CSV
   */
  exportComparisonAsCSV(comparison: ComparisonResult): string {
    const lines = [
      'Day,Period,Type,Teacher,Class,Role,Details',
    ];

    comparison.differences.forEach(diff => {
      lines.push([
        diff.day || '',
        diff.period?.toString() || '',
        diff.type,
        diff.teacher || '',
        diff.classId || '',
        diff.role || '',
        diff.details || '',
      ].join(','));
    });

    return lines.join('\n');
  }

  /**
   * Export comparison as ICS (iCalendar) - basic implementation
   */
  exportComparisonAsICS(comparison: ComparisonResult): string {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Schedule Diff//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    // Add events for each difference
    comparison.differences.forEach((diff, index) => {
      if (diff.type === 'added' || diff.type === 'modified') {
        const startDate = new Date();
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour duration

        lines.push(
          'BEGIN:VEVENT',
          `UID:diff-${index}-${Date.now()}@schedule.app`,
          `DTSTART:${startDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `SUMMARY:${diff.type.toUpperCase()}: ${diff.teacher} - ${diff.role}`,
          `DESCRIPTION:${diff.details || ''}`,
          'END:VEVENT'
        );
      }
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}

export const scheduleHistoryService = new ScheduleHistoryService();
