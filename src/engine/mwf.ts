import type { 
  SlotConfig, 
  Assignment, 
  MWFScheduleResult, 
  ValidationResult
} from './types';
import { metricsService } from '../services/metricsService';
import { sentryService } from '../lib/sentry';

/**
 * MWF 스케줄 생성 엔진
 * 월, 수, 금 요일에 대한 스케줄을 생성합니다.
 */
export async function generateMwfSchedule(
  slotConfig: SlotConfig,
  userId?: string,
  userRole?: string
): Promise<MWFScheduleResult> {
  const timer = metricsService.createTimer('mwf_schedule_generation');
  
  try {
    sentryService.addBreadcrumb(
      'Starting MWF schedule generation',
      'scheduler',
      {
        slotId: slotConfig.id,
        teachersCount: slotConfig.teachers.homeroomKoreanPool.length + slotConfig.teachers.foreignPool.length,
        constraintsCount: Object.keys(slotConfig.teacherConstraints || {}).length,
      }
    );
  const result: MWFScheduleResult = {};
  const days: ('월' | '수' | '금')[] = ['월', '수', '금'];
  const assignments: Assignment[] = [];
  
  // 초기화
  days.forEach(day => {
    result[day] = {};
    for (let period = 1; period <= 8; period++) {
      result[day][period] = null;
    }
  });

  const { teachers, globalOptions } = slotConfig;
  const constraints = slotConfig.constraints || [];

  // Teacher pools - homeroomKoreanPool은 문자열 배열로 가정
  const homeroomTeachers = teachers.homeroomKoreanPool.map(name => ({ name, role: 'H' as const }));
  const koreanTeachers = teachers.homeroomKoreanPool.map(name => ({ name, role: 'K' as const }));
  const foreignTeachers = teachers.foreignPool.map(name => ({ name, role: 'F' as const }));

  // 라운드별 반 수
  const round1Count = globalOptions.roundClassCounts[1] || 0;
  const round2Count = globalOptions.roundClassCounts[2] || 0;

  // Helper: 특정 교사 제약 조회
  const getConstraint = (teacherName: string) =>
    constraints.find(c => c.teacherName === teacherName);

  // Helper: 공정 분배 (가장 적게 배정된 교사 우선)
  const pickTeacher = (
    pool: any[],
    used: Set<string>,
    period: number,
    role: 'H' | 'K' | 'F',
    assignments: Assignment[]
  ) => {
    const counts = new Map<string, number>();
    pool.forEach(t => {
      counts.set(
        t.name,
        assignments.filter(a => a.teacher === t.name).length
      );
    });

    const sorted = pool
      .filter(t => !used.has(t.name))
      .filter(t => {
        const cons = getConstraint(t.name);
        if (!cons) return true;
        
        // 불가능한 교시 체크
        if (cons.unavailablePeriods.includes(period)) return false;
        
        // 담임 역할 체크
        if (role === 'H' && cons.homeroomDisabled) return false;
        
        // 최대 담임 수 체크
        if (role === 'H') {
          const cur = assignments.filter(a => a.teacher === t.name && a.role === 'H').length;
          if (cur >= (cons.maxHomerooms ?? Infinity)) return false;
        }
        return true;
      })
      .sort((a, b) => (counts.get(a.name) ?? 0) - (counts.get(b.name) ?? 0));

    return sorted[0] || null;
  };

  // 반 ID 고정 (C1..Cn)
  const classIds = Array.from({ length: Math.max(round1Count, round2Count) }, (_, i) => `C${i + 1}`);

  // 각 요일별 생성
  days.forEach(day => {
    const assignments: Assignment[] = [];

    // ---- Round 1: H + K + F ----
    for (let i = 0; i < round1Count; i++) {
      const classId = classIds[i];
      const used = new Set<string>();

      // 1교시: H
      const h = pickTeacher(homeroomTeachers, used, 1, 'H', assignments);
      if (h) {
        const assignment: Assignment = { 
          teacher: h.name, 
          role: 'H', 
          classId, 
          round: 1, 
          period: 1, 
          time: '09:00-09:50' 
        };
        result[day][1] = assignment;
        assignments.push(assignment);
        used.add(h.name);
      }

      // 2교시: K
      const kPool = [...koreanTeachers];
      const k = pickTeacher(kPool, used, 2, 'K', assignments);
      if (k) {
        const assignment: Assignment = { 
          teacher: k.name, 
          role: 'K', 
          classId, 
          round: 1, 
          period: 2, 
          time: '10:00-10:50' 
        };
        result[day][2] = assignment;
        assignments.push(assignment);
        used.add(k.name);
      }

      // 3교시: F
      const f = pickTeacher(foreignTeachers, used, 3, 'F', assignments);
      if (f) {
        const assignment: Assignment = { 
          teacher: f.name, 
          role: 'F', 
          classId, 
          round: 1, 
          period: 3, 
          time: '11:00-11:50' 
        };
        result[day][3] = assignment;
        assignments.push(assignment);
        used.add(f.name);
      }
    }

    // ---- Round 2: H-K-H (no F) ----
    for (let i = 0; i < round2Count; i++) {
      const classId = classIds[i];
      const roles: ('H' | 'K' | 'H')[] = Math.random() > 0.5 ? ['H', 'K', 'H'] : ['K', 'H', 'H'];
      const used = new Set<string>();

      roles.forEach((role, idx) => {
        const period = (4 + idx) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
        const timeMap: { [key in 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8]: string } = {
          1: '09:00-09:50',
          2: '10:00-10:50',
          3: '11:00-11:50',
          4: '14:00-14:50',
          5: '15:00-15:50',
          6: '16:00-16:50',
          7: '17:00-17:50',
          8: '18:00-18:50'
        };
        let pool = role === 'H' ? homeroomTeachers : koreanTeachers;
        const t = pickTeacher(pool, used, period, role, assignments);
        if (t) {
          const assignment: Assignment = { 
            teacher: t.name, 
            role, 
            classId, 
            round: 2, 
            period, 
            time: timeMap[period] 
          };
          result[day][period] = assignment;
          assignments.push(assignment);
          used.add(t.name);
        }
      });
    }
  });

    // Calculate metrics
    const totalAssignments = assignments.length;
    const assignedCount = assignments.filter(a => a.teacher).length;
    const unassignedCount = totalAssignments - assignedCount;
    const warningsCount = 0; // TODO: Calculate actual warnings
    const teachersCount = slotConfig.teachers.homeroomKoreanPool.length + slotConfig.teachers.foreignPool.length;
    const classesCount = Object.keys(slotConfig.fixedHomerooms || {}).length;

    // Record metrics
    if (userId && userRole) {
      await metricsService.recordEngineMetrics({
        generationTimeMs: timer.end(true),
        totalAssignments,
        assignedCount,
        unassignedCount,
        warningsCount,
        teachersCount,
        classesCount,
        slotId: slotConfig.id,
        scheduleType: 'MWF',
        engineVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        userId,
        userRole,
      });
    } else {
      timer.end(true);
    }

    sentryService.addBreadcrumb(
      'MWF schedule generation completed',
      'scheduler',
      {
        totalAssignments,
        assignedCount,
        generationTime: timer.end(true),
      }
    );

    return result;
  } catch (error) {
    timer.end(false, error instanceof Error ? error.message : 'Unknown error');
    sentryService.captureException(error as Error, {
      operation: 'generateMwfSchedule',
      slotId: slotConfig.id,
    });
    throw error;
  }
}

/**
 * MWF 스케줄 제약조건 검증
 */
export function validateMwfSchedule(
  scheduleResult: MWFScheduleResult
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 기본 검증 로직
  const days = ['월', '수', '금'] as const;
  
  days.forEach(day => {
    const daySchedule = scheduleResult[day];
    if (!daySchedule) {
      errors.push(`${day}요일 스케줄이 없습니다.`);
      return;
    }

    // 각 교시별 검증
    for (let period = 1; period <= 8; period++) {
      const assignment = daySchedule[period];
      if (assignment && Array.isArray(assignment)) {
        // 배열인 경우 (여러 교사 배정)
        assignment.forEach(assign => {
          if (assign && !assign.teacher) {
            errors.push(`${day}요일 ${period}교시에 교사가 배정되지 않았습니다.`);
          }
        });
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
