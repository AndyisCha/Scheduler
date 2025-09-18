# Supabase 설정 가이드

## 환경 변수 설정

1. `.env.local` 파일을 프로젝트 루트에 생성하세요:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

2. Supabase 프로젝트에서 다음 정보를 가져오세요:
   - **URL**: 프로젝트 설정 > API > Project URL
   - **Anon Key**: 프로젝트 설정 > API > Project API keys > anon public

## 데이터베이스 스키마

다음 테이블들이 필요합니다:

### `profiles` 테이블
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Super admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() 
      AND p.role = 'SUPER_ADMIN'
    )
  );

-- 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'ADMIN');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### `slots` 테이블
```sql
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  day_group TEXT NOT NULL CHECK (day_group IN ('MWF', 'TT')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  slot_data JSONB NOT NULL
);

-- RLS 정책
ALTER TABLE slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own slots" ON slots
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Super admins can view all slots" ON slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Users can insert own slots" ON slots
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own slots" ON slots
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Super admins can insert any slots" ON slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can update any slots" ON slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );
```

### `generated_schedules` 테이블
```sql
CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id),
  day_group TEXT NOT NULL CHECK (day_group IN ('MWF', 'TT')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  result JSONB NOT NULL,
  warnings TEXT[] DEFAULT '{}',
  generation_batch_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- RLS 정책
ALTER TABLE generated_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generated schedules" ON generated_schedules
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Super admins can view all generated schedules" ON generated_schedules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Users can insert own generated schedules" ON generated_schedules
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Super admins can insert any generated schedules" ON generated_schedules
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'SUPER_ADMIN'
    )
  );
```

### `user_roles` 테이블 (선택사항)
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'SUPER_ADMIN'
    )
  );
```

## 인덱스 생성
```sql
-- 성능 최적화를 위한 인덱스
CREATE INDEX idx_slots_created_by ON slots(created_by);
CREATE INDEX idx_slots_day_group ON slots(day_group);
CREATE INDEX idx_slots_created_by_day_group ON slots(created_by, day_group);

CREATE INDEX idx_generated_schedules_created_by ON generated_schedules(created_by);
CREATE INDEX idx_generated_schedules_slot_id ON generated_schedules(slot_id);
CREATE INDEX idx_generated_schedules_batch_id ON generated_schedules(generation_batch_id);
CREATE INDEX idx_generated_schedules_expires_at ON generated_schedules(expires_at);
```

## 테스트 데이터 삽입

환경 변수를 설정하지 않으면 자동으로 Mock 데이터를 사용합니다. 
Supabase를 사용하려면 위의 스키마를 생성하고 `.env.local` 파일을 설정하세요.

## 기능

- ✅ **Supabase Auth**: 이메일/비밀번호 로그인 시스템
- ✅ **역할 기반 보안**: ADMIN/SUPER_ADMIN 권한 시스템
- ✅ **프로필 관리**: 사용자 프로필 및 역할 관리
- ✅ **보호된 라우트**: 인증 및 권한 기반 페이지 보호
- ✅ **자동 Fallback**: Supabase가 설정되지 않으면 Mock 데이터 사용
- ✅ **RLS 보안**: ADMIN은 자신의 슬롯만, SUPER_ADMIN은 모든 슬롯 접근
- ✅ **환경 변수 감지**: 설정되지 않은 경우 배너 표시
- ✅ **에러 처리**: 네트워크 오류 및 권한 오류 처리
- ✅ **로딩 상태**: 데이터 로딩 중 스켈레톤 UI 표시

## 인증 시스템

### 사용자 역할
- **ADMIN**: 자신의 슬롯만 접근 가능, 일반 스케줄러 기능 사용
- **SUPER_ADMIN**: 모든 사용자의 슬롯 접근 가능, Super Admin 페이지 접근

### 보호된 기능
- **MWF 스케줄러**: 로그인 필요
- **통합 스케줄러**: 로그인 필요  
- **Super Admin 페이지**: SUPER_ADMIN 권한 필요

### 프로필 관리
- 새 사용자 가입 시 자동으로 ADMIN 역할 부여
- SUPER_ADMIN 권한은 데이터베이스에서 직접 수정 필요
- 프로필 누락 시 관리자에게 연락하라는 안내 표시
