import type { 
  SlotConfig, 
  Assignment, 
  TTScheduleResult, 
  ValidationResult
} from './types';
import { metricsService } from '../services/metricsService';
import { sentryService } from '../lib/sentry';

/**
 * TT 스케줄 생성 엔진
 * 화, 목 요일에 대한 스케줄을 생성합니다.
 * Round 1: H + K + F
 * Word Test: H (감독)
 * Round 2: H-K-H (F 제외)
 */
export async function generateTtSchedule(
  slotConfig: SlotConfig,
  userId?: string,
  userRole?: string
): Promise<TTScheduleResult> {
  const timer = metricsService.createTimer('tt_schedule_generation');
  
  try {
    sentryService.addBreadcrumb(
      'Starting TT schedule generation',
      'scheduler',
      {
        slotId: slotConfig.id,
        teachersCount: slotConfig.teachers.homeroomKoreanPool.length + slotConfig.teachers.foreignPool.length,
        constraintsCount: Object.keys(slotConfig.teacherConstraints || {}).length,
      }
    );
  const result: TTScheduleResult = {};
  const days: ('화' | '목')[] = ['화', '목'];
  const busy = new BusyMatrix();

  // 초기화
  days.forEach(day => {
    result[day] = { exam: [] };
    for (let period = 1; period <= 6; period++) {
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
    constraints.find((c: any) => c.teacherName === teacherName);

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
        busy.mark(day, 1, h.name);
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
        busy.mark(day, 2, k.name);
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
        busy.mark(day, 3, f.name);
        used.add(f.name);
      }
    }

    // ---- Word Test (Exam Slot) ----
    for (let i = 0; i < round1Count; i++) {
      const classId = classIds[i];
      const h = assignments.find(a => a.classId === classId && a.role === 'H' && a.round === 1);
      if (h && !busy.isBusy(day, 'exam', h.teacher)) {
        const exam: Assignment = { 
          ...h, 
          role: 'EXAM',
          isExam: true,
          time: '17:50-18:10'
        };
        result[day].exam!.push(exam);
        busy.mark(day, 'exam', h.teacher);
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
          4: '17:50-18:10', // Word test time
          5: '14:00-14:50',
          6: '15:00-15:50',
          7: '16:00-16:50',
          8: '17:00-17:50'
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
          busy.mark(day, period, t.name);
          used.add(t.name);
        }
      });
    }
  });

    // Calculate metrics
    const totalAssignments = busy.busy.size;
    const assignedCount = totalAssignments; // TT engine doesn't have unassigned logic yet
    const unassignedCount = 0;
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
        scheduleType: 'TT',
        engineVersion: '1.0.0',
        timestamp: new Date().toISOString(),
        userId,
        userRole,
      });
    } else {
      timer.end(true);
    }

    sentryService.addBreadcrumb(
      'TT schedule generation completed',
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
      operation: 'generateTtSchedule',
      slotId: slotConfig.id,
    });
    throw error;
  }
}

/**
 * TT 스케줄 제약조건 검증
 */
export function validateTtSchedule(
  scheduleResult: TTScheduleResult
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 기본 검증 로직
  const days = ['화', '목'] as const;
  
  days.forEach(day => {
    const daySchedule = scheduleResult[day];
    if (!daySchedule) {
      errors.push(`${day}요일 스케줄이 없습니다.`);
      return;
    }

    // 각 교시별 검증
    for (let period = 1; period <= 6; period++) {
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

/** BusyMatrix: teacher/day/period 충돌 방지 */
class BusyMatrix {
  public busy = new Set<string>();
  
  mark(day: string, period: string | number, teacher: string) {
    this.busy.add(`${day}-${period}-${teacher}`);
  }
  
  isBusy(day: string, period: string | number, teacher: string): boolean {
    return this.busy.has(`${day}-${period}-${teacher}`);
  }
}