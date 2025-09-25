-- 새로운 통합 스케줄러에 맞는 데이터베이스 스키마 업데이트
-- 기존 테이블 구조를 유지하면서 새로운 필드 추가

-- 1. slots 테이블 업데이트 (slot_data JSONB 구조 변경)
-- 기존 구조는 유지하고 새로운 필드 추가

-- 2. teacher_constraints 테이블에 새로운 필드 추가
ALTER TABLE teacher_constraints 
ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('H', 'K', 'F'));

-- 3. global_options 테이블 업데이트 (새로운 통합 스케줄러 옵션 추가)
ALTER TABLE global_options 
ADD COLUMN IF NOT EXISTS mwf_round1_period2 TEXT CHECK (mwf_round1_period2 IN ('K', 'F')) DEFAULT 'K';

-- 기존 round_class_counts를 새로운 구조로 업데이트
-- 기존: {"1": 3, "2": 3, "3": 3, "4": 3}
-- 새로운: {"mwf": {"1": 3, "2": 3, "3": 3, "4": 3}, "tt": {"1": 2, "2": 2}}

-- 4. generated_schedules 테이블에 새로운 필드 추가
ALTER TABLE generated_schedules 
ADD COLUMN IF NOT EXISTS validation_result JSONB,
ADD COLUMN IF NOT EXISTS schedule_type TEXT CHECK (schedule_type IN ('MWF', 'TT', 'UNIFIED')) DEFAULT 'MWF';

-- 5. 새로운 통합 스케줄 결과를 위한 뷰 생성
CREATE OR REPLACE VIEW unified_schedule_results AS
SELECT 
  gs.id,
  gs.slot_id,
  gs.day_group,
  gs.created_at,
  gs.created_by,
  gs.result,
  gs.warnings,
  gs.validation_result,
  gs.schedule_type,
  s.name as slot_name,
  s.description as slot_description
FROM generated_schedules gs
JOIN slots s ON gs.slot_id = s.id;

-- 6. 새로운 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_generated_schedules_schedule_type ON generated_schedules (schedule_type);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_validation ON generated_schedules USING GIN (validation_result);
CREATE INDEX IF NOT EXISTS idx_teacher_constraints_role ON teacher_constraints (role);

-- 7. 새로운 통합 스케줄러를 위한 함수 생성
CREATE OR REPLACE FUNCTION validate_schedule_rules(
  schedule_data JSONB,
  schedule_type TEXT
) RETURNS JSONB AS $$
DECLARE
  validation_result JSONB;
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
BEGIN
  -- 기본 검증 로직 (클라이언트에서 더 상세한 검증 수행)
  IF schedule_data IS NULL THEN
    errors := array_append(errors, '스케줄 데이터가 없습니다');
  END IF;
  
  IF schedule_type NOT IN ('MWF', 'TT', 'UNIFIED') THEN
    errors := array_append(errors, '잘못된 스케줄 타입입니다');
  END IF;
  
  -- 검증 결과 구성
  validation_result := jsonb_build_object(
    'isValid', array_length(errors, 1) IS NULL,
    'errors', to_jsonb(errors),
    'warnings', to_jsonb(warnings),
    'validatedAt', NOW()
  );
  
  RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

-- 8. 스케줄 생성 시 자동 검증 트리거
CREATE OR REPLACE FUNCTION auto_validate_schedule()
RETURNS TRIGGER AS $$
BEGIN
  -- 새로 생성된 스케줄에 대해 자동 검증 수행
  NEW.validation_result := validate_schedule_rules(NEW.result, NEW.schedule_type);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_validate_schedule
  BEFORE INSERT ON generated_schedules
  FOR EACH ROW
  EXECUTE FUNCTION auto_validate_schedule();

-- 9. 기존 데이터 마이그레이션을 위한 함수
CREATE OR REPLACE FUNCTION migrate_existing_data()
RETURNS VOID AS $$
BEGIN
  -- teacher_constraints 테이블의 기존 데이터에 role 추가
  -- 기본적으로 'H' (담임)로 설정
  UPDATE teacher_constraints 
  SET role = 'H' 
  WHERE role IS NULL;
  
  -- global_options 테이블의 기존 round_class_counts를 새로운 구조로 변환
  UPDATE global_options 
  SET round_class_counts = jsonb_build_object(
    'mwf', round_class_counts,
    'tt', jsonb_build_object('1', 2, '2', 2)
  )
  WHERE round_class_counts ? '1' AND NOT (round_class_counts ? 'mwf');
  
  RAISE NOTICE '데이터 마이그레이션이 완료되었습니다';
END;
$$ LANGUAGE plpgsql;

-- 10. 마이그레이션 실행
SELECT migrate_existing_data();

-- 11. 새로운 통합 스케줄러를 위한 RLS 정책 업데이트
-- 기존 정책은 유지하고 새로운 필드에 대한 정책 추가

-- 12. 통합 스케줄 결과 조회를 위한 함수
CREATE OR REPLACE FUNCTION get_unified_schedule_results(
  p_slot_id UUID,
  p_user_id UUID DEFAULT NULL
) RETURNS TABLE (
  id UUID,
  slot_id UUID,
  day_group TEXT,
  created_at TIMESTAMPTZ,
  result JSONB,
  validation_result JSONB,
  schedule_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gs.id,
    gs.slot_id,
    gs.day_group,
    gs.created_at,
    gs.result,
    gs.validation_result,
    gs.schedule_type
  FROM generated_schedules gs
  WHERE gs.slot_id = p_slot_id
  AND (p_user_id IS NULL OR gs.created_by = p_user_id)
  ORDER BY gs.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 성능 모니터링을 위한 통계 뷰
CREATE OR REPLACE VIEW schedule_generation_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as generation_date,
  schedule_type,
  COUNT(*) as total_generations,
  COUNT(CASE WHEN validation_result->>'isValid' = 'true' THEN 1 END) as valid_generations,
  COUNT(CASE WHEN validation_result->>'isValid' = 'false' THEN 1 END) as invalid_generations,
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_generation_interval_seconds
FROM generated_schedules
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), schedule_type
ORDER BY generation_date DESC, schedule_type;

-- 14. 정리 및 최적화
VACUUM ANALYZE generated_schedules;
VACUUM ANALYZE teacher_constraints;
VACUUM ANALYZE global_options;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '새로운 통합 스케줄러에 맞는 데이터베이스 스키마 업데이트가 완료되었습니다!';
  RAISE NOTICE '주요 변경사항:';
  RAISE NOTICE '- teacher_constraints에 role 필드 추가';
  RAISE NOTICE '- global_options에 mwf_round1_period2 필드 추가';
  RAISE NOTICE '- generated_schedules에 validation_result, schedule_type 필드 추가';
  RAISE NOTICE '- 자동 검증 트리거 및 함수 추가';
  RAISE NOTICE '- 성능 최적화 인덱스 추가';
END $$;
