-- =====================================================
-- 최소한의 RLS 정책 적용 스크립트
-- =====================================================
-- 현재 존재하는 테이블들에만 RLS 정책 적용

-- 1. 현재 존재하는 테이블 목록 확인
SELECT '=== 현재 존재하는 테이블 목록 ===' as info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. generated_schedules 테이블 RLS 정책 (있다면)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generated_schedules') THEN
        -- 테이블 구조 확인
        RAISE NOTICE 'generated_schedules 테이블이 존재합니다.';
        
        -- 기존 정책 삭제
        DROP POLICY IF EXISTS "Generated schedules owner select" ON generated_schedules;
        DROP POLICY IF EXISTS "Generated schedules owner insert" ON generated_schedules;
        DROP POLICY IF EXISTS "Generated schedules owner update" ON generated_schedules;
        DROP POLICY IF EXISTS "Generated schedules owner delete" ON generated_schedules;
        
        -- RLS 활성화
        ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;
        
        -- created_by 컬럼이 있다면 정책 생성
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'generated_schedules' AND column_name = 'created_by') THEN
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

-- 3. slots 테이블 RLS 정책 (있다면)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'slots') THEN
        -- 테이블 구조 확인
        RAISE NOTICE 'slots 테이블이 존재합니다.';
        
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

-- 4. 필요한 인덱스 생성 (테이블이 존재할 때만)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'generated_schedules') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'generated_schedules' AND column_name = 'created_by') THEN
            CREATE INDEX IF NOT EXISTS idx_generated_schedules_created_by ON generated_schedules(created_by);
        END IF;
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'slots') THEN
        IF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'owner_id') THEN
            CREATE INDEX IF NOT EXISTS idx_slots_owner_id ON slots(owner_id);
        ELSIF EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'slots' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_slots_user_id ON slots(user_id);
        END IF;
    END IF;
END $$;

-- 5. 완료 메시지
SELECT '=== 최소한의 RLS 정책 적용 완료! ===' as message;
