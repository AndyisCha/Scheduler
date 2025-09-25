-- =====================================================
-- 테이블 구조 확인 및 RLS 정책 적용 스크립트
-- =====================================================

-- 1. 현재 존재하는 테이블 목록 확인
SELECT '=== 현재 존재하는 테이블 목록 ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. 각 테이블의 컬럼 구조 확인
SELECT '=== slots 테이블 컬럼 구조 ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'slots' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== generated_schedules 테이블 컬럼 구조 ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'generated_schedules' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT '=== teacher_pools 테이블 컬럼 구조 ===' as info;
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'teacher_pools' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. generated_schedules 테이블 RLS 정책 (created_by 컬럼이 있다면)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generated_schedules') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'generated_schedules' AND column_name = 'created_by') THEN
            -- 기존 정책 삭제
            DROP POLICY IF EXISTS "Generated schedules owner select" ON generated_schedules;
            DROP POLICY IF EXISTS "Generated schedules owner insert" ON generated_schedules;
            DROP POLICY IF EXISTS "Generated schedules owner update" ON generated_schedules;
            DROP POLICY IF EXISTS "Generated schedules owner delete" ON generated_schedules;
            
            -- RLS 활성화
            ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;
            
            -- created_by 컬럼 기반 정책 생성
            CREATE POLICY "Generated schedules owner select" ON generated_schedules
              FOR SELECT TO authenticated USING (created_by = (SELECT auth.uid()));

            CREATE POLICY "Generated schedules owner insert" ON generated_schedules
              FOR INSERT TO authenticated WITH CHECK (created_by = (SELECT auth.uid()));

            CREATE POLICY "Generated schedules owner update" ON generated_schedules
              FOR UPDATE TO authenticated USING (created_by = (SELECT auth.uid())) 
              WITH CHECK (created_by = (SELECT auth.uid()));

            CREATE POLICY "Generated schedules owner delete" ON generated_schedules
              FOR DELETE TO authenticated USING (created_by = (SELECT auth.uid()));
              
            RAISE NOTICE 'generated_schedules RLS 정책이 적용되었습니다.';
        ELSE
            RAISE NOTICE 'generated_schedules 테이블에 created_by 컬럼이 없습니다.';
        END IF;
    ELSE
        RAISE NOTICE 'generated_schedules 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 4. slots 테이블 RLS 정책 (실제 컬럼명 확인 후 적용)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'slots') THEN
        -- 기존 정책 삭제
        DROP POLICY IF EXISTS "Users can view their own slots" ON slots;
        DROP POLICY IF EXISTS "Users can insert their own slots" ON slots;
        DROP POLICY IF EXISTS "Users can update their own slots" ON slots;
        DROP POLICY IF EXISTS "Users can delete their own slots" ON slots;
        
        -- RLS 활성화
        ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
        
        -- 실제 컬럼명 확인 후 정책 생성
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'owner_id') THEN
            CREATE POLICY "Users can view their own slots" ON slots
              FOR SELECT TO authenticated USING (owner_id = (SELECT auth.uid()));

            CREATE POLICY "Users can insert their own slots" ON slots
              FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT auth.uid()));

            CREATE POLICY "Users can update their own slots" ON slots
              FOR UPDATE TO authenticated USING (owner_id = (SELECT auth.uid())) 
              WITH CHECK (owner_id = (SELECT auth.uid()));

            CREATE POLICY "Users can delete their own slots" ON slots
              FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));
              
            RAISE NOTICE 'slots 테이블에 owner_id 컬럼 기반 RLS 정책이 적용되었습니다.';
              
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'user_id') THEN
            CREATE POLICY "Users can view their own slots" ON slots
              FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

            CREATE POLICY "Users can insert their own slots" ON slots
              FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

            CREATE POLICY "Users can update their own slots" ON slots
              FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid())) 
              WITH CHECK (user_id = (SELECT auth.uid()));

            CREATE POLICY "Users can delete their own slots" ON slots
              FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
              
            RAISE NOTICE 'slots 테이블에 user_id 컬럼 기반 RLS 정책이 적용되었습니다.';
              
        ELSE
            RAISE NOTICE 'slots 테이블에 owner_id 또는 user_id 컬럼이 없습니다. RLS 정책을 적용할 수 없습니다.';
        END IF;
    ELSE
        RAISE NOTICE 'slots 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 5. teacher_pools 테이블 RLS 정책 (있다면)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'teacher_pools') THEN
        -- 기존 정책 삭제
        DROP POLICY IF EXISTS "Teacher pools owner select" ON teacher_pools;
        DROP POLICY IF EXISTS "Teacher pools owner insert" ON teacher_pools;
        DROP POLICY IF EXISTS "Teacher pools owner update" ON teacher_pools;
        DROP POLICY IF EXISTS "Teacher pools owner delete" ON teacher_pools;
        
        -- RLS 활성화
        ALTER TABLE teacher_pools ENABLE ROW LEVEL SECURITY;
        
        -- owner_user_id 컬럼 추가 (없다면)
        ALTER TABLE teacher_pools 
        ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- slots 테이블의 실제 컬럼명에 따라 owner_user_id 값 업데이트
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'owner_id') THEN
            UPDATE teacher_pools 
            SET owner_user_id = slots.owner_id
            FROM slots 
            WHERE teacher_pools.slot_id = slots.id 
            AND teacher_pools.owner_user_id IS NULL;
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'user_id') THEN
            UPDATE teacher_pools 
            SET owner_user_id = slots.user_id
            FROM slots 
            WHERE teacher_pools.slot_id = slots.id 
            AND teacher_pools.owner_user_id IS NULL;
        END IF;
        
        -- 정책 생성
        CREATE POLICY "Teacher pools owner select" ON teacher_pools
          FOR SELECT TO authenticated USING (owner_user_id = (SELECT auth.uid()));

        CREATE POLICY "Teacher pools owner insert" ON teacher_pools
          FOR INSERT TO authenticated WITH CHECK (owner_user_id = (SELECT auth.uid()));

        CREATE POLICY "Teacher pools owner update" ON teacher_pools
          FOR UPDATE TO authenticated USING (owner_user_id = (SELECT auth.uid())) 
          WITH CHECK (owner_user_id = (SELECT auth.uid()));

        CREATE POLICY "Teacher pools owner delete" ON teacher_pools
          FOR DELETE TO authenticated USING (owner_user_id = (SELECT auth.uid()));
          
        RAISE NOTICE 'teacher_pools RLS 정책이 적용되었습니다.';
    ELSE
        RAISE NOTICE 'teacher_pools 테이블이 존재하지 않습니다.';
    END IF;
END $$;

-- 6. 필요한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_generated_schedules_created_by ON generated_schedules(created_by);

-- slots 테이블의 실제 컬럼명에 따라 인덱스 생성
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'owner_id') THEN
        CREATE INDEX IF NOT EXISTS idx_slots_owner_id ON slots(owner_id);
    ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'user_id') THEN
        CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_pools_owner_user_id ON teacher_pools(owner_user_id);

-- 7. 완료 메시지
SELECT '=== Database RLS policies applied successfully! ===' as message;
