# 데이터베이스 마이그레이션 가이드

새로운 통합 스케줄러 엔진에 맞춰서 데이터베이스를 업데이트하는 가이드입니다.

## 1. 마이그레이션 전 백업

```bash
# Supabase 프로젝트에서 백업 생성
pg_dump "postgresql://postgres:[password]@[host]:[port]/postgres" > backup_before_unified_scheduler.sql
```

## 2. 스키마 업데이트 실행

Supabase SQL 에디터에서 다음 순서로 실행하세요:

### 2.1 기본 스키마 업데이트
```sql
-- docs/database-schema-update.sql 파일의 내용을 복사해서 실행
```

### 2.2 기존 데이터 마이그레이션 확인
```sql
-- 마이그레이션 상태 확인
SELECT 
  'teacher_constraints' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN role IS NOT NULL THEN 1 END) as migrated_rows
FROM teacher_constraints
UNION ALL
SELECT 
  'global_options' as table_name,
  COUNT(*) as total_rows,
  COUNT(CASE WHEN mwf_round1_period2 IS NOT NULL THEN 1 END) as migrated_rows
FROM global_options;
```

## 3. 애플리케이션 코드 업데이트

### 3.1 환경 변수 확인
```bash
# .env.local 파일에서 Supabase 설정 확인
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 3.2 새로운 서비스 사용
- `MwfScheduler.tsx`: 통합 서비스 사용으로 업데이트 완료
- `TtScheduler.tsx`: 통합 서비스 사용으로 업데이트 완료
- `UnifiedScheduleResultCard.tsx`: 새로운 UI 컴포넌트 생성 완료

## 4. 테스트 및 검증

### 4.1 데이터베이스 연결 테스트
```sql
-- 새로운 함수 테스트
SELECT validate_schedule_rules(
  '{"test": "data"}'::jsonb,
  'MWF'
);

-- 통합 스케줄 결과 조회 함수 테스트
SELECT * FROM get_unified_schedule_results(
  (SELECT id FROM slots LIMIT 1),
  (SELECT id FROM profiles LIMIT 1)
);
```

### 4.2 애플리케이션 테스트
1. 브라우저에서 애플리케이션 접속
2. MWF 스케줄러에서 슬롯 선택 및 스케줄 생성
3. TT 스케줄러에서 슬롯 선택 및 스케줄 생성
4. 콘솔에서 검증 결과 확인

## 5. 성능 모니터링

### 5.1 통계 조회
```sql
-- 생성 통계 확인
SELECT * FROM schedule_generation_stats 
WHERE generation_date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY generation_date DESC;
```

### 5.2 인덱스 성능 확인
```sql
-- 인덱스 사용률 확인
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_tup_read DESC;
```

## 6. 롤백 계획

문제 발생 시 롤백 방법:

### 6.1 데이터베이스 롤백
```sql
-- 백업에서 복원
psql "postgresql://postgres:[password]@[host]:[port]/postgres" < backup_before_unified_scheduler.sql
```

### 6.2 애플리케이션 롤백
```bash
# 이전 커밋으로 되돌리기
git checkout [previous_commit_hash]
npm install
npm run dev
```

## 7. 문제 해결

### 7.1 자주 발생하는 문제

**문제**: `role` 필드가 NULL인 교사 제약 조건
```sql
-- 해결 방법
UPDATE teacher_constraints 
SET role = 'H' 
WHERE role IS NULL;
```

**문제**: `round_class_counts` 형식 오류
```sql
-- 해결 방법
UPDATE global_options 
SET round_class_counts = jsonb_build_object(
  'mwf', round_class_counts,
  'tt', jsonb_build_object('1', 2, '2', 2)
)
WHERE round_class_counts ? '1' AND NOT (round_class_counts ? 'mwf');
```

### 7.2 성능 문제 해결

**문제**: 느린 스케줄 생성
```sql
-- 해결 방법: 인덱스 재생성
REINDEX TABLE generated_schedules;
REINDEX TABLE teacher_constraints;
REINDEX TABLE global_options;
```

## 8. 마이그레이션 완료 체크리스트

- [ ] 데이터베이스 스키마 업데이트 완료
- [ ] 기존 데이터 마이그레이션 완료
- [ ] 새로운 함수 및 트리거 생성 완료
- [ ] 애플리케이션 코드 업데이트 완료
- [ ] MWF 스케줄러 테스트 완료
- [ ] TT 스케줄러 테스트 완료
- [ ] 검증 시스템 테스트 완료
- [ ] 성능 모니터링 설정 완료
- [ ] 백업 및 롤백 계획 수립 완료

## 9. 추가 최적화

### 9.1 자동 정리 작업 설정
```sql
-- 만료된 스케줄 자동 정리 (매일 오전 2시)
SELECT cron.schedule(
  'cleanup-expired-schedules',
  '0 2 * * *',
  'SELECT unifiedScheduleService.cleanupExpiredSchedules();'
);
```

### 9.2 모니터링 알림 설정
```sql
-- 검증 실패 시 알림 (선택사항)
CREATE OR REPLACE FUNCTION notify_validation_failure()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.validation_result->>'isValid' = 'false' THEN
    PERFORM pg_notify('validation_failure', NEW.id::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_validation_failure
  AFTER INSERT ON generated_schedules
  FOR EACH ROW EXECUTE FUNCTION notify_validation_failure();
```

마이그레이션이 완료되면 새로운 통합 스케줄러의 모든 기능을 사용할 수 있습니다!
