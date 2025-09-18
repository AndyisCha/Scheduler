import type { SlotConfig, ScheduleResult, TTScheduleResult, MWFScheduleResult } from '../types/scheduler';

export interface ConstraintViolation {
  type: 'unavailable' | 'homeroom_disabled' | 'max_homerooms' | 'missing_assignment';
  teacher: string;
  day: string;
  period: number;
  message: string;
  severity: 'warning' | 'error';
}

export interface ValidationResult {
  isValid: boolean;
  violations: ConstraintViolation[];
  warnings: string[];
}

// Overloaded function signatures
export function validateScheduleConstraints(
  slotConfig: SlotConfig,
  scheduleResult: ScheduleResult
): ValidationResult;
export function validateScheduleConstraints(
  slotConfig: SlotConfig,
  scheduleResult: TTScheduleResult
): ValidationResult;
export function validateScheduleConstraints(
  slotConfig: SlotConfig,
  scheduleResult: MWFScheduleResult
): ValidationResult;
export function validateScheduleConstraints(
  slotConfig: SlotConfig,
  scheduleResult: ScheduleResult | TTScheduleResult | MWFScheduleResult
): ValidationResult {
  const violations: ConstraintViolation[] = [];
  const warnings: string[] = [];

  const { slot } = slotConfig;
  const constraints = (slot as any).constraints || [];

  // Check each day and period in the schedule
  Object.entries(scheduleResult).forEach(([day, daySchedule]) => {
    Object.entries(daySchedule).forEach(([periodStr, assignmentData]) => {
      const period = parseInt(periodStr);
      
      // Handle both single assignment and array of assignments
      const assignments = Array.isArray(assignmentData) ? assignmentData : (assignmentData ? [assignmentData] : []);
      
      assignments.forEach(assignment => {
        if (assignment) {
          const teacherName = assignment.teacher;
          const constraint = constraints.find((c: any) => c.teacherName === teacherName);
          
          if (constraint) {
            // Check if teacher is scheduled during unavailable time
            const slotKey = `${day}|${period}`;
            if (constraint.unavailable.includes(slotKey)) {
              violations.push({
                type: 'unavailable',
                teacher: teacherName,
                day,
                period,
                message: `${teacherName} 교사가 불가능한 시간(${day} ${period}교시)에 배정되었습니다`,
                severity: 'error'
              });
            }

            // Check homeroom constraints
            if (assignment.role === 'H') {
              if (constraint.homeroomDisabled) {
                violations.push({
                  type: 'homeroom_disabled',
                  teacher: teacherName,
                  day,
                  period,
                  message: `${teacherName} 교사는 담임 불가인데 담임으로 배정되었습니다`,
                  severity: 'error'
                });
              }

              // Check max homerooms constraint
              const homeroomCount = countHomeroomAssignments(teacherName, scheduleResult);
              if (homeroomCount > constraint.maxHomerooms) {
                violations.push({
                  type: 'max_homerooms',
                  teacher: teacherName,
                  day,
                  period,
                  message: `${teacherName} 교사의 담임 배정이 최대 한도(${constraint.maxHomerooms})를 초과했습니다 (현재: ${homeroomCount})`,
                  severity: 'error'
                });
              }
            }
          }
        }
      });
    });
  });

  // Check for missing assignments
  const expectedClasses = calculateExpectedClasses(slotConfig);
  const actualAssignments = countActualAssignments(scheduleResult);
  
  if (actualAssignments < expectedClasses) {
    warnings.push(`예상 배정 수(${expectedClasses})보다 실제 배정 수(${actualAssignments})가 적습니다`);
  }

  return {
    isValid: violations.length === 0,
    violations,
    warnings
  };
}

function countHomeroomAssignments(teacherName: string, scheduleResult: ScheduleResult | TTScheduleResult | MWFScheduleResult): number {
  let count = 0;
  Object.values(scheduleResult).forEach(daySchedule => {
    Object.values(daySchedule).forEach(assignmentData => {
      if (Array.isArray(assignmentData)) {
        count += assignmentData.filter(assignment => assignment.teacher === teacherName && assignment.role === 'H').length;
      } else if (assignmentData && (assignmentData as any).teacher === teacherName && (assignmentData as any).role === 'H') {
        count++;
      }
    });
  });
  return count;
}

function calculateExpectedClasses(slotConfig: SlotConfig): number {
  const { slot } = slotConfig;
  const { globalOptions } = slot;
  
  let totalClasses = 0;
  Object.values(globalOptions.roundClassCounts).forEach(count => {
    totalClasses += count;
  });
  
  return totalClasses;
}

function countActualAssignments(scheduleResult: ScheduleResult | TTScheduleResult | MWFScheduleResult): number {
  let count = 0;
  Object.values(scheduleResult).forEach(daySchedule => {
    Object.values(daySchedule).forEach(assignmentData => {
      if (Array.isArray(assignmentData)) {
        count += assignmentData.filter(assignment => assignment).length;
      } else if (assignmentData) {
        count++;
      }
    });
  });
  return count;
}

export function generateConstraintViolationMessage(violations: ConstraintViolation[]): string {
  if (violations.length === 0) {
    return '모든 제약조건이 충족되었습니다';
  }

  const errorCount = violations.filter(v => v.severity === 'error').length;
  const warningCount = violations.filter(v => v.severity === 'warning').length;

  let message = `제약조건 위반이 발견되었습니다:\n`;
  message += `• 오류: ${errorCount}개\n`;
  message += `• 경고: ${warningCount}개\n\n`;
  
  violations.slice(0, 3).forEach(violation => {
    message += `• ${violation.message}\n`;
  });

  if (violations.length > 3) {
    message += `• ... 및 ${violations.length - 3}개 더`;
  }

  return message;
}
