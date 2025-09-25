// src/types/scheduler.ts
// Type definitions for the weekly scheduler system

export type Day = "월" | "수" | "금";
export const DAYS: Day[] = ["월", "수", "금"];

export type Role = "H" | "K" | "F";
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 1.5 | 2.5 | 3.5 | 4.5 | 5.5 | 6.5 | 7.5;

export const PERIOD_TIMES: Record<Period, string> = {
  1: "14:20–15:05",
  1.5: "15:05–15:10",
  2: "15:10–15:55",
  2.5: "15:55–16:15",
  3: "16:15–17:00",
  3.5: "17:00–17:05",
  4: "17:05–17:50",
  4.5: "17:50–18:05",
  5: "18:05–18:55",
  5.5: "18:55–19:00",
  6: "19:00–19:50",
  6.5: "19:50–20:15",
  7: "20:15–21:05",
  7.5: "21:05–21:10",
  8: "21:10–22:00",
};

export const ROUND_PERIODS: Record<1 | 2 | 3 | 4, [Period, Period]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

export type Teacher = string;

export type TeacherConstraints = {
  unavailable?: Set<string>; // e.g., "월|1", "수|4"
  homeroomDisabled?: boolean; // cannot be assigned as homeroom
  maxHomerooms?: number; // cap homerooms (e.g., 1)
};

export type Pools = {
  homeroomKoreanPool: Teacher[]; // homerooms + korean teachers (same pool concept)
  foreignPool: Teacher[];
};

export type GlobalOptions = {
  roundClassCounts: Record<number, number>;
  includeHInK: boolean;
  preferOtherHForK: boolean;
  disallowOwnHAsK: boolean;
  examPeriods?: {
    [day in Day]?: number[]; // 교시 사이에 시험을 넣을 교시 번호들 (예: [2.5, 4.5])
  };
  classNames?: Record<string, string>; // 클래스 ID -> 실제 반이름 매핑
};

export type FixedHomerooms = Record<Teacher, string>; // teacher -> classId like "R2C2"

export type SchedulerSlot = {
  teachers: {
    homeroomKoreanPool: Teacher[];
    foreignPool: Teacher[];
    constraints: Record<Teacher, TeacherConstraints>;
  };
  fixedHomerooms?: FixedHomerooms;
  globalOptions: GlobalOptions;
};

export type Assignment = {
  classId: string;
  round: 1 | 2 | 3 | 4;
  period: Period;
  time?: string;
  role: Role;
  teacher: Teacher;
  isExam?: boolean;
};

export type ExamAssignment = {
  classId: string;
  teacher: Teacher;
  role: 'H';
  label: 'WT';
  time: string;
};

// TT Schedule specific types
export type TTScheduleResult = {
  [day in '화' | '목']: {
    periods: { [period: number]: Assignment[] };
    wordTests: ExamAssignment[];
  };
};

// MWF Schedule specific types  
export type MWFScheduleResult = {
  [day in '월' | '수' | '금']: {
    periods: { [period: number]: Assignment[] };
    wordTests: ExamAssignment[];
  };
};

// Unified Schedule Result
export type UnifiedScheduleResult = {
  mwf: MWFScheduleResult;
  tt: TTScheduleResult;
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    infos: string[];
  };
};

// Unified ScheduleResult for UI components
export type ScheduleResult = {
  classSummary: Record<string, Record<Day, Assignment[]>>;
  teacherSummary: Record<Teacher, Record<Day, Assignment[]>>;
  dayGrid: Record<Day, Record<Period, Assignment[]>>;
  warnings: string[];
  metrics?: {
    generationTimeMs: number;
    totalAssignments: number;
    assignedCount: number;
    unassignedCount: number;
    warningsCount: number;
    teachersCount: number;
    classesCount: number;
    // Enhanced performance metrics
    sortOperations?: number;
    cacheHits?: number;
    cacheMisses?: number;
    cacheHitRate?: number;
  };
};

// Additional UI types
export interface TeacherMetrics {
  homerooms: number;
  koreanSessions: number;
  freeSlots: number;
  byDay: Record<Day, {
    homerooms: number;
    koreanSessions: number;
    freeSlots: number;
  }>;
}

export type SlotConfig = {
  id: string;
  name: string;
  slot: SchedulerSlot;
  createdAt: Date;
  updatedAt: Date;
};

// ⚠️ 임시 호환 유틸 추가:
export function coerceCellToArray<T>(cell: T | T[] | null | undefined): T[] {
  if (!cell) return [];
  return Array.isArray(cell) ? cell : [cell];
}

export function normalizeResultCells<T extends Record<string, any>>(grid: T) {
  for (const day of Object.keys(grid)) {
    for (const key of Object.keys(grid[day])) {
      if (/^\d+$/.test(key)) {
        grid[day][key] = coerceCellToArray(grid[day][key]);
      }
    }
  }
  return grid;
}
