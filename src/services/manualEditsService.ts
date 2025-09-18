import { supabase } from '../lib/supabase';
import { sentryService } from '../lib/sentry';
import type { MWFScheduleResult, TTScheduleResult, Assignment } from '../engine/types';

// Define TTAssignment as an alias for Assignment since they're the same type
type TTAssignment = Assignment;

export interface ManualEdit {
  id: string;
  snapshot_id: string;
  edit_type: 'assignment_change' | 'teacher_swap' | 'time_change' | 'class_change' | 'role_change';
  day: string;
  period: number;
  old_value: Assignment | TTAssignment | null;
  new_value: Assignment | TTAssignment | null;
  conflict_warnings: string[];
  edited_by: string;
  edited_at: string;
  validated: boolean;
  validation_errors: string[];
}

export interface EditConflict {
  type: 'teacher_double_booked' | 'class_double_booked' | 'teacher_unavailable' | 'constraint_violation';
  severity: 'error' | 'warning';
  message: string;
  affected_cells: Array<{ day: string; period: number }>;
  suggested_fixes?: Array<{ action: string; description: string }>;
}

export interface EditValidationResult {
  isValid: boolean;
  conflicts: EditConflict[];
  warnings: string[];
  canSave: boolean;
}

export interface ManualEditSession {
  id: string;
  snapshot_id: string;
  session_name: string;
  edits: ManualEdit[];
  validation_result: EditValidationResult;
  created_by: string;
  created_at: string;
  saved_at: string | null;
  is_active: boolean;
}

export interface SaveEditResult {
  success: boolean;
  newSnapshotId?: string;
  conflicts?: EditConflict[];
  message: string;
}

class ManualEditsService {
  /**
   * Start a new manual edit session
   */
  async startEditSession(
    snapshotId: string,
    sessionName: string,
    originalData: MWFScheduleResult | TTScheduleResult
  ): Promise<ManualEditSession> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const sessionId = crypto.randomUUID();
      
      const session: ManualEditSession = {
        id: sessionId,
        snapshot_id: snapshotId,
        session_name: sessionName,
        edits: [],
        validation_result: {
          isValid: true,
          conflicts: [],
          warnings: [],
          canSave: true
        },
        created_by: user.id,
        created_at: new Date().toISOString(),
        saved_at: null,
        is_active: true
      };

      // Store session in localStorage for client-side editing
      localStorage.setItem(`edit_session_${sessionId}`, JSON.stringify(session));
      localStorage.setItem(`original_data_${sessionId}`, JSON.stringify(originalData));

      return session;

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'startEditSession',
        snapshotId,
      });
      throw error;
    }
  }

  /**
   * Apply a manual edit to the schedule
   */
  async applyEdit(
    sessionId: string,
    day: string,
    period: number,
    newValue: Assignment | TTAssignment | null,
    editType: ManualEdit['edit_type'] = 'assignment_change'
  ): Promise<{ success: boolean; conflicts: EditConflict[]; warnings: string[] }> {
    try {
      const session = this.getEditSession(sessionId);
      if (!session) {
        throw new Error('Edit session not found');
      }

      const originalData = this.getOriginalData(sessionId);
      if (!originalData) {
        throw new Error('Original data not found');
      }

      // Get current value
      const oldValue = this.getCurrentValue(originalData, session, day, period);

      // Create edit record
      const edit: ManualEdit = {
        id: crypto.randomUUID(),
        snapshot_id: session.snapshot_id,
        edit_type: editType,
        day,
        period,
        old_value: oldValue,
        new_value: newValue,
        conflict_warnings: [],
        edited_by: session.created_by,
        edited_at: new Date().toISOString(),
        validated: false,
        validation_errors: []
      };

      // Validate the edit
      const validation = await this.validateEdit(sessionId, edit, originalData);
      edit.validated = validation.isValid;
      edit.validation_errors = validation.conflicts.map(c => c.message);

      // Add edit to session
      session.edits.push(edit);
      session.validation_result = validation;

      // Update session in localStorage
      localStorage.setItem(`edit_session_${sessionId}`, JSON.stringify(session));

      return {
        success: validation.isValid,
        conflicts: validation.conflicts,
        warnings: validation.warnings
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'applyEdit',
        sessionId,
        day,
        period,
      });
      throw error;
    }
  }

  /**
   * Validate a single edit against the current schedule state
   */
  private async validateEdit(
    sessionId: string,
    edit: ManualEdit,
    originalData: MWFScheduleResult | TTScheduleResult
  ): Promise<EditValidationResult> {
    const conflicts: EditConflict[] = [];
    const warnings: string[] = [];

    try {
      // Get current schedule state with all applied edits
      const currentState = this.getCurrentScheduleState(sessionId, originalData);

      // Check for teacher double-booking
      if (edit.new_value?.teacher) {
        const teacherConflicts = this.checkTeacherConflicts(
          currentState,
          edit.new_value.teacher,
          edit.day,
          edit.period,
          edit.new_value
        );
        conflicts.push(...teacherConflicts);
      }

      // Check for class double-booking
      if (edit.new_value?.classId) {
        const classConflicts = this.checkClassConflicts(
          currentState,
          edit.new_value.classId,
          edit.day,
          edit.period,
          edit.new_value
        );
        conflicts.push(...classConflicts);
      }

      // Check for constraint violations
      const constraintViolations = await this.checkConstraintViolations(
        edit,
        currentState
      );
      conflicts.push(...constraintViolations);

      // Generate warnings
      if (edit.new_value && !edit.old_value) {
        warnings.push('새로운 배정이 추가되었습니다.');
      } else if (!edit.new_value && edit.old_value) {
        warnings.push('배정이 제거되었습니다.');
      } else if (edit.new_value && edit.old_value) {
        warnings.push('배정이 변경되었습니다.');
      }

      const hasErrors = conflicts.some(c => c.severity === 'error');

      return {
        isValid: !hasErrors,
        conflicts,
        warnings,
        canSave: !hasErrors
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'validateEdit',
        sessionId,
        editId: edit.id,
      });
      
      return {
        isValid: false,
        conflicts: [{
          type: 'constraint_violation',
          severity: 'error',
          message: '편집 검증 중 오류가 발생했습니다.',
          affected_cells: [{ day: edit.day, period: edit.period }]
        }],
        warnings: [],
        canSave: false
      };
    }
  }

  /**
   * Check for teacher conflicts
   */
  private checkTeacherConflicts(
    schedule: MWFScheduleResult | TTScheduleResult,
    teacher: string,
    day: string,
    period: number,
    newAssignment: Assignment | TTAssignment
  ): EditConflict[] {
    const conflicts: EditConflict[] = [];

    // Find all assignments for this teacher on the same day
    const teacherAssignments = this.findTeacherAssignments(schedule, teacher, day);
    
    // Check for time conflicts
    const timeConflicts = teacherAssignments.filter(assignment => 
      assignment.period !== period && 
      this.hasTimeConflict(assignment, newAssignment)
    );

    if (timeConflicts.length > 0) {
      conflicts.push({
        type: 'teacher_double_booked',
        severity: 'error',
        message: `${teacher} 선생님이 ${day}요일 ${period}교시에 이미 다른 수업이 있습니다.`,
        affected_cells: timeConflicts.map(a => ({ day, period: a.period })),
        suggested_fixes: [
          {
            action: 'swap_teachers',
            description: '다른 교시의 선생님과 교체'
          },
          {
            action: 'unassign',
            description: '현재 배정을 취소'
          }
        ]
      });
    }

    return conflicts;
  }

  /**
   * Check for class conflicts
   */
  private checkClassConflicts(
    schedule: MWFScheduleResult | TTScheduleResult,
    classId: string,
    day: string,
    period: number,
    newAssignment: Assignment | TTAssignment
  ): EditConflict[] {
    const conflicts: EditConflict[] = [];

    // Find all assignments for this class on the same day
    const classAssignments = this.findClassAssignments(schedule, classId, day);
    
    // Check for time conflicts
    const timeConflicts = classAssignments.filter(assignment => 
      assignment.period !== period && 
      this.hasTimeConflict(assignment, newAssignment)
    );

    if (timeConflicts.length > 0) {
      conflicts.push({
        type: 'class_double_booked',
        severity: 'error',
        message: `${classId} 반이 ${day}요일 ${period}교시에 이미 다른 수업이 있습니다.`,
        affected_cells: timeConflicts.map(a => ({ day, period: a.period })),
        suggested_fixes: [
          {
            action: 'swap_classes',
            description: '다른 교시의 반과 교체'
          },
          {
            action: 'unassign',
            description: '현재 배정을 취소'
          }
        ]
      });
    }

    return conflicts;
  }

  /**
   * Check constraint violations
   */
  private async checkConstraintViolations(
    edit: ManualEdit,
    schedule: MWFScheduleResult | TTScheduleResult
  ): Promise<EditConflict[]> {
    const conflicts: EditConflict[] = [];

    // This would integrate with the existing constraint validation logic
    // For now, we'll add basic checks

    if (edit.new_value?.role === 'EXAM' && edit.new_value?.teacher) {
      // Check if teacher is available for exam supervision
      const teacherAssignments = this.findTeacherAssignments(schedule, edit.new_value.teacher, edit.day);
      const hasRegularClass = teacherAssignments.some(a => a.role !== 'EXAM');
      
      if (hasRegularClass) {
        conflicts.push({
          type: 'constraint_violation',
          severity: 'warning',
          message: '감독 선생님이 같은 시간에 정규 수업이 있습니다.',
          affected_cells: [{ day: edit.day, period: edit.period }]
        });
      }
    }

    return conflicts;
  }

  /**
   * Save the edited schedule as a new snapshot
   */
  async saveEditedSchedule(sessionId: string): Promise<SaveEditResult> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Authentication required');
      }

      const session = this.getEditSession(sessionId);
      if (!session) {
        throw new Error('Edit session not found');
      }

      if (!session.validation_result.canSave) {
        return {
          success: false,
          conflicts: session.validation_result.conflicts,
          message: '저장할 수 없는 편집이 있습니다. 충돌을 해결해주세요.'
        };
      }

      const originalData = this.getOriginalData(sessionId);
      if (!originalData) {
        throw new Error('Original data not found');
      }

      // Apply all edits to create new schedule
      const editedSchedule = this.applyAllEdits(originalData, session.edits);

      // Create new snapshot
      const { data: newSnapshot, error } = await supabase
        .from('generated_schedules')
        .insert({
          slot_id: session.snapshot_id, // Reference to original slot
          schedule_type: this.getScheduleType(originalData),
          name: `Manual Edit: ${session.session_name}`,
          description: `Manually edited schedule with ${session.edits.length} changes`,
          result: editedSchedule,
          metrics: {
            generationTimeMs: 0,
            totalAssignments: this.countAssignments(editedSchedule),
            assignedCount: this.countAssigned(editedSchedule),
            unassignedCount: this.countUnassigned(editedSchedule),
            warningsCount: session.validation_result.warnings.length,
            teachersCount: this.countUniqueTeachers(editedSchedule),
            classesCount: this.countUniqueClasses(editedSchedule),
            engineVersion: 'manual-edit',
            editSessionId: sessionId,
            manualEditsCount: session.edits.length
          },
          created_by: user.id
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save edited schedule: ${error.message}`);
      }

      // Save edit audit trail
      await this.saveEditAuditTrail(session, newSnapshot.id, user.id);

      // Mark session as saved
      session.saved_at = new Date().toISOString();
      session.is_active = false;
      localStorage.setItem(`edit_session_${sessionId}`, JSON.stringify(session));

      return {
        success: true,
        newSnapshotId: newSnapshot.id,
        message: '편집된 스케줄이 성공적으로 저장되었습니다.'
      };

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'saveEditedSchedule',
        sessionId,
      });
      throw error;
    }
  }

  /**
   * Save edit audit trail to database
   */
  private async saveEditAuditTrail(
    session: ManualEditSession,
    newSnapshotId: string,
    userId: string
  ): Promise<void> {
    try {
      const auditRecords = session.edits.map(edit => ({
        original_snapshot_id: session.snapshot_id,
        new_snapshot_id: newSnapshotId,
        edit_session_id: session.id,
        edit_id: edit.id,
        edit_type: edit.edit_type,
        day: edit.day,
        period: edit.period,
        old_value: edit.old_value,
        new_value: edit.new_value,
        conflict_warnings: edit.conflict_warnings,
        validation_errors: edit.validation_errors,
        edited_by: edit.edited_by,
        edited_at: edit.edited_at,
        created_by: userId
      }));

      const { error } = await supabase
        .from('manual_edit_audit')
        .insert(auditRecords);

      if (error) {
        console.error('Failed to save edit audit trail:', error);
        // Don't throw - audit trail failure shouldn't prevent save
      }

    } catch (error) {
      console.error('Error saving edit audit trail:', error);
    }
  }

  /**
   * Get edit session from localStorage
   */
  private getEditSession(sessionId: string): ManualEditSession | null {
    try {
      const sessionData = localStorage.getItem(`edit_session_${sessionId}`);
      return sessionData ? JSON.parse(sessionData) : null;
    } catch (error) {
      console.error('Error loading edit session:', error);
      return null;
    }
  }

  /**
   * Get original data from localStorage
   */
  private getOriginalData(sessionId: string): MWFScheduleResult | TTScheduleResult | null {
    try {
      const originalData = localStorage.getItem(`original_data_${sessionId}`);
      return originalData ? JSON.parse(originalData) : null;
    } catch (error) {
      console.error('Error loading original data:', error);
      return null;
    }
  }

  /**
   * Get current schedule state with all edits applied
   */
  private getCurrentScheduleState(
    sessionId: string,
    originalData: MWFScheduleResult | TTScheduleResult
  ): MWFScheduleResult | TTScheduleResult {
    const session = this.getEditSession(sessionId);
    if (!session) return originalData;

    return this.applyAllEdits(originalData, session.edits);
  }

  /**
   * Apply all edits to the original data
   */
  private applyAllEdits(
    originalData: MWFScheduleResult | TTScheduleResult,
    edits: ManualEdit[]
  ): MWFScheduleResult | TTScheduleResult {
    const result = JSON.parse(JSON.stringify(originalData)); // Deep clone

    edits.forEach(edit => {
      if (!result[edit.day]) {
        result[edit.day] = {};
      }
      result[edit.day][edit.period] = edit.new_value;
    });

    return result;
  }

  /**
   * Get current value for a cell (considering all edits)
   */
  private getCurrentValue(
    originalData: MWFScheduleResult | TTScheduleResult,
    session: ManualEditSession,
    day: string,
    period: number
  ): Assignment | TTAssignment | null {
    // Find the most recent edit for this cell
    const cellEdit = session.edits
      .filter(edit => edit.day === day && edit.period === period)
      .sort((a, b) => new Date(b.edited_at).getTime() - new Date(a.edited_at).getTime())[0];

    if (cellEdit) {
      return cellEdit.new_value;
    }

    // Return original value - handle array case for TT schedules
    const originalValue = originalData[day]?.[period];
    if (Array.isArray(originalValue)) {
      return originalValue[0] || null;
    }
    return originalValue || null;
  }

  // Helper methods for conflict detection
  private findTeacherAssignments(
    schedule: MWFScheduleResult | TTScheduleResult,
    teacher: string,
    day: string
  ): Array<Assignment | TTAssignment & { period: number }> {
    const assignments: Array<Assignment | TTAssignment & { period: number }> = [];
    const dayData = schedule[day];
    
    if (dayData) {
      Object.entries(dayData).forEach(([period, assignment]) => {
        if (assignment?.teacher === teacher) {
          assignments.push({ ...assignment, period: parseInt(period) });
        }
      });
    }

    return assignments;
  }

  private findClassAssignments(
    schedule: MWFScheduleResult | TTScheduleResult,
    classId: string,
    day: string
  ): Array<Assignment | TTAssignment & { period: number }> {
    const assignments: Array<Assignment | TTAssignment & { period: number }> = [];
    const dayData = schedule[day];
    
    if (dayData) {
      Object.entries(dayData).forEach(([period, assignment]) => {
        if (assignment?.classId === classId) {
          assignments.push({ ...assignment, period: parseInt(period) });
        }
      });
    }

    return assignments;
  }

  private hasTimeConflict(assignment1: any, assignment2: any): boolean {
    // Simple time conflict check - can be enhanced
    return assignment1.time === assignment2.time;
  }

  private getScheduleType(data: any): 'MWF' | 'TT' | 'UNIFIED' {
    if (data.월 || data.수 || data.금) return 'MWF';
    if (data.화 || data.목) return 'TT';
    return 'UNIFIED';
  }

  private countAssignments(schedule: any): number {
    let count = 0;
    Object.values(schedule).forEach((day: any) => {
      if (day && typeof day === 'object') {
        count += Object.values(day).length;
      }
    });
    return count;
  }

  private countAssigned(schedule: any): number {
    let count = 0;
    Object.values(schedule).forEach((day: any) => {
      if (day && typeof day === 'object') {
        Object.values(day).forEach((assignment: any) => {
          if (assignment && assignment.teacher) count++;
        });
      }
    });
    return count;
  }

  private countUnassigned(schedule: any): number {
    return this.countAssignments(schedule) - this.countAssigned(schedule);
  }

  private countUniqueTeachers(schedule: any): number {
    const teachers = new Set();
    Object.values(schedule).forEach((day: any) => {
      if (day && typeof day === 'object') {
        Object.values(day).forEach((assignment: any) => {
          if (assignment?.teacher) teachers.add(assignment.teacher);
        });
      }
    });
    return teachers.size;
  }

  private countUniqueClasses(schedule: any): number {
    const classes = new Set();
    Object.values(schedule).forEach((day: any) => {
      if (day && typeof day === 'object') {
        Object.values(day).forEach((assignment: any) => {
          if (assignment?.classId) classes.add(assignment.classId);
        });
      }
    });
    return classes.size;
  }

  /**
   * Get edit session history for a snapshot
   */
  async getEditHistory(snapshotId: string): Promise<ManualEditSession[]> {
    try {
      const { data, error } = await supabase
        .from('manual_edit_audit')
        .select('*')
        .eq('original_snapshot_id', snapshotId)
        .order('edited_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch edit history: ${error.message}`);
      }

      // Group edits by session
      const sessionMap = new Map<string, ManualEditSession>();
      
      data.forEach((record: any) => {
        const sessionId = record.edit_session_id;
        
        if (!sessionMap.has(sessionId)) {
          sessionMap.set(sessionId, {
            id: sessionId,
            snapshot_id: snapshotId,
            session_name: `Edit Session ${sessionId.substring(0, 8)}`,
            edits: [],
            validation_result: {
              isValid: true,
              conflicts: [],
              warnings: [],
              canSave: true
            },
            created_by: record.created_by,
            created_at: record.edited_at,
            saved_at: record.edited_at,
            is_active: false
          });
        }

        const session = sessionMap.get(sessionId)!;
        session.edits.push({
          id: record.edit_id,
          snapshot_id: record.original_snapshot_id,
          edit_type: record.edit_type,
          day: record.day,
          period: record.period,
          old_value: record.old_value,
          new_value: record.new_value,
          conflict_warnings: record.conflict_warnings || [],
          edited_by: record.edited_by,
          edited_at: record.edited_at,
          validated: true,
          validation_errors: record.validation_errors || []
        });
      });

      return Array.from(sessionMap.values());

    } catch (error) {
      sentryService.captureException(error as Error, {
        operation: 'getEditHistory',
        snapshotId,
      });
      throw error;
    }
  }
}

export const manualEditsService = new ManualEditsService();
