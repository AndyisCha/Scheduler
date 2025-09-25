-- =====================================================
-- 현재 스타일에 맞는 Supabase 데이터베이스 스키마
-- =====================================================
-- 사용자가 적용한 RLS 정책과 기존 스키마를 통합한 최종 구조

-- =====================================================
-- 1. 슬롯 설정 테이블 (통합)
-- =====================================================
CREATE TABLE IF NOT EXISTS unified_slots (
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
-- 2. 교사 풀 테이블 (정규화) - owner_user_id 추가됨
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  teacher_name VARCHAR(100) NOT NULL,
  teacher_id VARCHAR(100) NOT NULL, -- 'hk:Andy', 'f:Tanya' 형식
  role VARCHAR(10) NOT NULL CHECK (role IN ('H', 'K', 'F')),
  pool_type VARCHAR(20) NOT NULL CHECK (pool_type IN ('homeroom_korean', 'foreign')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- RLS를 위한 소유자 ID (사용자가 추가한 컬럼)
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  CONSTRAINT unique_teacher_per_slot UNIQUE (slot_id, teacher_id)
);

-- =====================================================
-- 3. 교사 제약조건 테이블
-- =====================================================
CREATE TABLE IF NOT EXISTS teacher_constraints (
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
CREATE TABLE IF NOT EXISTS fixed_homerooms (
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
CREATE TABLE IF NOT EXISTS global_options (
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
-- 6. 생성된 스케줄 테이블 (통합) - created_by 추가됨
-- =====================================================
CREATE TABLE IF NOT EXISTS generated_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES unified_slots(id) ON DELETE CASCADE,
  
  -- RLS를 위한 생성자 ID (사용자가 추가한 컬럼)
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
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
CREATE TABLE IF NOT EXISTS schedule_assignments (
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
CREATE INDEX IF NOT EXISTS idx_unified_slots_owner_id ON unified_slots(owner_id);
CREATE INDEX IF NOT EXISTS idx_unified_slots_day_group ON unified_slots(day_group);
CREATE INDEX IF NOT EXISTS idx_unified_slots_created_at ON unified_slots(created_at DESC);

-- 교사 풀 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_pools_slot_id ON teacher_pools(slot_id);
CREATE INDEX IF NOT EXISTS idx_teacher_pools_role ON teacher_pools(role);
CREATE INDEX IF NOT EXISTS idx_teacher_pools_pool_type ON teacher_pools(pool_type);
CREATE INDEX IF NOT EXISTS idx_teacher_pools_owner_user_id ON teacher_pools(owner_user_id);

-- 제약조건 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_constraints_slot_id ON teacher_constraints(slot_id);
CREATE INDEX IF NOT EXISTS idx_teacher_constraints_teacher_name ON teacher_constraints(teacher_name);

-- 고정 담임 인덱스
CREATE INDEX IF NOT EXISTS idx_fixed_homerooms_slot_id ON fixed_homerooms(slot_id);
CREATE INDEX IF NOT EXISTS idx_fixed_homerooms_class_id ON fixed_homerooms(class_id);

-- 글로벌 옵션 인덱스
CREATE INDEX IF NOT EXISTS idx_global_options_slot_id ON global_options(slot_id);

-- 스케줄 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_schedules_slot_id ON generated_schedules(slot_id);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_created_by ON generated_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_schedule_type ON generated_schedules(schedule_type);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_created_at ON generated_schedules(created_at DESC);

-- 할당 관련 인덱스
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_schedule_id ON schedule_assignments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_day_period ON schedule_assignments(day, period);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_teacher_name ON schedule_assignments(teacher_name);
CREATE INDEX IF NOT EXISTS idx_schedule_assignments_class_id ON schedule_assignments(class_id);

-- =====================================================
-- 9. RLS (Row Level Security) 정책
-- =====================================================

-- 슬롯 테이블 RLS
ALTER TABLE unified_slots ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view their own slots" ON unified_slots;
DROP POLICY IF EXISTS "Users can insert their own slots" ON unified_slots;
DROP POLICY IF EXISTS "Users can update their own slots" ON unified_slots;
DROP POLICY IF EXISTS "Users can delete their own slots" ON unified_slots;

-- 새로운 정책 생성
CREATE POLICY "Unified slots owner select" ON unified_slots
  FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "Unified slots owner insert" ON unified_slots
  FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Unified slots owner update" ON unified_slots
  FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) 
  WITH CHECK (owner_id = (SELECT auth.uid()));

CREATE POLICY "Unified slots owner delete" ON unified_slots
  FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));

-- 교사 풀 테이블 RLS
ALTER TABLE teacher_pools ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can manage teacher pools for their slots" ON teacher_pools;
DROP POLICY IF EXISTS "Teacher pools owner select" ON teacher_pools;
DROP POLICY IF EXISTS "Teacher pools owner insert" ON teacher_pools;
DROP POLICY IF EXISTS "Teacher pools owner update" ON teacher_pools;
DROP POLICY IF EXISTS "Teacher pools owner delete" ON teacher_pools;

-- 새로운 정책 생성 (owner_user_id 기반)
CREATE POLICY "Teacher pools owner select" ON teacher_pools
  FOR SELECT TO authenticated USING (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "Teacher pools owner insert" ON teacher_pools
  FOR INSERT TO authenticated WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "Teacher pools owner update" ON teacher_pools
  FOR UPDATE TO authenticated USING (owner_user_id = (SELECT auth.uid())) 
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

CREATE POLICY "Teacher pools owner delete" ON teacher_pools
  FOR DELETE TO authenticated USING (owner_user_id = (SELECT auth.uid()));

-- 교사 제약조건 테이블 RLS
ALTER TABLE teacher_constraints ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can manage teacher constraints for their slots" ON teacher_constraints;

-- 새로운 정책 생성 (unified_slots를 통한 소유권 확인)
CREATE POLICY "Teacher constraints owner select" ON teacher_constraints
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_constraints.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teacher constraints owner insert" ON teacher_constraints
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_constraints.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teacher constraints owner update" ON teacher_constraints
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_constraints.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_constraints.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Teacher constraints owner delete" ON teacher_constraints
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = teacher_constraints.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

-- 고정 담임 테이블 RLS
ALTER TABLE fixed_homerooms ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can manage fixed homerooms for their slots" ON fixed_homerooms;

-- 새로운 정책 생성
CREATE POLICY "Fixed homerooms owner select" ON fixed_homerooms
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = fixed_homerooms.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Fixed homerooms owner insert" ON fixed_homerooms
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = fixed_homerooms.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Fixed homerooms owner update" ON fixed_homerooms
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = fixed_homerooms.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = fixed_homerooms.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Fixed homerooms owner delete" ON fixed_homerooms
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = fixed_homerooms.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

-- 글로벌 옵션 테이블 RLS
ALTER TABLE global_options ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can manage global options for their slots" ON global_options;

-- 새로운 정책 생성
CREATE POLICY "Global options owner select" ON global_options
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = global_options.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Global options owner insert" ON global_options
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = global_options.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Global options owner update" ON global_options
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = global_options.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = global_options.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Global options owner delete" ON global_options
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM unified_slots 
      WHERE unified_slots.id = global_options.slot_id 
      AND unified_slots.owner_id = (SELECT auth.uid())
    )
  );

-- 생성된 스케줄 테이블 RLS
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view schedules for their slots" ON generated_schedules;
DROP POLICY IF EXISTS "Users can insert schedules for their slots" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner select" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner insert" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner update" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner delete" ON generated_schedules;

-- 새로운 정책 생성 (created_by 기반)
CREATE POLICY "Generated schedules owner select" ON generated_schedules
  FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Generated schedules owner insert" ON generated_schedules
  FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Generated schedules owner update" ON generated_schedules
  FOR UPDATE TO authenticated USING (created_by = (SELECT auth.uid())) 
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Generated schedules owner delete" ON generated_schedules
  FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));

-- 할당 테이블 RLS
ALTER TABLE schedule_assignments ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Users can view assignments for their schedules" ON schedule_assignments;
DROP POLICY IF EXISTS "Users can insert assignments for their schedules" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner select" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner insert" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner update" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner delete" ON schedule_assignments;

-- 새로운 정책 생성 (generated_schedules.created_by를 통한 소유권 확인)
CREATE POLICY "Schedule assignments owner select" ON schedule_assignments
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND generated_schedules.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Schedule assignments owner insert" ON schedule_assignments
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND generated_schedules.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Schedule assignments owner update" ON schedule_assignments
  FOR UPDATE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND generated_schedules.created_by = (SELECT auth.uid())
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND generated_schedules.created_by = (SELECT auth.uid())
    )
  );

CREATE POLICY "Schedule assignments owner delete" ON schedule_assignments
  FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM generated_schedules 
      WHERE generated_schedules.id = schedule_assignments.schedule_id 
      AND generated_schedules.created_by = (SELECT auth.uid())
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
DROP TRIGGER IF EXISTS update_unified_slots_updated_at ON unified_slots;
CREATE TRIGGER update_unified_slots_updated_at BEFORE UPDATE ON unified_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teacher_constraints_updated_at ON teacher_constraints;
CREATE TRIGGER update_teacher_constraints_updated_at BEFORE UPDATE ON teacher_constraints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_fixed_homerooms_updated_at ON fixed_homerooms;
CREATE TRIGGER update_fixed_homerooms_updated_at BEFORE UPDATE ON fixed_homerooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_global_options_updated_at ON global_options;
CREATE TRIGGER update_global_options_updated_at BEFORE UPDATE ON global_options
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_schedules_updated_at ON generated_schedules;
CREATE TRIGGER update_generated_schedules_updated_at BEFORE UPDATE ON generated_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 11. 데이터 마이그레이션 (기존 데이터 처리)
-- =====================================================

-- teacher_pools 테이블의 owner_user_id 업데이트
UPDATE teacher_pools 
SET owner_user_id = unified_slots.owner_id
FROM unified_slots 
WHERE teacher_pools.slot_id = unified_slots.id 
AND teacher_pools.owner_user_id IS NULL;

-- generated_schedules 테이블의 created_by는 이미 올바른 컬럼명이므로 별도 업데이트 불필요

-- =====================================================
-- 완료 메시지
-- =====================================================
SELECT 'Current Database Schema with RLS policies applied successfully!' as message;
