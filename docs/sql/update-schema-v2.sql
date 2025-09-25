-- =====================================================
-- 데이터베이스 스키마 업데이트 스크립트 v2.0
-- 수정된 스케줄링 알고리즘에 맞춘 스키마 업데이트
-- =====================================================

-- 1. generated_schedules 테이블에 새로운 컬럼 추가
ALTER TABLE generated_schedules 
ADD COLUMN IF NOT EXISTS algorithm_version TEXT DEFAULT 'v2.0' NOT NULL,
ADD COLUMN IF NOT EXISTS teacher_consistency_metrics JSONB,
ADD COLUMN IF NOT EXISTS round_statistics JSONB,
ADD COLUMN IF NOT EXISTS validation_details JSONB;

-- 2. 기존 데이터에 버전 정보 추가 (v1.0으로 마이그레이션)
UPDATE generated_schedules 
SET algorithm_version = 'v1.0' 
WHERE algorithm_version IS NULL;

-- 3. 새로운 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generated_schedules_algorithm_version 
ON generated_schedules (algorithm_version);

CREATE INDEX IF NOT EXISTS idx_generated_schedules_validation 
ON generated_schedules USING GIN (validation_details);

CREATE INDEX IF NOT EXISTS idx_generated_schedules_consistency 
ON generated_schedules USING GIN (teacher_consistency_metrics);

CREATE INDEX IF NOT EXISTS idx_generated_schedules_round_stats 
ON generated_schedules USING GIN (round_statistics);

-- 4. 성능 최적화를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_schedules_slot_version_created 
ON generated_schedules (slot_id, algorithm_version, created_at DESC);

-- 5. JSONB 컬럼에 대한 검색 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_schedules_result_gin 
ON generated_schedules USING GIN (result);

-- 6. 제약 조건 추가
ALTER TABLE generated_schedules 
ADD CONSTRAINT chk_algorithm_version 
CHECK (algorithm_version IN ('v1.0', 'v2.0'));

-- 7. 댓글 추가
COMMENT ON COLUMN generated_schedules.algorithm_version IS '알고리즘 버전 (v1.0: 기존, v2.0: 교사 일관성 개선)';
COMMENT ON COLUMN generated_schedules.teacher_consistency_metrics IS '교사 배정 일관성 메트릭스';
COMMENT ON COLUMN generated_schedules.round_statistics IS '라운드별 교사 배정 통계';
COMMENT ON COLUMN generated_schedules.validation_details IS '상세 검증 결과';

-- 8. 슬롯 테이블에 알고리즘 버전 컬럼 추가 (선택사항)
ALTER TABLE slots 
ADD COLUMN IF NOT EXISTS preferred_algorithm_version TEXT DEFAULT 'v2.0';

-- 9. 슬롯 테이블 제약 조건 추가
ALTER TABLE slots 
ADD CONSTRAINT chk_slots_algorithm_version 
CHECK (preferred_algorithm_version IN ('v1.0', 'v2.0'));

-- 10. 슬롯 테이블 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_slots_algorithm_version 
ON slots (preferred_algorithm_version);

-- =====================================================
-- 완료 메시지
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '데이터베이스 스키마 v2.0 업데이트 완료!';
    RAISE NOTICE '새로운 컬럼: algorithm_version, teacher_consistency_metrics, round_statistics, validation_details';
    RAISE NOTICE '새로운 인덱스: 성능 최적화를 위한 GIN 인덱스 및 복합 인덱스 추가';
    RAISE NOTICE '제약 조건: 알고리즘 버전 검증 제약 조건 추가';
END $$;
