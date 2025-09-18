# Supabase 설정 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 2. Supabase 프로젝트 설정

### 2.1 테이블 생성

다음 SQL을 Supabase SQL 에디터에서 실행하세요:

```sql
-- 프로필 테이블 (사용자 역할 관리)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SUPER_ADMIN')) DEFAULT 'ADMIN',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 슬롯 테이블
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  day_group TEXT NOT NULL CHECK (day_group IN ('MWF', 'TT')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 슬롯 교사 테이블
CREATE TABLE slot_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('homeroomKorean', 'foreign')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, teacher_name, kind)
);

-- 교사 제약 조건 테이블
CREATE TABLE teacher_constraints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  teacher_name TEXT NOT NULL,
  unavailable TEXT[] DEFAULT '{}',
  homeroom_disabled BOOLEAN DEFAULT FALSE,
  max_homerooms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, teacher_name)
);

-- 고정 홈룸 테이블
CREATE TABLE fixed_homerooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  class_id TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id, class_id)
);

-- 전역 옵션 테이블
CREATE TABLE global_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  include_h_in_k BOOLEAN DEFAULT TRUE,
  prefer_other_h_for_k BOOLEAN DEFAULT FALSE,
  disallow_own_h_as_k BOOLEAN DEFAULT TRUE,
  round_class_counts JSONB DEFAULT '{"1": 3, "2": 3, "3": 3, "4": 3}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(slot_id)
);

-- 생성된 스케줄 테이블
CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  day_group TEXT NOT NULL CHECK (day_group IN ('MWF', 'TT')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_batch_id TEXT,
  result JSONB NOT NULL,
  warnings TEXT[] DEFAULT '{}'
);
```

### 2.2 인덱스 생성

성능 최적화를 위한 인덱스를 생성하세요:

```sql
-- 프로필 관련 인덱스
CREATE INDEX idx_profiles_role ON profiles (role);
CREATE INDEX idx_profiles_email ON profiles (email);
```

```sql
-- 슬롯 관련 인덱스
CREATE INDEX idx_slot_teachers_slot_id_kind ON slot_teachers (slot_id, teacher_name, kind);
CREATE INDEX idx_teacher_constraints_slot_teacher ON teacher_constraints (slot_id, teacher_name);
CREATE INDEX idx_fixed_homerooms_slot_class ON fixed_homerooms (slot_id, class_id);
CREATE INDEX idx_generated_schedules_slot_created ON generated_schedules (slot_id, created_at DESC);
CREATE INDEX idx_slots_created_by ON slots (created_by);
CREATE INDEX idx_slots_day_group_created_by ON slots (day_group, created_by);

-- 복합 인덱스
CREATE INDEX idx_slots_role_day_group ON slots (created_by, day_group) WHERE created_by IS NOT NULL;
CREATE INDEX idx_generated_schedules_creator_slot ON generated_schedules (created_by, slot_id, created_at DESC);
```

### 2.3 RLS (Row Level Security) 정책

보안을 위한 RLS 정책을 설정하세요:

```sql
-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 프로필 테이블 정책
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- SUPER_ADMIN은 모든 프로필 조회 가능
CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'SUPER_ADMIN'
    )
  );
```

```sql
-- RLS 활성화
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE slot_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_constraints ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixed_homerooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;

-- 슬롯 테이블 정책
CREATE POLICY "Users can view their own slots" ON slots
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own slots" ON slots
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own slots" ON slots
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own slots" ON slots
  FOR DELETE USING (auth.uid() = created_by);

-- 슬롯 교사 테이블 정책
CREATE POLICY "Users can manage teachers for their slots" ON slot_teachers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM slots 
      WHERE slots.id = slot_teachers.slot_id 
      AND slots.created_by = auth.uid()
    )
  );

-- 교사 제약 조건 테이블 정책
CREATE POLICY "Users can manage constraints for their slots" ON teacher_constraints
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM slots 
      WHERE slots.id = teacher_constraints.slot_id 
      AND slots.created_by = auth.uid()
    )
  );

-- 고정 홈룸 테이블 정책
CREATE POLICY "Users can manage homerooms for their slots" ON fixed_homerooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM slots 
      WHERE slots.id = fixed_homerooms.slot_id 
      AND slots.created_by = auth.uid()
    )
  );

-- 전역 옵션 테이블 정책
CREATE POLICY "Users can manage options for their slots" ON global_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM slots 
      WHERE slots.id = global_options.slot_id 
      AND slots.created_by = auth.uid()
    )
  );

-- 생성된 스케줄 테이블 정책
CREATE POLICY "Users can view their own generated schedules" ON generated_schedules
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own generated schedules" ON generated_schedules
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- SUPER_ADMIN 역할을 위한 정책 (선택사항)
CREATE POLICY "Super admins can view all slots" ON slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can view all generated schedules" ON generated_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' = 'SUPER_ADMIN'
    )
  );
```

## 3. 사용자 역할 설정

사용자에게 SUPER_ADMIN 역할을 부여하려면:

```sql
-- 프로필 테이블에서 역할 업데이트
UPDATE profiles 
SET role = 'SUPER_ADMIN', updated_at = NOW()
WHERE email = 'your-email@example.com';
```

또는 새 사용자 등록 시 자동으로 프로필을 생성하는 함수:

```sql
-- 새 사용자 등록 시 프로필 자동 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'ADMIN')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 트리거 생성
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 4. 테스트 데이터 생성 (선택사항)

개발 및 테스트를 위한 샘플 데이터:

```sql
-- 테스트 슬롯 생성
INSERT INTO slots (name, description, day_group, created_by) VALUES
('테스트 MWF 슬롯', '개발용 MWF 슬롯', 'MWF', auth.uid()),
('테스트 TT 슬롯', '개발용 TT 슬롯', 'TT', auth.uid());

-- 슬롯 ID 가져오기
-- (실제 사용 시에는 애플리케이션에서 생성된 ID를 사용하세요)
```

## 5. 환경 변수 확인

애플리케이션에서 환경 변수가 제대로 로드되었는지 확인하려면:

1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. Supabase URL과 키가 올바른지 확인
3. 개발 서버를 재시작
4. 브라우저 콘솔에서 환경 변수 확인:
   ```javascript
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY)
   ```

## 6. 문제 해결

### 일반적인 문제들:

1. **RLS 오류**: 사용자가 데이터에 접근할 수 없는 경우
   - RLS 정책이 올바르게 설정되었는지 확인
   - 사용자가 로그인되어 있는지 확인

2. **환경 변수 오류**: Supabase 연결이 안 되는 경우
   - `.env.local` 파일이 올바른 위치에 있는지 확인
   - 개발 서버를 재시작
   - 환경 변수 이름이 정확한지 확인 (VITE_ 접두사 필요)

3. **권한 오류**: 특정 작업을 수행할 수 없는 경우
   - 사용자 역할이 올바르게 설정되었는지 확인
   - RLS 정책이 해당 작업을 허용하는지 확인
