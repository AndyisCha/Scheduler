# 성능 최적화 가이드

## 데이터베이스 인덱스

다음 인덱스들을 생성하여 쿼리 성능을 향상시키세요:

### 필수 인덱스

```sql
-- 슬롯 교사 조회 최적화
CREATE INDEX CONCURRENTLY idx_slot_teachers_slot_id_kind 
ON slot_teachers (slot_id, teacher_name, kind);

-- 교사 제약 조건 조회 최적화
CREATE INDEX CONCURRENTLY idx_teacher_constraints_slot_teacher 
ON teacher_constraints (slot_id, teacher_name);

-- 고정 홈룸 조회 최적화
CREATE INDEX CONCURRENTLY idx_fixed_homerooms_slot_class 
ON fixed_homerooms (slot_id, class_id);

-- 생성된 스케줄 히스토리 조회 최적화
CREATE INDEX CONCURRENTLY idx_generated_schedules_slot_created 
ON generated_schedules (slot_id, created_at DESC);

-- 사용자별 슬롯 조회 최적화
CREATE INDEX CONCURRENTLY idx_slots_created_by 
ON slots (created_by);

-- 슬롯 요일 그룹별 조회 최적화
CREATE INDEX CONCURRENTLY idx_slots_day_group_created_by 
ON slots (day_group, created_by);
```

### 복합 인덱스

```sql
-- 슬롯 목록 조회 최적화 (역할별)
CREATE INDEX CONCURRENTLY idx_slots_role_day_group 
ON slots (created_by, day_group) 
WHERE created_by IS NOT NULL;

-- 히스토리 조회 최적화 (사용자 권한별)
CREATE INDEX CONCURRENTLY idx_generated_schedules_creator_slot 
ON generated_schedules (created_by, slot_id, created_at DESC);
```

## 애플리케이션 레벨 최적화

### 1. 엔진 최적화

- **캐싱**: 교사 가용성과 후보자 목록을 메모리에 캐시
- **메모이제이션**: `isUnavailable()` 함수 결과 캐시
- **최소 정렬**: 카운터가 크게 변경될 때만 후보자 배열 재정렬

### 2. UI 렌더링 최적화

- **지연 로딩**: 탭 컨텐츠를 필요할 때만 렌더링
- **가상화**: 200행 이상 테이블에 react-window 적용
- **디바운싱**: 필터/검색 입력에 300ms 디바운스 적용

### 3. 성능 모니터링

개발 모드에서 다음 메트릭스를 확인하세요:

- **생성 시간**: 목표 < 1초 (4라운드 × 6클래스 × 20교사)
- **배정 성공률**: 미배정 수업 최소화
- **메모리 사용량**: 캐시 크기 모니터링

## 성능 벤치마크

### 목표 성능 지표

| 시나리오 | 목표 시간 | 최대 허용 |
|---------|----------|----------|
| 4라운드 × 6클래스 × 20교사 | < 500ms | < 1초 |
| 4라운드 × 12클래스 × 40교사 | < 800ms | < 1.5초 |
| 4라운드 × 24클래스 × 80교사 | < 1.5초 | < 3초 |

### 메모리 사용량

- **캐시 크기**: 일반적으로 < 10MB
- **DOM 노드**: 200행 이상에서 가상화 적용
- **렌더링**: 지연 로딩으로 초기 렌더링 시간 단축

## 문제 해결

### 성능 저하 시 체크리스트

1. **데이터베이스**
   - 인덱스 존재 여부 확인
   - 쿼리 실행 계획 분석
   - 연결 풀 크기 확인

2. **애플리케이션**
   - 캐시 히트율 확인
   - 메모리 누수 검사
   - 컴포넌트 리렌더링 최소화

3. **네트워크**
   - API 응답 시간 측정
   - 불필요한 요청 제거
   - 압축 설정 확인

### 성능 프로파일링

```javascript
// 성능 측정 예시
const startTime = performance.now()
// ... 작업 수행
const endTime = performance.now()
console.log(`작업 완료: ${endTime - startTime}ms`)
```

## 모니터링 도구

### 개발 환경
- React DevTools Profiler
- Chrome DevTools Performance 탭
- 성능 메트릭스 패널 (앱 내장)

### 프로덕션 환경
- Vercel Analytics
- Supabase Dashboard
- 사용자 피드백 수집


