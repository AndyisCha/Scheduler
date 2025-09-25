import type { MWFScheduleResult, TTScheduleResult, DayResultMWF, DayResultTT } from '../engine/unifiedScheduler';
import { coerceCellToArray } from '../types/scheduler';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  infos?: string[];
}

// TT 규칙 검증: H2/K1/F0 (라운드2에서 담임 2회, 한국인 1회, 외국인 0회)
export function validateTTRules(result: TTScheduleResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(result).forEach(([day, dayResult]) => {
    if (!dayResult) return;

    const dayData = dayResult as DayResultTT;
    
    // 라운드2 검증 (4교시, 5교시, 6교시)
    const round2Assignments = [4, 5, 6]
      .flatMap(period => coerceCellToArray(dayData.periods[period]))
      .filter(Boolean);

    if (round2Assignments.length > 0) {
      const hCount = round2Assignments.filter(a => a?.role === 'H').length;
      const kCount = round2Assignments.filter(a => a?.role === 'K').length;
      const fCount = round2Assignments.filter(a => a?.role === 'F').length;

      if (hCount !== 2) {
        errors.push(`${day}요일 라운드2: 담임(H)이 ${hCount}회 배정됨 (예상: 2회)`);
      }
      if (kCount !== 1) {
        errors.push(`${day}요일 라운드2: 한국인(K)이 ${kCount}회 배정됨 (예상: 1회)`);
      }
      if (fCount !== 0) {
        errors.push(`${day}요일 라운드2: 외국인(F)이 ${fCount}회 배정됨 (예상: 0회)`);
      }
    }

    // 시험 검증 (라운드1에만 시험이 있어야 함)
    if (dayData.wordTests.length > 0) {
      const hasRound1Classes = [1, 2, 3].some(period => coerceCellToArray(dayData.periods[period]).length > 0);
      if (!hasRound1Classes) {
        warnings.push(`${day}요일: 시험이 있지만 라운드1 수업이 없음`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    infos: []
  };
}

// MWF 규칙 검증: WT 존재, R2~4 K/F 순서
export function validateMWFRules(result: MWFScheduleResult): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  Object.entries(result).forEach(([day, dayResult]) => {
    if (!dayResult) return;

    const dayData = dayResult as DayResultMWF;
    
    // 라운드2 검증 (3교시 K, 4교시 F)
    const period3Assignments = coerceCellToArray(dayData.periods[3]);
    const period4Assignments = coerceCellToArray(dayData.periods[4]);
    
    if (period3Assignments.length === 0) {
      errors.push(`${day}요일 3교시: 교사 미배정`);
    } else {
      period3Assignments.forEach((assignment, index) => {
        if (assignment.role !== 'K') {
          errors.push(`${day}요일 3교시 ${index + 1}: ${assignment.role} 배정됨 (예상: K)`);
        }
      });
    }
    
    if (period4Assignments.length === 0) {
      errors.push(`${day}요일 4교시: 교사 미배정`);
    } else {
      period4Assignments.forEach((assignment, index) => {
        if (assignment.role !== 'F') {
          if (assignment.role === 'K') {
            warnings.push(`${day}요일 4교시 ${index + 1}: ${assignment.teacher} (K)가 F 대신 배정됨 (외국인 교사 부족으로 대체)`);
          } else {
            errors.push(`${day}요일 4교시 ${index + 1}: ${assignment.role} 배정됨 (예상: F)`);
          }
        }
      });
    }

    // 라운드3 검증 (5교시 K, 6교시 F)
    const period5Assignments = coerceCellToArray(dayData.periods[5]);
    const period6Assignments = coerceCellToArray(dayData.periods[6]);
    
    if (period5Assignments.length === 0) {
      errors.push(`${day}요일 5교시: 교사 미배정`);
    } else {
      period5Assignments.forEach((assignment, index) => {
        if (assignment.role !== 'K') {
          errors.push(`${day}요일 5교시 ${index + 1}: ${assignment.role} 배정됨 (예상: K)`);
        }
      });
    }
    
    if (period6Assignments.length === 0) {
      errors.push(`${day}요일 6교시: 교사 미배정`);
    } else {
      period6Assignments.forEach((assignment, index) => {
        if (assignment.role !== 'F') {
          if (assignment.role === 'K') {
            warnings.push(`${day}요일 6교시 ${index + 1}: ${assignment.teacher} (K)가 F 대신 배정됨 (외국인 교사 부족으로 대체)`);
          } else {
            errors.push(`${day}요일 6교시 ${index + 1}: ${assignment.role} 배정됨 (예상: F)`);
          }
        }
      });
    }

    // 라운드4 검증 (7교시 K, 8교시 F)
    const period7Assignments = coerceCellToArray(dayData.periods[7]);
    const period8Assignments = coerceCellToArray(dayData.periods[8]);
    
    if (period7Assignments.length === 0) {
      errors.push(`${day}요일 7교시: 교사 미배정`);
    } else {
      period7Assignments.forEach((assignment, index) => {
        if (assignment.role !== 'K') {
          errors.push(`${day}요일 7교시 ${index + 1}: ${assignment.role} 배정됨 (예상: K)`);
        }
      });
    }
    
    if (period8Assignments.length === 0) {
      errors.push(`${day}요일 8교시: 교사 미배정`);
    } else {
      period8Assignments.forEach((assignment, index) => {
        if (assignment.role !== 'F') {
          if (assignment.role === 'K') {
            warnings.push(`${day}요일 8교시 ${index + 1}: ${assignment.teacher} (K)가 F 대신 배정됨 (외국인 교사 부족으로 대체)`);
          } else {
            errors.push(`${day}요일 8교시 ${index + 1}: ${assignment.role} 배정됨 (예상: F)`);
          }
        }
      });
    }

    // 시험 검증
    const wordTests = dayData.wordTests;
    if (wordTests.length === 0) {
      warnings.push(`${day}요일: 단어시험이 없음`);
    } else {
      wordTests.forEach((exam, index) => {
        if (exam.role !== 'H') {
          errors.push(`${day}요일 시험 ${index + 1}: ${exam.role}가 감독 (예상: H)`);
        }
      });
    }

    // 교사 중복 검증 (같은 교사가 연속 교시에 배정되지 않았는지)
    const allAssignments = Object.values(dayData.periods)
      .flatMap(assignments => coerceCellToArray(assignments))
      .filter(Boolean);
      
    for (let i = 0; i < allAssignments.length - 1; i++) {
      const current = allAssignments[i];
      const next = allAssignments[i + 1];
      
      if (current && next && current.teacher === next.teacher && current.classId === next.classId) {
        errors.push(`${day}요일: ${current.teacher} 교사가 ${current.classId}에서 연속 배정됨`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    infos: []
  };
}

// 통합 검증 함수
export function validateScheduleConstraints(result: MWFScheduleResult | TTScheduleResult, type: 'MWF' | 'TT'): ValidationResult {
  if (type === 'TT') {
    return validateTTRules(result as TTScheduleResult);
  } else {
    return validateMWFRules(result as MWFScheduleResult);
  }
}
