-- =====================================================
-- 현재 DB 구조에 맞는 간단한 수정 스크립트
-- =====================================================
-- schedule_assignments 테이블이 없는 경우를 위한 스크립트

-- 1. 먼저 현재 존재하는 테이블들 확인
-- 다음 쿼리로 현재 테이블 목록을 확인하세요:
-- \dt

-- 2. generated_schedules 테이블만 있는 경우의 RLS 정책 수정

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

-- 3. teacher_pools 테이블이 있다면 정책 추가
-- (테이블이 존재하는지 먼저 확인 필요)

-- teacher_pools 테이블 존재 여부 확인 후 실행
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teacher_pools') THEN
        -- teacher_pools 정책 삭제
        DROP POLICY IF EXISTS "Teacher pools owner select" ON teacher_pools;
        DROP POLICY IF EXISTS "Teacher pools owner insert" ON teacher_pools;
        DROP POLICY IF EXISTS "Teacher pools owner update" ON teacher_pools;
        DROP POLICY IF EXISTS "Teacher pools owner delete" ON teacher_pools;
        
        -- teacher_pools에 owner_user_id 컬럼 추가 (없다면)
        ALTER TABLE teacher_pools 
        ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- owner_user_id 값 업데이트 (unified_slots를 통해)
        UPDATE teacher_pools 
        SET owner_user_id = unified_slots.owner_id
        FROM unified_slots 
        WHERE teacher_pools.slot_id = unified_slots.id 
        AND teacher_pools.owner_user_id IS NULL;
        
        -- teacher_pools 정책 생성
        CREATE POLICY "Teacher pools owner select" ON teacher_pools
          FOR SELECT TO authenticated USING (owner_user_id = (SELECT auth.uid()));

        CREATE POLICY "Teacher pools owner insert" ON teacher_pools
          FOR INSERT TO authenticated WITH CHECK (owner_user_id = (SELECT auth.uid()));

        CREATE POLICY "Teacher pools owner update" ON teacher_pools
          FOR UPDATE TO authenticated USING (owner_user_id = (SELECT auth.uid())) 
          WITH CHECK (owner_user_id = (SELECT auth.uid()));

        CREATE POLICY "Teacher pools owner delete" ON teacher_pools
          FOR DELETE TO authenticated USING (owner_user_id = (SELECT auth.uid()));
          
        RAISE NOTICE 'teacher_pools 정책이 적용되었습니다.';
    ELSE
        RAISE NOTICE 'teacher_pools 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 4. unified_slots 테이블이 있다면 정책 추가
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'unified_slots') THEN
        -- unified_slots 정책 삭제
        DROP POLICY IF EXISTS "Unified slots owner select" ON unified_slots;
        DROP POLICY IF EXISTS "Unified slots owner insert" ON unified_slots;
        DROP POLICY IF EXISTS "Unified slots owner update" ON unified_slots;
        DROP POLICY IF EXISTS "Unified slots owner delete" ON unified_slots;
        
        -- unified_slots 정책 생성
        CREATE POLICY "Unified slots owner select" ON unified_slots
          FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));

        CREATE POLICY "Unified slots owner insert" ON unified_slots
          FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));

        CREATE POLICY "Unified slots owner update" ON unified_slots
          FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) 
          WITH CHECK (owner_id = (SELECT auth.uid()));

        CREATE POLICY "Unified slots owner delete" ON unified_slots
          FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));
          
        RAISE NOTICE 'unified_slots 정책이 적용되었습니다.';
    ELSE
        RAISE NOTICE 'unified_slots 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 5. 기존 slots 테이블이 있다면 정책 추가
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'slots') THEN
        -- slots 정책 삭제
        DROP POLICY IF EXISTS "Users can view their own slots" ON slots;
        DROP POLICY IF EXISTS "Users can insert their own slots" ON slots;
        DROP POLICY IF EXISTS "Users can update their own slots" ON slots;
        DROP POLICY IF EXISTS "Users can delete their own slots" ON slots;
        
        -- slots 정책 생성 (created_by 컬럼 기반)
        CREATE POLICY "Users can view their own slots" ON slots
          FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()));

        CREATE POLICY "Users can insert their own slots" ON slots
          FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));

        CREATE POLICY "Users can update their own slots" ON slots
          FOR UPDATE TO authenticated USING (created_by = (SELECT auth.uid())) 
          WITH CHECK (created_by = (SELECT auth.uid()));

        CREATE POLICY "Users can delete their own slots" ON slots
          FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));
          
        RAISE NOTICE 'slots 정책이 적용되었습니다.';
    ELSE
        RAISE NOTICE 'slots 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 6. 필요한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generated_schedules_created_by ON generated_schedules(created_by);
CREATE INDEX IF NOT EXISTS idx_generated_schedules_slot_id ON generated_schedules(slot_id);

-- 완료 메시지
SELECT 'Simple database schema fix completed!' as message;
