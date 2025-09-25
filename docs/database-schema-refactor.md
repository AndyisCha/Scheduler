# 데이터베이스 스키마 리팩토링 문서

## 📋 개요

수정된 스케줄링 알고리즘에 맞춰 데이터베이스 스키마를 업데이트해야 합니다. 현재 알고리즘의 주요 변경사항:

- **교사 배정 일관성**: 각 반에 배정된 교사가 3일 모두 동일
- **라운드별 패턴 변경**: R1~R3는 담임 2회, 한국인 2회, 외국인 2회 / R4는 담임 4회, 한국인 2회, 외국인 0회
- **단어시험 시간**: 담임 카운트에서 제외
- **배정 결과 구조**: 각 교시에 여러 배정 가능 (Array 형태)

## 🗃️ 현재 스키마 분석

### 기존 테이블 구조

#### 1. `slots` 테이블 (✅ 재사용 가능)
```sql
CREATE TABLE slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  day_group TEXT NOT NULL CHECK (day_group IN ('MWF', 'TT')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  slot_data JSONB NOT NULL  -- 모든 설정 데이터 포함
);
```

#### 2. `generated_schedules` 테이블 (🔄 수정 필요)
```sql
-- 현재 구조
CREATE TABLE generated_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES slots(id) ON DELETE CASCADE,
  day_group TEXT NOT NULL CHECK (day_group IN ('MWF', 'TT')),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generation_batch_id TEXT,
  result JSONB NOT NULL,  -- 이 부분이 수정됨
  warnings TEXT[] DEFAULT '{}'
);
```

## 🔄 필요한 스키마 수정사항

### 1. `generated_schedules` 테이블 수정

#### 수정된 `result` JSONB 구조:
```typescript
interface ScheduleResult {
  mwf: {
    [day: string]: {
      periods: { [period: number]: Assignment[] }; // Array로 변경
      wordTests: ExamAssignment[];
    }
  };
  tt: {
    [day: string]: {
      periods: { [period: number]: Assignment[] }; // Array로 변경
      wordTests: ExamAssignment[];
    }
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    infos: string[];
  };
}

interface Assignment {
  teacher: string;
  role: 'H' | 'K' | 'F';
  classId: string;
  round: number;
  period: number;
  time: string;
}

interface ExamAssignment {
  classId: string;
  teacher: string;
  role: 'H';
  label: 'WT';
  time: string;
}
```

### 2. 새로운 컬럼 추가

```sql
-- generated_schedules 테이블에 컬럼 추가
ALTER TABLE generated_schedules 
ADD COLUMN IF NOT EXISTS algorithm_version TEXT DEFAULT 'v2.0' NOT NULL,
ADD COLUMN IF NOT EXISTS teacher_consistency_metrics JSONB,
ADD COLUMN IF NOT EXISTS round_statistics JSONB,
ADD COLUMN IF NOT EXISTS validation_details JSONB;
```

### 3. 인덱스 추가

```sql
-- 새로운 컬럼들에 대한 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_schedules_algorithm_version 
ON generated_schedules (algorithm_version);

CREATE INDEX IF NOT EXISTS idx_generated_schedules_validation 
ON generated_schedules USING GIN (validation_details);
```

## 📝 SQL 스크립트

### 완전한 스키마 업데이트 스크립트

```sql
-- 1. generated_schedules 테이블 컬럼 추가
ALTER TABLE generated_schedules 
ADD COLUMN IF NOT EXISTS algorithm_version TEXT DEFAULT 'v2.0' NOT NULL,
ADD COLUMN IF NOT EXISTS teacher_consistency_metrics JSONB,
ADD COLUMN IF NOT EXISTS round_statistics JSONB,
ADD COLUMN IF NOT EXISTS validation_details JSONB;

-- 2. 기존 데이터 마이그레이션 (필요시)
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

-- 4. RLS 정책 업데이트 (필요시)
-- 기존 RLS 정책은 그대로 유지
```

## 🎯 새로운 데이터 구조 예시

### 1. `result` JSONB 예시
```json
{
  "mwf": {
    "월": {
      "periods": {
        "1": [
          {"teacher": "Andy", "role": "H", "classId": "MWF-R1C1", "round": 1, "period": 1, "time": "14:20-15:05"}
        ],
        "2": [
          {"teacher": "Tanya", "role": "F", "classId": "MWF-R1C1", "round": 1, "period": 2, "time": "15:10-15:55"}
        ]
      },
      "wordTests": [
        {"classId": "MWF-R2C1", "teacher": "Ray", "role": "H", "label": "WT", "time": "16:00-16:15"}
      ]
    }
  },
  "validation": {
    "isValid": true,
    "errors": [],
    "warnings": [],
    "infos": ["교사 배정 일관성 확인됨"]
  }
}
```

### 2. `teacher_consistency_metrics` JSONB 예시
```json
{
  "R1C1": {
    "homeroom": "Andy",
    "korean": "Clara", 
    "foreign": "Tanya",
    "consistency": "월수금 모두 동일"
  },
  "overall_consistency_score": 1.0
}
```

### 3. `round_statistics` JSONB 예시
```json
{
  "R1": {"homeroom": 2, "korean": 2, "foreign": 2},
  "R2": {"homeroom": 2, "korean": 2, "foreign": 2},
  "R3": {"homeroom": 2, "korean": 2, "foreign": 2},
  "R4": {"homeroom": 4, "korean": 2, "foreign": 0}
}
```

## 🚀 적용 순서

1. **백업 생성**: 기존 데이터 백업
2. **스키마 업데이트**: 위의 SQL 스크립트 실행
3. **데이터 검증**: 새로운 구조로 데이터 저장 테스트
4. **애플리케이션 업데이트**: 백엔드/프론트엔드 코드 업데이트

## ⚠️ 주의사항

- 기존 `result` JSONB 데이터는 호환성을 위해 보존
- 새로운 `algorithm_version` 컬럼으로 버전 관리
- 점진적 마이그레이션으로 안정성 확보
- RLS 정책은 기존 정책 유지

## 📍 파일 경로

**스키마 문서 위치**: `docs/database-schema-refactor.md`
**SQL 스크립트 위치**: `docs/sql/update-schema-v2.sql` (생성 예정)
