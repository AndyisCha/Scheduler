// =====================================================
// 통합 스케줄러용 서비스 레이어
// =====================================================
// 새로운 DB 구조에 맞는 TypeScript 서비스 구현

import { createClient } from '@supabase/supabase-js';
import type { 
  UnifiedSlotConfig, 
  UnifiedGenerateResult, 
  MWFScheduleResult, 
  TTScheduleResult 
} from '../src/engine/unifiedScheduler';

// =====================================================
// 1. 타입 정의 (DB 스키마와 매칭)
// =====================================================

export interface DbUnifiedSlot {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  day_group: 'MWF' | 'TT' | 'BOTH';
  created_at: string;
  updated_at: string;
  created_by: string;
  slot_data: Record<string, any>;
}

export interface DbTeacherPool {
  id: string;
  slot_id: string;
  teacher_name: string;
  teacher_id: string;
  role: 'H' | 'K' | 'F';
  pool_type: 'homeroom_korean' | 'foreign';
  created_at: string;
}

export interface DbTeacherConstraint {
  id: string;
  slot_id: string;
  teacher_name: string;
  homeroom_disabled?: boolean;
  max_homerooms?: number;
  unavailable_periods?: string[];
  created_at: string;
  updated_at: string;
}

export interface DbFixedHomeroom {
  id: string;
  slot_id: string;
  class_id: string;
  teacher_name: string;
  created_at: string;
  updated_at: string;
}

export interface DbGlobalOptions {
  id: string;
  slot_id: string;
  include_h_in_k: boolean;
  prefer_other_h_for_k: boolean;
  disallow_own_h_as_k: boolean;
  allow_foreign_fallback_to_k: boolean;
  strict_foreign: boolean;
  target_foreign_per_round?: number;
  round_class_counts: {
    mwf?: Record<1 | 2 | 3 | 4, number>;
    tt?: Record<1 | 2, number>;
  };
  mwf_round1_period2: 'K' | 'F';
  created_at: string;
  updated_at: string;
}

export interface DbGeneratedSchedule {
  id: string;
  slot_id: string;
  generated_by: string;
  schedule_type: 'MWF' | 'TT' | 'BOTH';
  generation_time_ms?: number;
  total_assignments?: number;
  assigned_count?: number;
  unassigned_count?: number;
  validation_result: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    infos: string[];
  };
  schedule_data: {
    mwf?: MWFScheduleResult;
    tt?: TTScheduleResult;
  };
  created_at: string;
  updated_at: string;
}

export interface DbScheduleAssignment {
  id: string;
  schedule_id: string;
  day: string;
  period: number;
  assignment_type: 'period' | 'word_test';
  teacher_name: string;
  teacher_role: 'H' | 'K' | 'F';
  class_id: string;
  round_number: number;
  time_slot?: string;
  is_exam: boolean;
  assignment_order: number;
  created_at: string;
}

// =====================================================
// 2. 통합 슬롯 서비스
// =====================================================

export class UnifiedSlotService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 슬롯 목록 조회
  async getSlots(userId: string, dayGroup?: 'MWF' | 'TT' | 'BOTH'): Promise<DbUnifiedSlot[]> {
    let query = this.supabase
      .from('unified_slots')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });

    if (dayGroup) {
      query = query.in('day_group', [dayGroup, 'BOTH']);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  // 슬롯 상세 조회 (완전한 정보)
  async getSlotComplete(slotId: string): Promise<UnifiedSlotConfig | null> {
    const { data, error } = await this.supabase
      .from('slot_complete_info')
      .select('*')
      .eq('id', slotId)
      .single();

    if (error) throw error;
    if (!data) return null;

    return this.mapDbToUnifiedSlotConfig(data);
  }

  // 슬롯 생성
  async createSlot(
    userId: string,
    slotData: {
      name: string;
      description?: string;
      dayGroup: 'MWF' | 'TT' | 'BOTH';
      createdBy: string;
      teachers: {
        homeroomKoreanPool: Array<{id: string, name: string, role: 'H' | 'K' | 'F'}>;
        foreignPool: Array<{id: string, name: string, role: 'H' | 'K' | 'F'}>;
      };
      globalOptions: {
        includeHInK?: boolean;
        preferOtherHForK?: boolean;
        disallowOwnHAsK?: boolean;
        allowForeignFallbackToK?: boolean;
        strictForeign?: boolean;
        targetForeignPerRound?: number;
        roundClassCounts: {
          mwf?: Record<1 | 2 | 3 | 4, number>;
          tt?: Record<1 | 2, number>;
        };
        mwfRound1Period2?: 'K' | 'F';
      };
      teacherConstraints?: Array<{
        teacherName: string;
        homeroomDisabled?: boolean;
        maxHomerooms?: number;
        unavailable?: string[];
      }>;
      fixedHomerooms?: Record<string, string>;
    }
  ): Promise<string> {
    // 트랜잭션 시작
    const { data: slot, error: slotError } = await this.supabase
      .from('unified_slots')
      .insert({
        owner_id: userId,
        name: slotData.name,
        description: slotData.description,
        day_group: slotData.dayGroup,
        created_by: slotData.createdBy,
        slot_data: { version: 'unified_v1', schema: 'unified_scheduler' }
      })
      .select('id')
      .single();

    if (slotError) throw slotError;
    const slotId = slot.id;

    // 교사 풀 삽입
    const teacherPoolInserts = [
      ...slotData.teachers.homeroomKoreanPool.map(t => ({
        slot_id: slotId,
        teacher_name: t.name,
        teacher_id: t.id,
        role: t.role,
        pool_type: 'homeroom_korean' as const
      })),
      ...slotData.teachers.foreignPool.map(t => ({
        slot_id: slotId,
        teacher_name: t.name,
        teacher_id: t.id,
        role: t.role,
        pool_type: 'foreign' as const
      }))
    ];

    const { error: poolError } = await this.supabase
      .from('teacher_pools')
      .insert(teacherPoolInserts);

    if (poolError) throw poolError;

    // 글로벌 옵션 삽입
    const { error: optionsError } = await this.supabase
      .from('global_options')
      .insert({
        slot_id: slotId,
        include_h_in_k: slotData.globalOptions.includeHInK ?? true,
        prefer_other_h_for_k: slotData.globalOptions.preferOtherHForK ?? false,
        disallow_own_h_as_k: slotData.globalOptions.disallowOwnHAsK ?? true,
        allow_foreign_fallback_to_k: slotData.globalOptions.allowForeignFallbackToK ?? true,
        strict_foreign: slotData.globalOptions.strictForeign ?? false,
        target_foreign_per_round: slotData.globalOptions.targetForeignPerRound,
        round_class_counts: slotData.globalOptions.roundClassCounts,
        mwf_round1_period2: slotData.globalOptions.mwfRound1Period2 ?? 'K'
      });

    if (optionsError) throw optionsError;

    // 교사 제약조건 삽입 (있는 경우)
    if (slotData.teacherConstraints && slotData.teacherConstraints.length > 0) {
      const constraintInserts = slotData.teacherConstraints.map(c => ({
        slot_id: slotId,
        teacher_name: c.teacherName,
        homeroom_disabled: c.homeroomDisabled,
        max_homerooms: c.maxHomerooms,
        unavailable_periods: c.unavailable
      }));

      const { error: constraintError } = await this.supabase
        .from('teacher_constraints')
        .insert(constraintInserts);

      if (constraintError) throw constraintError;
    }

    // 고정 담임 삽입 (있는 경우)
    if (slotData.fixedHomerooms) {
      const homeroomInserts = Object.entries(slotData.fixedHomerooms).map(([classId, teacherName]) => ({
        slot_id: slotId,
        class_id: classId,
        teacher_name: teacherName
      }));

      const { error: homeroomError } = await this.supabase
        .from('fixed_homerooms')
        .insert(homeroomInserts);

      if (homeroomError) throw homeroomError;
    }

    return slotId;
  }

  // 슬롯 업데이트
  async updateSlot(slotId: string, updates: Partial<DbUnifiedSlot>): Promise<void> {
    const { error } = await this.supabase
      .from('unified_slots')
      .update(updates)
      .eq('id', slotId);

    if (error) throw error;
  }

  // 슬롯 삭제
  async deleteSlot(slotId: string): Promise<void> {
    const { error } = await this.supabase
      .from('unified_slots')
      .delete()
      .eq('id', slotId);

    if (error) throw error;
  }

  // DB 데이터를 UnifiedSlotConfig로 변환
  private mapDbToUnifiedSlotConfig(data: any): UnifiedSlotConfig {
    return {
      id: data.id,
      name: data.name,
      slot: {
        teachers: data.teachers,
        globalOptions: data.global_options,
        constraints: data.teacher_constraints || [],
        fixedHomerooms: data.fixed_homerooms || {}
      }
    };
  }
}

// =====================================================
// 3. 통합 스케줄 서비스
// =====================================================

export class UnifiedScheduleService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 스케줄 생성 및 저장
  async generateAndSaveSchedule(
    slotId: string,
    userId: string,
    result: UnifiedGenerateResult,
    generationTimeMs: number
  ): Promise<string> {
    // 스케줄 타입 결정
    const scheduleType = result.mwf && result.tt ? 'BOTH' : 
                        result.mwf ? 'MWF' : 'TT';

    // 메트릭 계산
    const allAssignments = [
      ...Object.values(result.mwf || {}).flatMap(day => 
        Object.values(day.periods).flat()
      ),
      ...Object.values(result.tt || {}).flatMap(day => 
        Object.values(day.periods).flat()
      )
    ];

    const totalAssignments = allAssignments.length;
    const assignedCount = allAssignments.filter(a => a.teacher !== '(미배정)').length;
    const unassignedCount = totalAssignments - assignedCount;

    // 스케줄 생성
    const { data: schedule, error: scheduleError } = await this.supabase
      .from('generated_schedules')
      .insert({
        slot_id: slotId,
        generated_by: userId,
        schedule_type: scheduleType,
        generation_time_ms: generationTimeMs,
        total_assignments: totalAssignments,
        assigned_count: assignedCount,
        unassigned_count: unassignedCount,
        validation_result: result.validation || {
          isValid: true,
          errors: [],
          warnings: [],
          infos: []
        },
        schedule_data: {
          mwf: result.mwf,
          tt: result.tt
        }
      })
      .select('id')
      .single();

    if (scheduleError) throw scheduleError;
    const scheduleId = schedule.id;

    // 할당 데이터 정규화하여 저장
    await this.saveScheduleAssignments(scheduleId, result);

    return scheduleId;
  }

  // 할당 데이터 저장
  private async saveScheduleAssignments(
    scheduleId: string, 
    result: UnifiedGenerateResult
  ): Promise<void> {
    const assignments: Omit<DbScheduleAssignment, 'id' | 'created_at'>[] = [];

    // MWF 할당 처리
    if (result.mwf) {
      Object.entries(result.mwf).forEach(([day, dayData]) => {
        // 정규 수업 할당
        Object.entries(dayData.periods).forEach(([period, periodAssignments]) => {
          periodAssignments.forEach((assignment, index) => {
            assignments.push({
              schedule_id: scheduleId,
              day,
              period: parseInt(period),
              assignment_type: 'period',
              teacher_name: assignment.teacher,
              teacher_role: assignment.role,
              class_id: assignment.classId,
              round_number: assignment.round,
              time_slot: assignment.time,
              is_exam: assignment.isExam || false,
              assignment_order: index + 1
            });
          });
        });

        // 단어시험 할당
        dayData.wordTests.forEach((exam, index) => {
          assignments.push({
            schedule_id: scheduleId,
            day,
            period: 0, // 시험은 특정 교시가 아님
            assignment_type: 'word_test',
            teacher_name: exam.teacher,
            teacher_role: exam.role,
            class_id: exam.classId,
            round_number: 0, // 시험은 특정 라운드가 아님
            time_slot: exam.time,
            is_exam: true,
            assignment_order: index + 1
          });
        });
      });
    }

    // TT 할당 처리
    if (result.tt) {
      Object.entries(result.tt).forEach(([day, dayData]) => {
        // 정규 수업 할당
        Object.entries(dayData.periods).forEach(([period, periodAssignments]) => {
          periodAssignments.forEach((assignment, index) => {
            assignments.push({
              schedule_id: scheduleId,
              day,
              period: parseInt(period),
              assignment_type: 'period',
              teacher_name: assignment.teacher,
              teacher_role: assignment.role,
              class_id: assignment.classId,
              round_number: assignment.round,
              time_slot: assignment.time,
              is_exam: assignment.isExam || false,
              assignment_order: index + 1
            });
          });
        });

        // 단어시험 할당
        dayData.wordTests.forEach((exam, index) => {
          assignments.push({
            schedule_id: scheduleId,
            day,
            period: 0,
            assignment_type: 'word_test',
            teacher_name: exam.teacher,
            teacher_role: exam.role,
            class_id: exam.classId,
            round_number: 0,
            time_slot: exam.time,
            is_exam: true,
            assignment_order: index + 1
          });
        });
      });
    }

    // 배치 삽입
    if (assignments.length > 0) {
      const { error } = await this.supabase
        .from('schedule_assignments')
        .insert(assignments);

      if (error) throw error;
    }
  }

  // 스케줄 조회
  async getSchedule(scheduleId: string): Promise<DbGeneratedSchedule | null> {
    const { data, error } = await this.supabase
      .from('generated_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (error) throw error;
    return data;
  }

  // 슬롯의 스케줄 목록 조회
  async getSchedulesForSlot(slotId: string): Promise<DbGeneratedSchedule[]> {
    const { data, error } = await this.supabase
      .from('generated_schedules')
      .select('*')
      .eq('slot_id', slotId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  // 스케줄 삭제
  async deleteSchedule(scheduleId: string): Promise<void> {
    const { error } = await this.supabase
      .from('generated_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
  }

  // 스케줄에서 UnifiedGenerateResult로 변환
  async getScheduleAsResult(scheduleId: string): Promise<UnifiedGenerateResult | null> {
    const schedule = await this.getSchedule(scheduleId);
    if (!schedule) return null;

    return {
      mwf: schedule.schedule_data.mwf,
      tt: schedule.schedule_data.tt,
      validation: schedule.validation_result
    };
  }
}

// =====================================================
// 4. 서비스 팩토리
// =====================================================

export function createUnifiedServices(supabaseUrl: string, supabaseKey: string) {
  return {
    slotService: new UnifiedSlotService(supabaseUrl, supabaseKey),
    scheduleService: new UnifiedScheduleService(supabaseUrl, supabaseKey)
  };
}

// =====================================================
// 5. 사용 예시
// =====================================================

/*
// 서비스 초기화
const services = createUnifiedServices(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// 슬롯 생성
const slotId = await services.slotService.createSlot(userId, {
  name: '2025 테스트 슬롯',
  description: '테스트용',
  dayGroup: 'MWF',
  createdBy: user.email,
  teachers: {
    homeroomKoreanPool: [
      { id: 'hk:Andy', name: 'Andy', role: 'H' },
      { id: 'hk:Clara', name: 'Clara', role: 'H' }
    ],
    foreignPool: [
      { id: 'f:Tanya', name: 'Tanya', role: 'F' }
    ]
  },
  globalOptions: {
    roundClassCounts: { mwf: { 1: 2, 2: 2, 3: 2, 4: 2 } }
  }
});

// 스케줄 생성 및 저장
const result = generateUnifiedSchedules(unifiedConfig);
const scheduleId = await services.scheduleService.generateAndSaveSchedule(
  slotId,
  userId,
  result,
  150
);

// 스케줄 조회
const savedSchedule = await services.scheduleService.getScheduleAsResult(scheduleId);
*/
