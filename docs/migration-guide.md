# 통합 스케줄러 DB 마이그레이션 가이드

## 🎯 목표
기존 단일 슬롯 구조에서 **교시당 여러 반 지원**이 가능한 통합 스케줄러 구조로 전면 수정

## 📋 마이그레이션 체크리스트

### 1. 기존 데이터 백업
```sql
-- 기존 슬롯 데이터 백업
CREATE TABLE slots_backup AS SELECT * FROM slots;
CREATE TABLE teacher_constraints_backup AS SELECT * FROM teacher_constraints;
CREATE TABLE fixed_homerooms_backup AS SELECT * FROM fixed_homerooms;
CREATE TABLE global_options_backup AS SELECT * FROM global_options;
CREATE TABLE generated_schedules_backup AS SELECT * FROM generated_schedules;
```

### 2. 기존 테이블 삭제
```sql
-- 기존 테이블들 삭제 (외래키 제약조건 고려)
DROP TABLE IF EXISTS generated_schedules CASCADE;
DROP TABLE IF EXISTS global_options CASCADE;
DROP TABLE IF EXISTS fixed_homerooms CASCADE;
DROP TABLE IF EXISTS teacher_constraints CASCADE;
DROP TABLE IF EXISTS slots CASCADE;
```

### 3. 새 스키마 적용
```bash
# SQL 파일 실행
psql -h your-supabase-host -U postgres -d postgres -f docs/unified-database-schema.sql
```

### 4. 데이터 마이그레이션 (선택사항)
```sql
-- 기존 데이터를 새 구조로 마이그레이션
INSERT INTO unified_slots (id, owner_id, name, description, day_group, created_by, slot_data)
SELECT 
  id,
  owner_id,
  name,
  description,
  'MWF' as day_group,  -- 기본값
  created_by,
  '{"version": "unified_v1", "schema": "unified_scheduler"}'::jsonb
FROM slots_backup;

-- 교사 풀 마이그레이션 (기존 slot_data에서 추출)
-- 이 부분은 기존 데이터 구조에 따라 커스터마이징 필요
```

## 🔄 주요 변경사항

### Before (기존 구조)
```typescript
// 단일 할당만 가능
interface DaySchedule {
  [period: number]: Assignment | null;  // 단일 할당
}
```

### After (새 구조)
```typescript
// 교시당 여러 반 지원
interface DaySchedule {
  [period: number]: Assignment[];  // 배열로 다중 할당
}
```

## 🏗️ 새 DB 구조의 장점

### 1. **교시당 여러 반 지원**
- `MWF-R1C1`, `MWF-R1C2`, `MWF-R1C3` 모두 같은 교시에 배정 가능
- UI에서 세로로 정렬된 카드로 표시

### 2. **정규화된 구조**
- 교사 정보: `teacher_pools` 테이블로 분리
- 제약조건: `teacher_constraints` 테이블로 분리
- 할당 정보: `schedule_assignments` 테이블로 정규화

### 3. **확장성**
- 새로운 스케줄 타입 추가 용이
- 교사 역할 확장 가능 (H, K, F 외 추가)
- 메타데이터 저장 공간 확보

### 4. **성능 최적화**
- 인덱스 최적화
- RLS 정책으로 보안 강화
- 트리거로 자동 업데이트

## 📊 데이터 흐름

```
1. 슬롯 생성
   ↓
2. 교사 풀 설정
   ↓
3. 글로벌 옵션 설정
   ↓
4. 제약조건 설정 (선택)
   ↓
5. 스케줄 생성
   ↓
6. 할당 데이터 정규화 저장
```

## 🚀 적용 후 확인사항

### 1. **기능 테스트**
- [ ] 슬롯 생성/수정/삭제
- [ ] 교사 풀 관리
- [ ] 스케줄 생성 (MWF/TT)
- [ ] 교시당 여러 반 표시
- [ ] 검증 로직 동작

### 2. **성능 테스트**
- [ ] 대량 데이터 조회 성능
- [ ] 스케줄 생성 속도
- [ ] 인덱스 활용도

### 3. **보안 테스트**
- [ ] RLS 정책 동작
- [ ] 사용자별 데이터 격리
- [ ] 권한 검증

## 🛠️ 문제 해결

### 1. **마이그레이션 실패 시**
```sql
-- 백업에서 복원
DROP TABLE IF EXISTS unified_slots CASCADE;
CREATE TABLE slots AS SELECT * FROM slots_backup;
-- ... 기타 테이블 복원
```

### 2. **데이터 불일치 시**
```sql
-- 데이터 무결성 검사
SELECT COUNT(*) FROM unified_slots WHERE owner_id IS NULL;
SELECT COUNT(*) FROM teacher_pools WHERE slot_id NOT IN (SELECT id FROM unified_slots);
```

### 3. **성능 이슈 시**
```sql
-- 인덱스 재생성
REINDEX DATABASE your_database_name;

-- 통계 업데이트
ANALYZE;
```

## 📝 마이그레이션 후 작업

### 1. **프론트엔드 업데이트**
- 새로운 서비스 레이어 적용
- UI 컴포넌트 업데이트
- 타입 정의 업데이트

### 2. **API 엔드포인트 업데이트**
- 기존 API 호환성 유지
- 새 기능 API 추가
- 문서 업데이트

### 3. **모니터링 설정**
- 성능 메트릭 모니터링
- 에러 로깅 설정
- 알림 설정

## ✅ 완료 기준

- [ ] 모든 기존 기능 정상 동작
- [ ] 교시당 여러 반 표시 정상
- [ ] 성능 지표 기존 수준 유지
- [ ] 보안 정책 정상 동작
- [ ] 사용자 테스트 통과

---

**⚠️ 중요**: 마이그레이션 전 반드시 **전체 데이터 백업**을 수행하고, **스테이징 환경**에서 먼저 테스트하세요.
