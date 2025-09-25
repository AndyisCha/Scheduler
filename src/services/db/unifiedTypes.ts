// 새로운 통합 스케줄러에 맞는 타입 정의

export interface UnifiedDbSlot {
  id: string;
  name: string;
  description?: string;
  day_group: 'MWF' | 'TT';
  created_by: string;
  created_at: string;
  updated_at: string;
  slot_data: UnifiedSlotData;
}

export interface UnifiedSlotData {
  teachers: {
    homeroomKoreanPool: UnifiedTeacher[];
    foreignPool: UnifiedTeacher[];
  };
  globalOptions: UnifiedGlobalOptions;
  constraints: UnifiedTeacherConstraint[];
  fixedHomerooms?: Record<string, string>;
}

export interface UnifiedTeacher {
  id: string;
  name: string;
  role: 'H' | 'K' | 'F';
}

export interface UnifiedTeacherConstraint {
  teacherName: string;
  homeroomDisabled?: boolean;
  maxHomerooms?: number;
  unavailable?: string[];
  role?: 'H' | 'K' | 'F';
}

export interface UnifiedGlobalOptions {
  includeHInK?: boolean;
  preferOtherHForK?: boolean;
  disallowOwnHAsK?: boolean;
  roundClassCounts: {
    mwf?: Record<1 | 2 | 3 | 4, number>;
    tt?: Record<1 | 2, number>;
  };
  mwfRound1Period2?: 'K' | 'F';
  examPeriods?: {
    [day: string]: number[];
  };
  classNames?: Record<string, string>;
}

export interface UnifiedGeneratedSchedule {
  id: string;
  slot_id: string;
  day_group: 'MWF' | 'TT';
  created_by: string;
  created_at: string;
  result: UnifiedScheduleResult;
  warnings: string[];
  validation_result?: UnifiedValidationResult;
  schedule_type: 'MWF' | 'TT' | 'UNIFIED';
  generation_batch_id?: string;
  expires_at?: string;
}

export interface UnifiedScheduleResult {
  mwf?: MWFScheduleResult;
  tt?: TTScheduleResult;
}

export interface MWFScheduleResult {
  [day: string]: DayResultMWF;
}

export interface TTScheduleResult {
  [day: string]: DayResultTT;
}

export interface DayResultMWF {
  periods: { [period: number]: Assignment | null };
  wordTests: ExamAssignment[];
}

export interface DayResultTT {
  periods: { [period: number]: Assignment | null };
  wordTests: ExamAssignment[];
}

export interface Assignment {
  teacher: string;
  role: 'H' | 'K' | 'F';
  classId: string;
  round: number;
  period: number;
  time: string;
}

export interface ExamAssignment {
  classId: string;
  teacher: string;
  role: 'H';
  label: 'WT';
  time: string;
}

export interface UnifiedValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  validatedAt: string;
}

// 데이터베이스 쿼리 결과 타입
export interface UnifiedScheduleListItem {
  id: string;
  name: string;
  day_group: 'MWF' | 'TT';
  created_at: string;
  updated_at: string;
  created_by: string;
  teacher_count: number;
  last_generated?: string;
}

// 통합 스케줄 생성 요청 타입
export interface UnifiedScheduleGenerationRequest {
  slot_id: string;
  schedule_type: 'MWF' | 'TT' | 'UNIFIED';
  options?: {
    validate?: boolean;
    include_metrics?: boolean;
  };
}

// 통합 스케줄 생성 응답 타입
export interface UnifiedScheduleGenerationResponse {
  success: boolean;
  result?: UnifiedGeneratedSchedule;
  error?: string;
  validation?: UnifiedValidationResult;
}

// 통계 및 메트릭스 타입
export interface ScheduleGenerationStats {
  generation_date: string;
  schedule_type: 'MWF' | 'TT' | 'UNIFIED';
  total_generations: number;
  valid_generations: number;
  invalid_generations: number;
  avg_generation_interval_seconds: number;
}

// 검색 및 필터링 타입
export interface UnifiedScheduleSearchParams {
  slot_id?: string;
  day_group?: 'MWF' | 'TT';
  schedule_type?: 'MWF' | 'TT' | 'UNIFIED';
  created_by?: string;
  date_from?: string;
  date_to?: string;
  is_valid?: boolean;
  limit?: number;
  offset?: number;
}

// 배치 생성 타입
export interface UnifiedBatchGenerationRequest {
  slot_ids: string[];
  schedule_type: 'UNIFIED';
  options?: {
    validate?: boolean;
    include_metrics?: boolean;
    parallel?: boolean;
  };
}

export interface UnifiedBatchGenerationResponse {
  success: boolean;
  results: UnifiedGeneratedSchedule[];
  errors: Array<{
    slot_id: string;
    error: string;
  }>;
  batch_id: string;
  total_processed: number;
  total_successful: number;
  total_failed: number;
}
