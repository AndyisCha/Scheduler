// Engine 타입 정의
export type Day = '월' | '화' | '수' | '목' | '금';
export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 1.5 | 2.5 | 3.5 | 4.5 | 5.5 | 6.5 | 7.5;
export type Role = 'H' | 'K' | 'F';
export type Teacher = string;

// Assignment 타입
export interface Assignment {
  teacher: Teacher | "(미배정)";
  role: Role | "EXAM";
  classId: string;
  round: 1 | 2 | 3 | 4;
  period: Period;
  time: string;
  isExam?: boolean;
}

// Teacher Constraint 타입
export interface TeacherConstraint {
  teacherName: string;
  maxHomerooms?: number;
  unavailablePeriods: number[];
  homeroomDisabled: boolean;
}

// Global Options 타입
export interface GlobalOptions {
  roundClassCounts: Record<number, number>;
  includeHInK: boolean;
  preferOtherHForK: boolean;
  disallowOwnHAsK: boolean;
}

// Fixed Homerooms 타입
export interface FixedHomerooms {
  [teacherName: string]: string; // teacherName -> classId
}

// Slot Config 타입
export interface SlotConfig {
  id: string;
  name: string;
  description?: string;
  dayGroup: 'MWF' | 'TT';
  teachers: {
    homeroomKoreanPool: Teacher[];
    foreignPool: Teacher[];
  };
  teacherConstraints: Record<string, TeacherConstraint>;
  fixedHomerooms: FixedHomerooms;
  globalOptions: GlobalOptions;
  constraints?: TeacherConstraint[];
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Day Schedule 타입
export interface DaySchedule {
  [period: number]: Assignment | Assignment[] | null;
}

// MWF Schedule Result 타입
export interface MWFScheduleResult {
  [day: string]: DaySchedule;
}

// TT Schedule Result 타입
export interface TTScheduleResult {
  [day: string]: {
    [period: number]: Assignment | Assignment[] | null;
    exam?: Assignment[];
  };
}

// Unified Schedule Result 타입 (UI용)
export interface ScheduleResult {
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
    sortOperations?: number;
    cacheHits?: number;
    cacheMisses?: number;
    cacheHitRate?: number;
  };
}

// Validation Result 타입
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Scheduler Slot 타입 (엔진용)
export interface SchedulerSlot {
  teachers: {
    homeroomKoreanPool: Teacher[];
    foreignPool: Teacher[];
  };
  teacherConstraints: Record<string, TeacherConstraint>;
  globalOptions: GlobalOptions;
  fixedHomerooms?: FixedHomerooms;
}

// Teacher Metrics 타입
export interface TeacherMetrics {
  homerooms: number;
  koreanSessions: number;
  foreignSessions: number;
  totalSessions: number;
  workload: number;
}

// Schedule Generation Options 타입
export interface ScheduleGenerationOptions {
  maxRetries?: number;
  timeoutMs?: number;
  enableCaching?: boolean;
  debugMode?: boolean;
}
