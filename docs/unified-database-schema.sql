-- =====================================================
-- 통합 스케줄러용 Supabase 데이터베스 스키마
-- =====================================================
-- 기존 테이블들을 새로운 구조로 전면 수정
-- 교시당 여러 반 지원, MWF/TT 통합 관리

-- =====================================================
-- 1. 슬롯 설정 테이블 (통합)
-- =====================================================
DROP TABLE IF EXISTS unified_slots CASCADE;

CREATE TABLE unified_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  day_group VARCHAR(10) NOT NULL CHECK (day_group IN ('MWF', 'TT', 'BOTH')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by VARCHAR(255),
  
  -- 슬롯 메타데이터
  slot_data JSONB NOT NULL DEFAULT '{}',
  
  CONSTRAINT unique_slot_name_per_owner UNIQUE (owner_id, name)
);

-- =====================================================
-- 2. 교사 풀 테이블 (정규화)
-- =====================================================
DROP TABLE IF EXISTS teacher_pools CASCADE;

CREATE TABLE teacher_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  teacher_name VARCHAR(100) NOT NULL,
  teacher_id VARCHAR(100) NOT NULL, -- 'hk:Andy', 'f:Tanya' 형식
  role VARCHAR(10) NOT NULL CHECK (role IN ('H', 'K', 'F')),
  pool_type VARCHAR(20) NOT NULL CHECK (pool_type IN ('homeroom_korean', 'foreign')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_teacher_per_slot UNIQUE (slot_id, teacher_id)
);

-- =====================================================
-- 3. 교사 제약조건 테이블
-- =====================================================
DROP TABLE IF EXISTS teacher_constraints CASCADE;

CREATE TABLE teacher_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  teacher_name VARCHAR(100) NOT NULL,
  homeroom_disabled BOOLEAN DEFAULT FALSE,
  max_homerooms INTEGER,
  unavailable_periods TEXT[], -- ['월|1', '화|WT', '목|6'] 형식
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_teacher_constraint_per_slot UNIQUE (slot_id, teacher_name)
);

-- =====================================================
-- 4. 고정 담임 테이블
-- =====================================================
DROP TABLE IF EXISTS fixed_homerooms CASCADE;

CREATE TABLE fixed_homerooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  class_id VARCHAR(50) NOT NULL, -- 'MWF-R1C1', 'TT-R2C2' 형식
  teacher_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_class_homeroom_per_slot UNIQUE (slot_id, class_id)
);

-- =====================================================
-- 5. 글로벌 옵션 테이블
-- =====================================================
DROP TABLE IF EXISTS global_options CASCADE;

CREATE TABLE global_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  
  -- K 배정 옵션
  include_h_in_k BOOLEAN DEFAULT TRUE,
  prefer_other_h_for_k BOOLEAN DEFAULT FALSE,
  disallow_own_h_as_k BOOLEAN DEFAULT TRUE,
  
  -- 외국인 교사 옵션
  allow_foreign_fallback_to_k BOOLEAN DEFAULT TRUE,
  strict_foreign BOOLEAN DEFAULT FALSE,
  target_foreign_per_round INTEGER,
  
  -- 라운드별 반 수 (JSONB)
  round_class_counts JSONB NOT NULL DEFAULT '{}',
  
  -- MWF 라운드1 2교시 정책
  mwf_round1_period2 VARCHAR(10) DEFAULT 'K' CHECK (mwf_round1_period2 IN ('K', 'F')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_global_options_per_slot UNIQUE (slot_id)
);

-- =====================================================
-- 6. 생성된 스케줄 테이블 (통합)
-- =====================================================
DROP TABLE IF EXISTS generated_schedules CASCADE;

CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 스케줄 타입
  schedule_type VARCHAR(10) NOT NULL CHECK (schedule_type IN ('MWF', 'TT', 'BOTH')),
  
  -- 생성 메타데이터
  generation_time_ms INTEGER,
  total_assignments INTEGER,
  assigned_count INTEGER,
  unassigned_count INTEGER,
  
  -- 검증 결과
  validation_result JSONB NOT NULL DEFAULT '{}',
  
  -- 스케줄 데이터 (JSONB)
  schedule_data JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. 스케줄 할당 테이블 (정규화된 구조)
-- =====================================================
DROP TABLE IF EXISTS schedule_assignments CASCADE;

CREATE TABLE schedule_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES generated_schedules(id) ON DELETE CASCADE,
  
  -- 할당 메타데이터
  day VARCHAR(10) NOT NULL, -- '월', '수', '금', '화', '목'
  period INTEGER NOT NULL, -- 1~8 (MWF), 1~6 (TT)
  assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('period', 'word_test')),
  
  -- 교사 정보
  teacher_name VARCHAR(100) NOT NULL,
  teacher_role VARCHAR(10) NOT NULL CHECK (teacher_role IN ('H', 'K', 'F')),
  
  -- 클래스 정보
  class_id VARCHAR(50) NOT NULL,
  round_number INTEGER NOT NULL,
  
  -- 시간 정보
  time_slot VARCHAR(50),
  is_exam BOOLEAN DEFAULT FALSE,
  
  -- 순서 (같은 교시에 여러 할당이 있을 때)
  assignment_order INTEGER DEFAULT 1,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 복합 인덱스를 위한 제약조건
  CONSTRAINT unique_assignment_per_schedule UNIQUE (
    schedule_id, day, period, assignment_type, class_id, assignment_order
  )
);

-- =====================================================
-- 8. 인덱스 생성
-- =====================================================

-- 슬롯 관련 인덱스
CREATE INDEX idx_unified_slots_owner_id ON unified_slots(owner_id);
CREATE INDEX idx_unified_slots_day_group ON unified_slots(day_group);
CREATE INDEX idx_unified_slots_created_at ON unified_slots(created_at DESC);

-- 교사 풀 인덱스
CREATE INDEX idx_teacher_pools_slot_id ON teacher_pools(slot_id);
CREATE INDEX idx_teacher_pools_role ON teacher_pools(role);
CREATE INDEX idx_teacher_pools_pool_type ON teacher_pools(pool_type);

-- 제약조건 인덱스
CREATE INDEX idx_teacher_constraints_slot_id ON teacher_constraints(slot_id);
CREATE INDEX idx_teacher_constraints_teacher_name ON teacher_constraints(teacher_name);

-- 고정 담임 인덱스
CREATE INDEX idx_fixed_homerooms_slot_id ON fixed_homerooms(slot_id);
CREATE INDEX idx_fixed_homerooms_class_id ON fixed_homerooms(class_id);

-- 글로벌 옵션 인덱스
CREATE INDEX idx_global_options_slot_id ON global_options(slot_id);

-- 스케줄 관련 인덱스
CREATE INDEX idx_generated_schedules_slot_id ON generated_schedules(slot_id);
CREATE INDEX idx_generated_schedules_generated_by ON generated_schedules(generated_by);
CREATE INDEX idx_generated_schedules_schedule_type ON generated_schedules(schedule_type);
CREATE INDEX idx_generated_schedules_created_at ON generated_schedules(created_at DESC);

-- 할당 관련 인덱스
CREATE INDEX idx_schedule_assignments_schedule_id ON schedule_assignments(schedule_id);
CREATE INDEX idx_schedule_assignments_day_period ON schedule_assignments(day, period);
CREATE INDEX idx_schedule_assignments_teacher_name ON schedule_assignments(teacher_name);
CREATE INDEX idx_schedule_assignments_class_id ON schedule_assignments(class_id);

-- =====================================================
-- 9. RLS (Row Level Security) 정책
-- =====================================================

-- 슬롯 테이블 RLS
ALTER TABLE unified_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own slots" ON unified_slots
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert their own slots" ON unified_slots
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update their own slots" ON unified_slots
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete their own slots" ON unified_slots
  FOR DELETE USING (auth.uid() = owner_id);

-- 교사 풀 테이블 RLS
ALTER TABLE teacher_pools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage teacher pools for their slots" ON teacher_pools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_pools.slot_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );

-- 교사 제약조건 테이블 RLS
ALTER TABLE teacher_constraints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage teacher constraints for their slots" ON teacher_constraints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_constraints.slot_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );

-- 고정 담임 테이블 RLS
ALTER TABLE fixed_homerooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage fixed homerooms for their slots" ON fixed_homerooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = fixed_homerooms.slot_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );

-- 글로벌 옵션 테이블 RLS
ALTER TABLE global_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage global options for their slots" ON global_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = global_options.slot_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );

-- 생성된 스케줄 테이블 RLS
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view schedules for their slots" ON generated_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = generated_schedules.slot_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert schedules for their slots" ON generated_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = generated_schedules.slot_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );

-- 할당 테이블 RLS
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view assignments for their schedules" ON schedule_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      JOIN unified_slots ON unified_slots.id = generated_schedules.slot_id
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert assignments for their schedules" ON schedule_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      JOIN unified_slots ON unified_slots.id = generated_schedules.slot_id
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND unified_slots.owner_id = auth.uid()
    )
  );

-- =====================================================
-- 10. 트리거 함수 (자동 업데이트 시간)
-- =====================================================

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 트리거 적용
CREATE TRIGGER update_unified_slots_updated_at BEFORE UPDATE ON unified_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teacher_constraints_updated_at BEFORE UPDATE ON teacher_constraints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fixed_homerooms_updated_at BEFORE UPDATE ON fixed_homerooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_global_options_updated_at BEFORE UPDATE ON global_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_generated_schedules_updated_at BEFORE UPDATE ON generated_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. 샘플 데이터 삽입 (테스트용)
-- =====================================================

-- 샘플 슬롯
INSERT INTO unified_slots (id, owner_id, name, description, day_group, created_by, slot_data) VALUES
(
  '86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid,
  '5678ac24-b076-4adb-a89d-f3a5fa8220cd'::uuid,
  '2025 테스트 슬롯입니다',
  '시험용 32',
  'MWF',
  'duddjeksdj9411@gmail.com',
  '{"version": "unified_v1", "schema": "unified_scheduler"}'
);

-- 샘플 교사 풀
INSERT INTO teacher_pools (slot_id, teacher_name, teacher_id, role, pool_type) VALUES
-- 홈룸 한국인 교사
('86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid, 'Andy', 'hk:Andy', 'H', 'homeroom_korean'),
('86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid, 'Clara', 'hk:Clara', 'H', 'homeroom_korean'),
('86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid, 'Royce', 'hk:Royce', 'H', 'homeroom_korean'),
('86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid, 'Ray', 'hk:Ray', 'H', 'homeroom_korean'),
-- 외국인 교사
('86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid, 'Tanya', 'f:Tanya', 'F', 'foreign'),
('86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid, 'Alice', 'f:Alice', 'F', 'foreign');

-- 샘플 글로벌 옵션
INSERT INTO global_options (
  slot_id,
  include_h_in_k,
  prefer_other_h_for_k,
  disallow_own_h_as_k,
  allow_foreign_fallback_to_k,
  strict_foreign,
  round_class_counts,
  mwf_round1_period2
) VALUES (
  '86becdd9-0d3b-427a-bbcb-6f1414c98a1e'::uuid,
  true,
  false,
  true,
  true,
  false,
  '{"mwf": {"1": 3, "2": 3, "3": 3, "4": 3}, "tt": {"1": 2, "2": 2}}'::jsonb,
  'K'
);

-- =====================================================
-- 12. 뷰 생성 (편의용)
-- =====================================================

-- 슬롯 전체 정보 뷰
CREATE OR REPLACE VIEW slot_complete_info AS
SELECT 
  s.id,
  s.name,
  s.description,
  s.day_group,
  s.created_at,
  s.updated_at,
  s.created_by,
  
  -- 교사 풀 정보 (JSONB)
  COALESCE(
    jsonb_build_object(
      'homeroomKoreanPool', 
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', tp.teacher_id,
              'name', tp.teacher_name,
              'role', tp.teacher_role
            )
          )
          FROM teacher_pools tp 
          WHERE tp.slot_id = s.id AND tp.pool_type = 'homeroom_korean'
        ), 
        '[]'::jsonb
      ),
      'foreignPool',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', tp.teacher_id,
              'name', tp.teacher_name,
              'role', tp.teacher_role
            )
          )
          FROM teacher_pools tp 
          WHERE tp.slot_id = s.id AND tp.pool_type = 'foreign'
        ), 
        '[]'::jsonb
      )
    ),
    '{}'::jsonb
  ) as teachers,
  
  -- 글로벌 옵션
  COALESCE(
    jsonb_build_object(
      'includeHInK', go.include_h_in_k,
      'preferOtherHForK', go.prefer_other_h_for_k,
      'disallowOwnHAsK', go.disallow_own_h_as_k,
      'allowForeignFallbackToK', go.allow_foreign_fallback_to_k,
      'strictForeign', go.strict_foreign,
      'targetForeignPerRound', go.target_foreign_per_round,
      'roundClassCounts', go.round_class_counts,
      'mwfRound1Period2', go.mwf_round1_period2
    ),
    '{}'::jsonb
  ) as global_options,
  
  -- 교사 제약조건
  COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'teacherName', tc.teacher_name,
          'homeroomDisabled', tc.homeroom_disabled,
          'maxHomerooms', tc.max_homerooms,
          'unavailable', tc.unavailable_periods
        )
      )
      FROM teacher_constraints tc 
      WHERE tc.slot_id = s.id
    ),
    '[]'::jsonb
  ) as teacher_constraints,
  
  -- 고정 담임
  COALESCE(
    (
      SELECT jsonb_object_agg(fh.class_id, fh.teacher_name)
      FROM fixed_homerooms fh 
      WHERE fh.slot_id = s.id
    ),
    '{}'::jsonb
  ) as fixed_homerooms

FROM unified_slots s
LEFT JOIN global_options go ON go.slot_id = s.id;

-- =====================================================
-- 완료 메시지
-- =====================================================
SELECT 'Unified Scheduler Database Schema created successfully!' as message;
