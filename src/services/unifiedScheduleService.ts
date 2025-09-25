import { supabase } from '../lib/supabase';
import type {
  UnifiedDbSlot,
  UnifiedGeneratedSchedule,
  UnifiedScheduleGenerationRequest,
  UnifiedScheduleGenerationResponse,
  UnifiedScheduleSearchParams,
  UnifiedBatchGenerationRequest,
  UnifiedBatchGenerationResponse,
  UnifiedValidationResult
} from './db/unifiedTypes';
import { generateUnifiedSchedules } from '../engine/unifiedScheduler';
import type { UnifiedSlotConfig } from '../engine/unifiedScheduler';
import { validateScheduleConstraints } from '../utils/scheduleValidation';

export class UnifiedScheduleService {
  // 통합 스케줄 생성
  static async generateSchedule(
    request: UnifiedScheduleGenerationRequest
  ): Promise<UnifiedScheduleGenerationResponse> {
    try {
      // 슬롯 정보 조회
      const { data: slot, error: slotError } = await supabase
        .from('slots')
        .select('*')
        .eq('id', request.slot_id)
        .single();

      if (slotError || !slot) {
        return {
          success: false,
          error: '슬롯을 찾을 수 없습니다.'
        };
      }

      // 슬롯 데이터를 통합 스케줄러 형식으로 변환
      const unifiedConfig = await this.convertSlotToUnifiedConfig(slot);
      
      // 통합 스케줄 생성
      const result = generateUnifiedSchedules(unifiedConfig);
      
      // 검증 수행
      let validation: UnifiedValidationResult | undefined;
      if (request.options?.validate !== false) {
        if (request.schedule_type === 'MWF' && result.mwf) {
          const validationResult = validateScheduleConstraints(result.mwf, 'MWF');
          validation = {
            isValid: validationResult.isValid,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            validatedAt: new Date().toISOString()
          };
        } else if (request.schedule_type === 'TT' && result.tt) {
          const validationResult = validateScheduleConstraints(result.tt, 'TT');
          validation = {
            isValid: validationResult.isValid,
            errors: validationResult.errors,
            warnings: validationResult.warnings,
            validatedAt: new Date().toISOString()
          };
        }
      }

      // 데이터베이스에 저장
      const { data: savedSchedule, error: saveError } = await supabase
        .from('generated_schedules')
        .insert({
          slot_id: request.slot_id,
          day_group: slot.day_group,
          created_by: slot.created_by,
          result: result,
          validation_result: validation,
          schedule_type: request.schedule_type,
          warnings: validation?.warnings || []
        })
        .select()
        .single();

      if (saveError) {
        return {
          success: false,
          error: `스케줄 저장 실패: ${saveError.message}`
        };
      }

      return {
        success: true,
        result: savedSchedule,
        validation
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }

  // 배치 스케줄 생성
  static async generateBatchSchedules(
    request: UnifiedBatchGenerationRequest
  ): Promise<UnifiedBatchGenerationResponse> {
    const batchId = crypto.randomUUID();
    const results: UnifiedGeneratedSchedule[] = [];
    const errors: Array<{ slot_id: string; error: string }> = [];
    
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;

    try {
      if (request.options?.parallel) {
        // 병렬 처리
        const promises = request.slot_ids.map(async (slotId) => {
          try {
            totalProcessed++;
            const response = await this.generateSchedule({
              slot_id: slotId,
              schedule_type: request.schedule_type,
              options: request.options
            });
            
            if (response.success && response.result) {
              totalSuccessful++;
              results.push(response.result);
            } else {
              totalFailed++;
              errors.push({
                slot_id: slotId,
                error: response.error || '알 수 없는 오류'
              });
            }
          } catch (error) {
            totalFailed++;
            errors.push({
              slot_id: slotId,
              error: error instanceof Error ? error.message : '알 수 없는 오류'
            });
          }
        });

        await Promise.all(promises);
      } else {
        // 순차 처리
        for (const slotId of request.slot_ids) {
          try {
            totalProcessed++;
            const response = await this.generateSchedule({
              slot_id: slotId,
              schedule_type: request.schedule_type,
              options: request.options
            });
            
            if (response.success && response.result) {
              totalSuccessful++;
              results.push(response.result);
            } else {
              totalFailed++;
              errors.push({
                slot_id: slotId,
                error: response.error || '알 수 없는 오류'
              });
            }
          } catch (error) {
            totalFailed++;
            errors.push({
              slot_id: slotId,
              error: error instanceof Error ? error.message : '알 수 없는 오류'
            });
          }
        }
      }

      return {
        success: true,
        results,
        errors,
        batch_id: batchId,
        total_processed: totalProcessed,
        total_successful: totalSuccessful,
        total_failed: totalFailed
      };

    } catch (error) {
      return {
        success: false,
        results,
        errors: [
          ...errors,
          {
            slot_id: 'BATCH',
            error: error instanceof Error ? error.message : '배치 처리 중 오류 발생'
          }
        ],
        batch_id: batchId,
        total_processed: totalProcessed,
        total_successful: totalSuccessful,
        total_failed: totalFailed
      };
    }
  }

  // 통합 스케줄 조회
  static async getSchedules(params: UnifiedScheduleSearchParams = {}) {
    let query = supabase
      .from('generated_schedules')
      .select(`
        *,
        slots (
          id,
          name,
          description,
          day_group
        )
      `)
      .order('created_at', { ascending: false });

    if (params.slot_id) {
      query = query.eq('slot_id', params.slot_id);
    }
    if (params.day_group) {
      query = query.eq('day_group', params.day_group);
    }
    if (params.schedule_type) {
      query = query.eq('schedule_type', params.schedule_type);
    }
    if (params.created_by) {
      query = query.eq('created_by', params.created_by);
    }
    if (params.date_from) {
      query = query.gte('created_at', params.date_from);
    }
    if (params.date_to) {
      query = query.lte('created_at', params.date_to);
    }
    if (params.is_valid !== undefined) {
      query = query.eq('validation_result->>isValid', params.is_valid.toString());
    }
    if (params.limit) {
      query = query.limit(params.limit);
    }
    if (params.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`스케줄 조회 실패: ${error.message}`);
    }

    return data;
  }

  // 특정 스케줄 조회
  static async getScheduleById(scheduleId: string) {
    const { data, error } = await supabase
      .from('generated_schedules')
      .select(`
        *,
        slots (
          id,
          name,
          description,
          day_group,
          slot_data
        )
      `)
      .eq('id', scheduleId)
      .single();

    if (error) {
      throw new Error(`스케줄 조회 실패: ${error.message}`);
    }

    return data;
  }

  // 슬롯을 통합 스케줄러 형식으로 변환
  private static async convertSlotToUnifiedConfig(slot: UnifiedDbSlot): Promise<UnifiedSlotConfig> {
    // 교사 정보 조회
    const { data: teachers } = await supabase
      .from('slot_teachers')
      .select('*')
      .eq('slot_id', slot.id);

    // 제약 조건 조회
    const { data: constraints } = await supabase
      .from('teacher_constraints')
      .select('*')
      .eq('slot_id', slot.id);

    // 고정 담임 조회
    const { data: fixedHomerooms } = await supabase
      .from('fixed_homerooms')
      .select('*')
      .eq('slot_id', slot.id);

    // 전역 옵션 조회
    const { data: globalOptions } = await supabase
      .from('global_options')
      .select('*')
      .eq('slot_id', slot.id)
      .single();

    // 교사 풀 구성
    const homeroomKoreanPool = teachers
      ?.filter(t => t.kind === 'homeroomKorean')
      .map(t => ({
        id: t.teacher_name,
        name: t.teacher_name,
        role: 'H' as const
      })) || [];

    const foreignPool = teachers
      ?.filter(t => t.kind === 'foreign')
      .map(t => ({
        id: t.teacher_name,
        name: t.teacher_name,
        role: 'F' as const
      })) || [];

    // 제약 조건 구성
    const teacherConstraints = constraints?.map(c => ({
      teacherName: c.teacher_name,
      homeroomDisabled: c.homeroom_disabled,
      maxHomerooms: c.max_homerooms,
      unavailable: c.unavailable,
      role: c.role as 'H' | 'K' | 'F' | undefined
    })) || [];

    // 고정 담임 구성
    const fixedHomeroomsMap: Record<string, string> = {};
    fixedHomerooms?.forEach(fh => {
      fixedHomeroomsMap[fh.class_id] = fh.teacher_name;
    });

    return {
      id: slot.id,
      name: slot.name,
      slot: {
        teachers: {
          homeroomKoreanPool,
          foreignPool
        },
        globalOptions: {
          includeHInK: globalOptions?.include_h_in_k ?? true,
          preferOtherHForK: globalOptions?.prefer_other_h_for_k ?? false,
          disallowOwnHAsK: globalOptions?.disallow_own_h_as_k ?? true,
          roundClassCounts: globalOptions?.round_class_counts || {
            mwf: { 1: 3, 2: 3, 3: 3, 4: 3 },
            tt: { 1: 2, 2: 2 }
          },
          mwfRound1Period2: globalOptions?.mwf_round1_period2 || 'K'
        },
        constraints: teacherConstraints,
        fixedHomerooms: Object.keys(fixedHomeroomsMap).length > 0 ? fixedHomeroomsMap : undefined
      }
    };
  }

  // 스케줄 삭제
  static async deleteSchedule(scheduleId: string) {
    const { error } = await supabase
      .from('generated_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      throw new Error(`스케줄 삭제 실패: ${error.message}`);
    }
  }

  // 만료된 스케줄 정리
  static async cleanupExpiredSchedules() {
    const { error } = await supabase
      .from('generated_schedules')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw new Error(`만료된 스케줄 정리 실패: ${error.message}`);
    }
  }

  // 통계 조회
  static async getGenerationStats(days: number = 30) {
    const { data, error } = await supabase
      .from('schedule_generation_stats')
      .select('*')
      .gte('generation_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('generation_date', { ascending: false });

    if (error) {
      throw new Error(`통계 조회 실패: ${error.message}`);
    }

    return data;
  }
}

export const unifiedScheduleService = UnifiedScheduleService;
