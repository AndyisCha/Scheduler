# 주간 스케줄러 대시보드

Vite + React + TypeScript로 구축된 주간 스케줄러 대시보드입니다.

## 기능

### Part A - 슬롯 관리
- 교사 설정 슬롯의 CRUD 기능
- 슬롯 이름 변경 및 활성 슬롯 선택
- localStorage를 통한 데이터 지속성
- `SchedulerSlot` 스키마와 일치하는 데이터 구조

### Part B - 교사별 조건 설정
- 고정 홈룸 설정 (드래그 앤 드롭 또는 선택)
- 불가능한 시간 그리드 (월/수/금 × 1..8교시)
- 홈룸 비활성화 토글
- 최대 홈룸 수 설정
- 글로벌 옵션: "includeHomeroomsInK", "preferOtherHomeroomsForK", "disallowHomeroomAsKForOwnClass"
- 교사별 개인 시간표 스냅샷 저장 (인쇄 가능한 뷰)

### Part C - 메트릭 및 차트
- 교사별 메트릭: [#홈룸, #한국어 수업, #자유시간] (월/수/금 + 총합)
- Chart.js를 사용한 차트
- 선택된 교사의 히트맵 (요일×교시)

### 스케줄 생성 및 표시
- 클래스 뷰: 클래스 → 요일 → [{교시, 시간, 역할, 교사}] (시험 포함)
- 교사 뷰: 교사 → 요일 → [{교시, 시간, 클래스ID, 역할}] (시험 토글)
- 요일 그리드: 요일 → 교시 → [{클래스ID, 역할, 교사}]
- 미배정 슬롯은 배지로 강조 표시하고 경고 패널에 나열

### 내보내기 및 인쇄
- 인쇄용 CSS
- 클래스/교사 뷰를 CSV/JSON으로 내보내기

## 기술 스택

- **프론트엔드**: React 19, TypeScript, Vite
- **스타일링**: Tailwind CSS
- **차트**: Chart.js, react-chartjs-2
- **상태 관리**: React Hooks + localStorage
- **코드 품질**: ESLint, Prettier

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 미리보기
npm run preview

# 린팅
npm run lint

# 코드 포맷팅
npm run format
```

## Supabase 환경 설정

Supabase 기능을 사용하려면 환경 변수를 설정해야 합니다:

1. 프로젝트 루트에 `.env.local` 파일을 생성하세요:

```bash
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

2. Supabase 프로젝트에서 다음 정보를 가져오세요:
   - **Project URL**: Settings → API → Project URL
   - **anon public key**: Settings → API → anon public key

3. 환경 변수 설정 후 개발 서버를 재시작하세요:

```bash
npm run dev
```

**참고**: 환경 변수가 설정되지 않은 경우 앱은 여전히 실행되지만 Supabase 관련 기능(인증, 데이터베이스)은 비활성화됩니다. 설정 가이드가 포함된 배너가 표시됩니다.

## 배포

### Vercel
```bash
npm run build
# Vercel CLI로 배포하거나 GitHub 연동 사용
```

### Netlify
```bash
npm run build
# Netlify CLI로 배포하거나 GitHub 연동 사용
```

## 프로젝트 구조

```
src/
├── components/          # React 컴포넌트
│   ├── SlotManager.tsx
│   ├── TeacherEditor.tsx
│   ├── ScheduleGenerator.tsx
│   ├── TeacherMetrics.tsx
│   └── TeacherHeatmap.tsx
├── pages/              # 페이지 컴포넌트 (향후 확장용)
├── utils/              # 유틸리티 함수
│   ├── scheduler.ts    # 스케줄러 엔진
│   └── export.ts       # 내보내기 유틸리티
├── store/              # 상태 관리
│   └── slots.ts        # 슬롯 관리
├── styles/             # 스타일 파일
│   └── print.css       # 인쇄용 스타일
├── types/              # TypeScript 타입 정의
│   └── scheduler.ts    # 스케줄러 타입
└── App.tsx             # 메인 앱 컴포넌트
```

## 스케줄러 규칙

### 기본 구조
- 월/수/금 3일, 4라운드 (R1=1,2교시; R2=3,4교시; R3=5,6교시; R4=7,8교시)
- 역할: H(홈룸), K(한국어), F(외국어)

### 라운드별 역할 패턴
- R1~R3: 클래스당 주간 H2 + K2 + F2 (6세션)
- R4: 클래스당 H4 + K2, F=0

### 제약 조건
- 교사별 불가능한 시간 설정
- 홈룸 비활성화 옵션
- 최대 홈룸 수 제한
- K-역할 후보 = koreanPool ∪ 모든 홈룸 (옵션 플래그로 제어)

### 시험
- R2=wordTest1, R3=wordTest2, R4=wordTest3
- 감독관 = 홈룸 (기본값)
- 동일 라운드/시간의 감독관 충돌 방지

### 공정성
- 가능한 교사 중 현재 해당 역할의 부하가 가장 낮은 교사 선택
- 동점 시 라운드/요일/교시 순서로 타이브레이크

## 라이선스

MIT License