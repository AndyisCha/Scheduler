-- =====================================================
-- 현재 DB 구조에 맞는 수정 스크립트
-- =====================================================
-- generated_by 컬럼 오류 해결을 위한 스크립트

-- 1. 현재 generated_schedules 테이블 구조 확인
-- 다음 쿼리를 먼저 실행해서 현재 구조를 확인하세요:
-- \d generated_schedules

-- 2. 만약 generated_by 컬럼이 없다면, created_by 컬럼을 사용하는 정책으로 수정

-- 기존 정책 삭제 (충돌 방지)
DROP POLICY IF EXISTS "Generated schedules owner select" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner insert" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner update" ON generated_schedules;
DROP POLICY IF EXISTS "Generated schedules owner delete" ON generated_schedules;

-- created_by 컬럼 기반으로 새로운 정책 생성
CREATE POLICY "Generated schedules owner select" ON generated_schedules
  FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()));

CREATE POLICY "Generated schedules owner insert" ON generated_schedules
  FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Generated schedules owner update" ON generated_schedules
  FOR UPDATE TO authenticated USING (created_by = (SELECT auth.uid())) 
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Generated schedules owner delete" ON generated_schedules
  FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));

-- 3. schedule_assignments 정책도 created_by 기반으로 수정
DROP POLICY IF EXISTS "Schedule assignments owner select" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner insert" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner update" ON schedule_assignments;
DROP POLICY IF EXISTS "Schedule assignments owner delete" ON schedule_assignments;

-- generated_schedules.created_by를 통한 소유권 확인
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

-- 4. teacher_pools 정책은 그대로 유지 (owner_user_id 컬럼이 있다면)
-- 만약 owner_user_id 컬럼이 없다면, 다음을 실행하세요:

-- teacher_pools에 owner_user_id 컬럼 추가 (없다면)
ALTER TABLE teacher_pools 
ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- owner_user_id 값 업데이트 (unified_slots를 통해)
UPDATE teacher_pools 
SET owner_user_id = unified_slots.owner_id
FROM unified_slots 
WHERE teacher_pools.slot_id = unified_slots.id 
AND teacher_pools.owner_user_id IS NULL;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generated_schedules_created_by ON generated_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_teacher_pools_owner_user_id ON teacher_pools(owner_user_id);

-- 완료 메시지
SELECT 'Database schema fixed successfully!' as message;
