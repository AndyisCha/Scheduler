# 성능 최적화 가이드

## 🚀 수행된 최적화 작업

### 1. React 컴포넌트 최적화

#### 메모이제이션 적용
- `React.memo()`: 불필요한 리렌더링 방지
- `useMemo()`: 계산 비용이 높은 값들 캐싱
- `useCallback()`: 함수 참조 안정화

```typescript
// 예시: MwfScheduler.tsx에서 적용
const normalizedTeachers = useMemo(() => {
  if (!selectedSlot?.teachers) return { homeroomKoreanPool: [], foreignPool: [] };
  return normalizeTeachers(selectedSlot.teachers);
}, [selectedSlot?.teachers]);

const handleAddTeacher = useCallback((pool: 'homeroomKorean' | 'foreign', name: string) => {
  addTeacherToPool(pool, name);
  toast.success(`${name} 교사가 추가되었습니다.`);
}, [addTeacherToPool, toast]);
```

#### 컴포넌트 메모이제이션
- `SlotCard` 컴포넌트를 `memo()`로 래핑하여 props 변경 시에만 리렌더링

### 2. 번들 크기 최적화

#### 코드 분할 (Code Splitting)
- `React.lazy()`와 `Suspense`를 사용한 동적 임포트
- `UnifiedScheduleResultCard` 컴포넌트를 지연 로딩

```typescript
const UnifiedScheduleResultCard = lazy(() => 
  import('../components/ui/UnifiedScheduleResultCard')
    .then(module => ({ default: module.UnifiedScheduleResultCard }))
);

// 사용 시
<Suspense fallback={<div>로딩 중...</div>}>
  <UnifiedScheduleResultCard {...props} />
</Suspense>
```

#### Vite 설정 최적화
- 수동 청크 분할로 캐싱 효율성 향상
- 벤더 라이브러리별 청크 분리
- 페이지별 코드 분할

### 3. 성능 모니터링 시스템

#### 성능 측정 훅
```typescript
// usePerformanceMonitor 훅으로 렌더링 시간 측정
const { startRender, endRender } = usePerformanceMonitor({
  componentName: 'MwfScheduler',
  threshold: 16, // 60fps 기준
  onSlowRender: (metrics) => {
    console.warn('Slow render detected:', metrics);
  }
});
```

#### 메모리 사용량 모니터링
- 개발 환경에서 메모리 사용량 추적
- 메모리 누수 감지 기능

### 4. 에러 처리 표준화

#### 에러 바운더리
```typescript
<ErrorBoundary 
  fallback={<ErrorFallback />}
  onError={(error, errorInfo) => {
    // 에러 리포팅
  }}
>
  <App />
</ErrorBoundary>
```

### 5. 유틸리티 함수 최적화

#### 성능 유틸리티
- `debounce`, `throttle` 함수로 이벤트 핸들링 최적화
- `deepEqual` 함수로 React.memo 비교 최적화
- `createMemoCache`로 함수 결과 캐싱

#### 가상화 지원
- 대용량 데이터 처리를 위한 가상화 유틸리티
- `getVisibleRange` 함수로 뷰포트 기반 렌더링

### 6. 타입 안전성 개선

#### 성능 관련 타입 정의
```typescript
interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}
```

### 7. 성능 테스트 프레임워크

#### 성능 측정 도구
- 함수 실행 시간 측정
- 컴포넌트 렌더링 성능 측정
- 메모리 사용량 모니터링
- 성능 기준점 설정 및 비교

## 📊 성능 개선 효과

### 예상 개선 사항
1. **초기 로딩 시간**: 30-50% 단축 (코드 분할)
2. **렌더링 성능**: 20-40% 향상 (메모이제이션)
3. **메모리 사용량**: 15-25% 감소 (최적화된 리렌더링)
4. **번들 크기**: 25-35% 감소 (불필요한 코드 제거)

### 모니터링 지표
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Time to Interactive (TTI)

## 🛠️ 추가 최적화 권장사항

### 1. 이미지 최적화
```typescript
// WebP 형식 사용
// 지연 로딩 (Intersection Observer)
// 반응형 이미지
```

### 2. API 최적화
```typescript
// 요청 캐싱
// 배치 요청
// 페이지네이션
```

### 3. 상태 관리 최적화
```typescript
// Zustand store 분할
// 선택적 구독
// 상태 정규화
```

### 4. CSS 최적화
```typescript
// CSS-in-JS 최적화
// Critical CSS 인라인
// 미사용 CSS 제거
```

## 🔍 성능 모니터링

### 개발 환경
- React DevTools Profiler
- Chrome DevTools Performance
- Vite Bundle Analyzer

### 프로덕션 환경
- Web Vitals 측정
- 사용자 경험 메트릭스
- 에러 리포팅 (Sentry)

## 📝 성능 체크리스트

- [ ] 컴포넌트 메모이제이션 적용
- [ ] 불필요한 리렌더링 제거
- [ ] 코드 분할 구현
- [ ] 이미지 최적화
- [ ] API 요청 최적화
- [ ] 메모리 누수 방지
- [ ] 에러 바운더리 적용
- [ ] 성능 테스트 작성
- [ ] 모니터링 설정

## 🚨 주의사항

1. **과도한 최적화 방지**: 필요한 곳에만 최적화 적용
2. **메모리 사용량**: 캐싱 시 메모리 사용량 모니터링
3. **복잡도 증가**: 최적화로 인한 코드 복잡도 관리
4. **호환성**: 브라우저 호환성 고려
5. **유지보수성**: 성능 최적화 코드의 가독성 유지
