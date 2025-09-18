// src/types/scheduler.ts
// Type definitions for the weekly scheduler system

export type Day = "월" | "수" | "금";
export const DAYS: Day[] = ["월", "수", "금"];

export type Role = "H" | "K" | "F";
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const PERIOD_TIMES: Record<Period, string> = {
  1: "14:20–15:05",
  2: "15:10–15:55",
  3: "16:15–17:00",
  4: "17:05–17:50",
  5: "18:05–18:55",
  6: "19:00–19:50",
  7: "20:15–21:05",
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
  time: string;
  role: Role | "EXAM";
  teacher: Teacher | "(미배정)";
  isExam?: boolean;
};

// TT Schedule specific types
export type TTScheduleResult = {
  [day: string]: {
    [period: number]: Assignment | Assignment[] | null;
    exam?: Assignment[];
  };
};

// MWF Schedule specific types  
export type MWFScheduleResult = {
  [day: string]: {
    [period: number]: Assignment | Assignment[] | null;
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
