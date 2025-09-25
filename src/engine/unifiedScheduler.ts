// src/engine/unifiedScheduler.ts
// 통합 스케줄러: TT(화/목) + MWF(월/수/금)
// - 시험은 periods를 덮어쓰지 않고 별도 wordTests 배열에 기록
// - TT 라운드2는 H-K-H(담임 2회 + 한국인 1회, 외국인 없음)
// - MWF 라운드 규칙 반영(라운드2~4는 WT→K→F), 라운드1은 (1:H, 2:K/F 정책)

export type Role = 'H' | 'K' | 'F';

export interface Teacher {
  id: string;
  name: string;
  role: Role; // 'H' or 'K' or 'F'
}

export interface TeacherConstraint {
  teacherName: string;
  homeroomDisabled?: boolean;   // 담임 금지
  maxHomerooms?: number;        // 담임 최대 횟수(일/주 단위 정책은 호출부에서 선택)
  // 가용성: '월|1', '목|6', '화|WT' (WT = 단어시험)
  unavailable?: string[];
}

export interface GlobalOptions {
  // K 배정 시 H 풀도 포함할지
  includeHInK?: boolean;
  // 한국인 배정에서 "다른 반 담임"을 우선시할지 (동일 반 담임은 피함)
  preferOtherHForK?: boolean;
  // 자신의 반에서 K로 서지 못하게 할지
  disallowOwnHAsK?: boolean;
  // 외국인 교사 부족 시 한국인 교사로 대체할지
  allowForeignFallbackToK?: boolean;
  // 기본 false: 부족 시 경고 대신 info
  strictForeign?: boolean;
  // 기본값: min(foreignPool.length, roundClassCounts[round])
  targetForeignPerRound?: number;

  // 라운드별 반 수
  // - MWF: roundClassCounts.mwf = {1..4: number}
  // - TT : roundClassCounts.tt  = {1..2: number}
  roundClassCounts: {
    mwf?: Record<1 | 2 | 3 | 4, number>;
    tt?: Record<1 | 2, number>;
  };

  // MWF 라운드1의 2교시 정책: 'K' | 'F'
  mwfRound1Period2?: 'K' | 'F';
}

export interface FixedHomeroomsMap {
  // classId -> teacherName (담임 고정)
  [classId: string]: string;
}

export interface SlotPools {
  homeroomKoreanPool: Teacher[]; // H와 K가 섞여 있음
  foreignPool: Teacher[];        // F만
}

export interface UnifiedSlotConfig {
  id: string;
  name: string;
  slot: {
    teachers: SlotPools;
    globalOptions: GlobalOptions;
    constraints: TeacherConstraint[];
    fixedHomerooms?: FixedHomeroomsMap;
  };
}

export interface Assignment {
  teacher: string;
  role: Role;
  classId: string;
  round: number;
  period: number;
  time?: string;
  isExam?: boolean;
}

export interface ExamAssignment {
  classId: string;
  teacher: string; // 보통 담임(H)
  role: 'H';
  label: 'WT';
  time: string;
}

export interface DayResultMWF {
  periods: { [period: number]: Assignment[] }; // 1..8
  wordTests: ExamAssignment[]; // 라운드2/3/4 시작 시험
}

export interface DayResultTT {
  periods: { [period: number]: Assignment[] }; // 1..6
  wordTests: ExamAssignment[]; // 3~4 사이 시험 1회
}

export interface MWFScheduleResult {
  [day: string]: DayResultMWF;
}

export interface TTScheduleResult {
  [day: string]: DayResultTT;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  infos: string[];
}

export interface UnifiedGenerateResult {
  mwf: MWFScheduleResult;
  tt: TTScheduleResult;
  validation: ValidationResult;
}

export interface TeacherConsistencyMetrics {
  [classId: string]: {
    homeroom: string;
    korean: string;
    foreign: string;
    consistency: string;
  };
  overall_consistency_score: number;
}

export interface RoundStatistics {
  [round: string]: {
    homeroom: number;
    korean: number;
    foreign: number;
  };
}

// -------- 시간표 상수 --------
const DAYS_TT = ['화', '목'] as const;
const DAYS_MWF = ['월', '수', '금'] as const;

const TIMES_TT: Record<number, string> = {
  1: '15:20–16:05',
  2: '16:10–16:55',
  3: '17:00–17:45',
  // 시험: 17:50–18:10
  4: '18:10–19:00',
  5: '19:05–19:55',
  6: '20:00–20:50',
};
const TT_WORDTEST_TIME = '17:50–18:10';

const TIMES_MWF: Record<number, string> = {
  1: '14:20–15:05',
  2: '15:10–15:55',
  // 라운드2 시험: 16:00–16:15
  3: '16:15–17:00',
  4: '17:05–17:50',
  // 라운드3 시험: 17:50–18:05
  5: '18:05–18:55',
  6: '19:00–19:50',
  // 라운드4 시험: 20:00–20:15
  7: '20:15–21:05',
  8: '21:10–22:00',
};
const MWF_WORDTEST_TIMES: Record<2 | 3 | 4, string> = {
  2: '16:00–16:15',
  3: '17:50–18:05',
  4: '20:00–20:15',
};

// -------- 라운드별 역할 패턴 --------
// MWF
// R1: (1:H, 2:옵션 K/F)
// R2: WT -> 3:K, 4:F
// R3: WT -> 5:K, 6:F
// R4: WT -> 7:K, 8:F

// TT
// R1: 1:H, 2:K, 3:F
// WT: between 3 & 4
// R2: 4:H, 5:K, 6:H  (담임 2회 + 한국인 1회)

// -------- 유틸리티 --------
class BusyMatrix {
  private set = new Set<string>(); // key: `${day}|${period}|${teacher}`

  can(day: string, period: number, teacher: string) {
    return !this.set.has(`${day}|${period}|${teacher}`);
  }
  occupy(day: string, period: number, teacher: string) {
    this.set.add(`${day}|${period}|${teacher}`);
  }
}

// 회전 상태 관리
interface RotationState {
  roundRobinIdx: number;
}

// F 타깃 계산 헬퍼
function computeForeignTargets(roundClassCounts: Record<number, number>, foreignPoolLen: number): Record<number, number> {
  const res: Record<number, number> = {};
  Object.keys(roundClassCounts).forEach((r) => {
    const need = roundClassCounts[Number(r)];
    res[Number(r)] = Math.min(need, foreignPoolLen); // 동시 수요 ≤ F 인원
  });
  return res;
}

// 회전 선택기
function pickAvailableForeign(
  day: string, 
  period: number, 
  pool: Teacher[], 
  busyMap: BusyMatrix, 
  state: RotationState
): string | null {
  // state.roundRobinIdx: 라운드별 회전 인덱스
  // pool.length가 2라면 Tanya ↔ Alice 번갈아
  for (let i = 0; i < pool.length; i++) {
    const idx = (state.roundRobinIdx + i) % pool.length;
    const t = pool[idx];
    if (busyMap.can(day, period, t.name)) { 
      state.roundRobinIdx = idx + 1; 
      return t.name; 
    }
  }
  return null;
}

// 배정 누적 함수
function pushAssignMWF(day: '월' | '수' | '금', period: number, assignment: Assignment, result: MWFScheduleResult) {
  if (!result[day].periods[period]) {
    result[day].periods[period] = [];
  }
  result[day].periods[period].push(assignment);
}

function pushAssignTT(day: '화' | '목', period: number, assignment: Assignment, result: TTScheduleResult) {
  if (!result[day].periods[period]) {
    result[day].periods[period] = [];
  }
  result[day].periods[period].push(assignment);
}

function isWTBlocked(cons: TeacherConstraint | undefined, day: string): boolean {
  if (!cons?.unavailable?.length) return false;
  return cons.unavailable.includes(`${day}|WT`);
}
function isPeriodBlocked(cons: TeacherConstraint | undefined, day: string, period: number): boolean {
  if (!cons?.unavailable?.length) return false;
  return cons.unavailable.includes(`${day}|${period}`);
}

function pickFromPool(
  pool: Teacher[],
  day: string,
  period: number,
  busy: BusyMatrix,
  constraintsMap: Map<string, TeacherConstraint>,
  extraFilter?: (t: Teacher) => boolean
): string | null {
  for (const t of pool) {
    const cons = constraintsMap.get(t.name);
    if (isPeriodBlocked(cons, day, period)) continue;
    if (!busy.can(day, period, t.name)) continue;
    if (extraFilter && !extraFilter(t)) continue;
    return t.name;
  }
  return null;
}

function pickHomeroom(
  classId: string,
  fixedHomerooms: FixedHomeroomsMap | undefined,
  homeroomPool: Teacher[],
  day: string,
  period: number,
  busy: BusyMatrix,
  constraintsMap: Map<string, TeacherConstraint>,
  homeroomCount: Map<string, number>,
): string | null {
  // 1) 고정 담임 우선
  const fixed = fixedHomerooms?.[classId];
  if (fixed) {
    const cons = constraintsMap.get(fixed);
    if (!cons?.homeroomDisabled && !isPeriodBlocked(cons, day, period) && busy.can(day, period, fixed)) {
      const maxH = cons?.maxHomerooms ?? Infinity;
      const cur = homeroomCount.get(fixed) ?? 0;
      if (cur < maxH) return fixed;
    }
  }

  // 2) 풀에서 찾기
  for (const t of homeroomPool) {
    const cons = constraintsMap.get(t.name);
    if (cons?.homeroomDisabled) continue;
    if (isPeriodBlocked(cons, day, period)) continue;
    if (!busy.can(day, period, t.name)) continue;
    const maxH = cons?.maxHomerooms ?? Infinity;
    const cur = homeroomCount.get(t.name) ?? 0;
    if (cur < maxH) {
      return t.name;
    }
  }
  return null;
}

// 한국인 배정 시 H 포함/동일반 담임 제외 등 옵션 처리
function pickKorean(
  classId: string,
  homeroomOfClass: string | null,
  pools: SlotPools,
  day: string,
  period: number,
  busy: BusyMatrix,
  constraintsMap: Map<string, TeacherConstraint>,
  opts: GlobalOptions
): string | null {
  const kPool: Teacher[] = [];

  // K 전담
  for (const t of pools.homeroomKoreanPool) if (t.role === 'K') kPool.push(t);

  // 옵션: H도 K로 포함
  if (opts.includeHInK) {
    for (const t of pools.homeroomKoreanPool) {
      if (t.role === 'H') {
        if (opts.disallowOwnHAsK && homeroomOfClass && t.name === homeroomOfClass) {
          // 자신의 반에서는 K로 서지 않음
          continue;
        }
        kPool.push(t);
      }
    }
  }

  const preferOtherH = !!opts.preferOtherHForK && !!homeroomOfClass;

  // 선호 정책: 다른 반 담임(H)을 우선하고, 그 외 K를 뒤에
  const preferred: Teacher[] = [];
  const rest: Teacher[] = [];
  for (const t of kPool) {
    if (preferOtherH && t.role === 'H' && t.name !== homeroomOfClass) preferred.push(t);
    else rest.push(t);
  }

  // 1) 선호 그룹에서 시도
  let pick =
    pickFromPool(preferred, day, period, busy, constraintsMap) ??
    pickFromPool(rest, day, period, busy, constraintsMap);

  return pick;
}

// -------- TT 생성 --------
function generateTT(config: UnifiedSlotConfig): { result: TTScheduleResult; validation: { isValid: boolean; errors: string[]; warnings: string[]; infos: string[] } } {
  const { teachers, globalOptions, constraints, fixedHomerooms } = config.slot;
  const roundCount = globalOptions.roundClassCounts?.tt ?? { 1: 0, 2: 0 };

  const result: TTScheduleResult = {};
  const busy = new BusyMatrix();
  const consMap = new Map<string, TeacherConstraint>();
  constraints.forEach(c => consMap.set(c.teacherName, c));
  const homeroomCount = new Map<string, number>(); // (간단히) 전체 누적 카운트

  // 반 아이디 생성
  const classesR1 = Array.from({ length: roundCount[1] ?? 0 }, (_, i) => `TT-R1C${i + 1}`);
  const classesR2 = Array.from({ length: roundCount[2] ?? 0 }, (_, i) => `TT-R2C${i + 1}`);
  
  console.log('🔢 ttCounts:', globalOptions.roundClassCounts?.tt);
  console.log('TT R1 classes:', classesR1);
  console.log('TT R2 classes:', classesR2);

  // 풀 분리
  const HPool = teachers.homeroomKoreanPool.filter(t => t.role === 'H');
  const KPool = teachers.homeroomKoreanPool.filter(t => t.role === 'K');
  const FPool = teachers.foreignPool;

  for (const day of DAYS_TT) {
    result[day] = { periods: {}, wordTests: [] };
    
    // 교시별 배열 초기화
    [1, 2, 3, 4, 5, 6].forEach(period => {
      result[day].periods[period] = [];
    });

    // 1) 라운드1: 1:H, 2:K, 3:F
    for (const classId of classesR1) {
      // 1교시 H
      const h1 = pickHomeroom(classId, fixedHomerooms, HPool, day, 1, busy, consMap, homeroomCount);
      if (h1) {
        busy.occupy(day, 1, h1);
        homeroomCount.set(h1, (homeroomCount.get(h1) ?? 0) + 1);
        pushAssignTT(day, 1, { teacher: h1, role: 'H', classId, round: 1, period: 1, time: TIMES_TT[1] }, result);
      }

      const homeroomOfClass = h1 ?? fixedHomerooms?.[classId] ?? null;

      // 2교시 K
      const k = pickKorean(classId, homeroomOfClass, teachers, day, 2, busy, consMap, globalOptions);
      if (k) {
        busy.occupy(day, 2, k);
        pushAssignTT(day, 2, { teacher: k, role: 'K', classId, round: 1, period: 2, time: TIMES_TT[2] }, result);
      }

      // 3교시 F
      const f = pickFromPool(FPool, day, 3, busy, consMap);
      if (f) {
        busy.occupy(day, 3, f);
        pushAssignTT(day, 3, { teacher: f, role: 'F', classId, round: 1, period: 3, time: TIMES_TT[3] }, result);
      }

      // 단어시험 (3~4 사이, 담임 H)
      const examTeacher = homeroomOfClass;
      if (examTeacher) {
        const c = consMap.get(examTeacher);
        if (!isWTBlocked(c, day)) {
          result[day].wordTests.push({
            classId,
            teacher: examTeacher,
            role: 'H',
            label: 'WT',
            time: TT_WORDTEST_TIME,
          });
        }
      }
    }

    // 2) 라운드2: 4:H, 5:K, 6:H (F 없음)
    for (const classId of classesR2) {
      // 4교시 H (동일 담임 허용)
      const hA = pickHomeroom(classId, fixedHomerooms, HPool, day, 4, busy, consMap, homeroomCount);
      if (hA) {
        busy.occupy(day, 4, hA);
        homeroomCount.set(hA, (homeroomCount.get(hA) ?? 0) + 1);
        pushAssignTT(day, 4, { teacher: hA, role: 'H', classId, round: 2, period: 4, time: TIMES_TT[4] }, result);
      }
      const homeroomOfClass = hA ?? fixedHomerooms?.[classId] ?? null;

      // 5교시 K
      const k = pickKorean(classId, homeroomOfClass, teachers, day, 5, busy, consMap, globalOptions);
      if (k) {
        busy.occupy(day, 5, k);
        pushAssignTT(day, 5, { teacher: k, role: 'K', classId, round: 2, period: 5, time: TIMES_TT[5] }, result);
      }

      // 6교시 H (동일 담임 재사용 가능)
      const hB = pickHomeroom(classId, fixedHomerooms, HPool, day, 6, busy, consMap, homeroomCount);
      if (hB) {
        busy.occupy(day, 6, hB);
        homeroomCount.set(hB, (homeroomCount.get(hB) ?? 0) + 1);
        pushAssignTT(day, 6, { teacher: hB, role: 'H', classId, round: 2, period: 6, time: TIMES_TT[6] }, result);
      }
    }
  }

  return {
    result,
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
      infos: []
    }
  };
}

// -------- MWF 생성 --------
function generateMWF(config: UnifiedSlotConfig): { result: MWFScheduleResult; validation: { isValid: boolean; errors: string[]; warnings: string[]; infos: string[] } } {
  const { teachers, globalOptions, constraints, fixedHomerooms } = config.slot;
  
  // 옵션 정규화
  const opts = {
    strictForeign: false,
    ...globalOptions,
  };
  const examPeriods = Array.isArray(globalOptions?.examPeriods) ? globalOptions.examPeriods : [];
  
  const roundCount = opts.roundClassCounts?.mwf ?? { 1: 0, 2: 0, 3: 0, 4: 0 };
  
  console.log('🔧 MWF Generation - Config:', config);
  console.log('🔧 MWF Generation - Teachers:', teachers);
  console.log('🔧 MWF Generation - GlobalOptions:', opts);
  console.log('🔧 MWF Generation - RoundCount:', roundCount);
  console.log('🔧 MWF Generation - Exam periods normalized:', examPeriods);
  console.log('🔢 mwfCounts:', globalOptions.roundClassCounts?.mwf);

  const result: MWFScheduleResult = {};
  const busy = new BusyMatrix();
  const consMap = new Map<string, TeacherConstraint>();
  constraints.forEach(c => consMap.set(c.teacherName, c));
  const homeroomCount = new Map<string, number>();

  // 반 아이디
  const classesR1 = Array.from({ length: roundCount[1] ?? 0 }, (_, i) => `MWF-R1C${i + 1}`);
  const classesR2 = Array.from({ length: roundCount[2] ?? 0 }, (_, i) => `MWF-R2C${i + 1}`);
  const classesR3 = Array.from({ length: roundCount[3] ?? 0 }, (_, i) => `MWF-R3C${i + 1}`);
  const classesR4 = Array.from({ length: roundCount[4] ?? 0 }, (_, i) => `MWF-R4C${i + 1}`);
  
  console.log('R1 classes:', classesR1);
  console.log('R2 classes:', classesR2);
  console.log('R3 classes:', classesR3);
  console.log('R4 classes:', classesR4);

  // 풀
  const HPool = teachers.homeroomKoreanPool.filter(t => t.role === 'H');
  const KPool = teachers.homeroomKoreanPool.filter(t => t.role === 'K');
  const FPool = teachers.foreignPool;

  // 교사 배정 고정 맵 생성 (일관성 보장)
  const fixedAssignments = new Map<string, {
    homeroom: string;
    korean: string;
    foreign: string;
  }>();

  // 각 반에 담임, 한국인, 외국인 교사 고정 배정
  const allClasses = [...classesR1, ...classesR2, ...classesR3, ...classesR4];
  allClasses.forEach((classId, index) => {
    // 담임 고정 (순환 배정)
    const homeroom = HPool[index % HPool.length];
    
    // 한국인 교사 고정 (다른 담임 우선)
    const koreanIndex = (index + 1) % HPool.length;
    const korean = HPool[koreanIndex];
    
    // 외국인 교사 고정 (순환 배정)
    const foreign = FPool[index % FPool.length];
    
    fixedAssignments.set(classId, {
      homeroom: homeroom.name,
      korean: korean.name,
      foreign: foreign.name
    });
    
    console.log(`🎯 Fixed assignment for ${classId}:`, {
      homeroom: homeroom.name,
      korean: korean.name,
      foreign: foreign.name
    });
  });

  // F 타깃 계산
  const foreignTargets = opts.targetForeignPerRound
    ? Object.fromEntries(Object.keys(roundCount).map(k => [Number(k), Math.min(opts.targetForeignPerRound, FPool.length)]))
    : computeForeignTargets(roundCount, FPool.length);

  console.log('🔧 MWF Generation - Foreign targets:', foreignTargets);

  // 메시지 레벨 관리
  const warnings: string[] = [];
  const infos: string[] = [];
  const pushWarning = (m: string) => warnings.push(m);
  const pushInfo = (m: string) => infos.push(m);

  const r1p2 = opts.mwfRound1Period2 ?? 'F'; // 라운드1 2교시 정책을 F로 변경

  for (const day of DAYS_MWF) {
    console.log(`📅 Processing day: ${day}`);
    result[day] = { periods: {}, wordTests: [] };
    
    // 교시별 배열 초기화
    [1, 2, 3, 4, 5, 6, 7, 8].forEach(period => {
      result[day].periods[period] = [];
    });
    
    // 라운드별 F 배정 카운터 초기화
    const assignedForeignPerRound: Record<number, number> = {};
    for (const round of [1, 2, 3, 4]) assignedForeignPerRound[round] = 0;
    
    // 회전 상태 초기화
    const rotationState: RotationState = { roundRobinIdx: 0 };

    // 라운드1: 1:H, 2:F/K (담임 2회, 한국인 2회, 외국인 2회)
    console.log(`🎯 Starting R1 processing for ${day}, classes:`, classesR1);
    for (const classId of classesR1) {
      const fixed = fixedAssignments.get(classId);
      if (!fixed) continue;

      // 1교시 H/K (담임/한국인 교사)
      if (day === '월') {
        // 월요일: 담임 교사
        const h = fixed.homeroom;
        if (busy.can(day, 1, h)) {
          busy.occupy(day, 1, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 1, { teacher: h, role: 'H', classId, round: 1, period: 1, time: TIMES_MWF[1] }, result);
        }
      } else if (day === '수') {
        // 수요일: 한국인 교사
        const k = fixed.korean;
        if (busy.can(day, 1, k)) {
          busy.occupy(day, 1, k);
          pushAssignMWF(day, 1, { teacher: k, role: 'K', classId, round: 1, period: 1, time: TIMES_MWF[1] }, result);
        }
      }

      // 2교시 F/K (외국인/한국인 교사)
      if (day === '월') {
        // 월요일: 외국인 교사
        const f = fixed.foreign;
        if (busy.can(day, 2, f)) {
          busy.occupy(day, 2, f);
          assignedForeignPerRound[1]++;
          pushAssignMWF(day, 2, { teacher: f, role: 'F', classId, round: 1, period: 2, time: TIMES_MWF[2] }, result);
        }
      } else if (day === '수') {
        // 수요일: 외국인 교사 (2교시)
        const f = fixed.foreign;
        if (busy.can(day, 2, f)) {
          busy.occupy(day, 2, f);
          assignedForeignPerRound[1]++;
          pushAssignMWF(day, 2, { teacher: f, role: 'F', classId, round: 1, period: 2, time: TIMES_MWF[2] }, result);
        }
      } else if (day === '금') {
        // 금요일: 담임 교사 (2교시)
        const h = fixed.homeroom;
        if (busy.can(day, 2, h)) {
          busy.occupy(day, 2, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 2, { teacher: h, role: 'H', classId, round: 1, period: 2, time: TIMES_MWF[2] }, result);
        }
      }
    }

    // 라운드2: 3:H/F, 4:F/K (R1과 동일한 로직)
    console.log(`🎯 Starting R2 processing for ${day}, classes:`, classesR2);
    
    for (const classId of classesR2) {
      const fixed = fixedAssignments.get(classId);
      if (!fixed) continue;

      // 3교시 H/F (일관성 보장)
      if (day === '월') {
        // 월요일: 담임 교사
        const h = fixed.homeroom;
        if (busy.can(day, 3, h)) {
          busy.occupy(day, 3, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 3, { teacher: h, role: 'H', classId, round: 2, period: 3, time: TIMES_MWF[3] }, result);
        }
      } else if (day === '수') {
        // 수요일: 한국인 교사
        const k = fixed.korean;
        if (busy.can(day, 3, k)) {
          busy.occupy(day, 3, k);
          pushAssignMWF(day, 3, { teacher: k, role: 'K', classId, round: 2, period: 3, time: TIMES_MWF[3] }, result);
        }
      } else if (day === '금') {
        // 금요일: 담임 교사
        const h = fixed.homeroom;
        if (busy.can(day, 3, h)) {
          busy.occupy(day, 3, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 3, { teacher: h, role: 'H', classId, round: 2, period: 3, time: TIMES_MWF[3] }, result);
        }
      }

      // 4교시 F/K (일관성 보장)
      if (day === '월') {
        // 월요일: 외국인 교사
        const f = fixed.foreign;
        if (busy.can(day, 4, f)) {
          busy.occupy(day, 4, f);
          assignedForeignPerRound[2]++;
          pushAssignMWF(day, 4, { teacher: f, role: 'F', classId, round: 2, period: 4, time: TIMES_MWF[4] }, result);
        }
      } else if (day === '수') {
        // 수요일: 외국인 교사
        const f = fixed.foreign;
        if (busy.can(day, 4, f)) {
          busy.occupy(day, 4, f);
          assignedForeignPerRound[2]++;
          pushAssignMWF(day, 4, { teacher: f, role: 'F', classId, round: 2, period: 4, time: TIMES_MWF[4] }, result);
        }
      } else if (day === '금') {
        // 금요일: 한국인 교사
        const k = fixed.korean;
        if (busy.can(day, 4, k)) {
          busy.occupy(day, 4, k);
          pushAssignMWF(day, 4, { teacher: k, role: 'K', classId, round: 2, period: 4, time: TIMES_MWF[4] }, result);
        }
      }

      // 시험 (담임)
      const hExam = fixed.homeroom;
      const c = consMap.get(hExam);
      if (!isWTBlocked(c, day)) {
        result[day].wordTests.push({
          classId,
          teacher: hExam,
          role: 'H',
          label: 'WT',
          time: MWF_WORDTEST_TIMES[2],
        });
      }
    }

    // 라운드3: 5:H/F, 6:F/K (R1과 동일한 로직)
    console.log(`🎯 Starting R3 processing for ${day}, classes:`, classesR3);
    
    for (const classId of classesR3) {
      const fixed = fixedAssignments.get(classId);
      if (!fixed) continue;

      // 5교시 H/F (일관성 보장)
      if (day === '월') {
        // 월요일: 담임 교사
        const h = fixed.homeroom;
        if (busy.can(day, 5, h)) {
          busy.occupy(day, 5, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 5, { teacher: h, role: 'H', classId, round: 3, period: 5, time: TIMES_MWF[5] }, result);
        }
      } else if (day === '수') {
        // 수요일: 한국인 교사
        const k = fixed.korean;
        if (busy.can(day, 5, k)) {
          busy.occupy(day, 5, k);
          pushAssignMWF(day, 5, { teacher: k, role: 'K', classId, round: 3, period: 5, time: TIMES_MWF[5] }, result);
        }
      } else if (day === '금') {
        // 금요일: 담임 교사
        const h = fixed.homeroom;
        if (busy.can(day, 5, h)) {
          busy.occupy(day, 5, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 5, { teacher: h, role: 'H', classId, round: 3, period: 5, time: TIMES_MWF[5] }, result);
        }
      }

      // 6교시 F/K (일관성 보장)
      if (day === '월') {
        // 월요일: 외국인 교사
        const f = fixed.foreign;
        if (busy.can(day, 6, f)) {
          busy.occupy(day, 6, f);
          assignedForeignPerRound[3]++;
          pushAssignMWF(day, 6, { teacher: f, role: 'F', classId, round: 3, period: 6, time: TIMES_MWF[6] }, result);
        }
      } else if (day === '수') {
        // 수요일: 외국인 교사
        const f = fixed.foreign;
        if (busy.can(day, 6, f)) {
          busy.occupy(day, 6, f);
          assignedForeignPerRound[3]++;
          pushAssignMWF(day, 6, { teacher: f, role: 'F', classId, round: 3, period: 6, time: TIMES_MWF[6] }, result);
        }
      } else if (day === '금') {
        // 금요일: 한국인 교사
        const k = fixed.korean;
        if (busy.can(day, 6, k)) {
          busy.occupy(day, 6, k);
          pushAssignMWF(day, 6, { teacher: k, role: 'K', classId, round: 3, period: 6, time: TIMES_MWF[6] }, result);
        }
      }

      // 시험 (담임)
      const hExam = fixed.homeroom;
      const c = consMap.get(hExam);
      if (!isWTBlocked(c, day)) {
        result[day].wordTests.push({
          classId,
          teacher: hExam,
          role: 'H',
          label: 'WT',
          time: MWF_WORDTEST_TIMES[3],
        });
      }
    }

    // 라운드4: 7:H, 8:K (담임 4번, 한국인 2번, 외국인 0번)
    console.log(`🎯 Starting R4 processing for ${day}, classes:`, classesR4);
    
    for (const classId of classesR4) {
      const fixed = fixedAssignments.get(classId);
      if (!fixed) continue;

      // 7교시 H (담임 교사) - 모든 날
      const h = fixed.homeroom;
      if (busy.can(day, 7, h)) {
        busy.occupy(day, 7, h);
        homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
        pushAssignMWF(day, 7, { teacher: h, role: 'H', classId, round: 4, period: 7, time: TIMES_MWF[7] }, result);
      }

      // 8교시 K/H (한국인 교사 또는 담임 교사)
      if (day === '월' || day === '수') {
        // 월요일, 수요일: 한국인 교사
        const k = fixed.korean;
        if (busy.can(day, 8, k)) {
          busy.occupy(day, 8, k);
          pushAssignMWF(day, 8, { teacher: k, role: 'K', classId, round: 4, period: 8, time: TIMES_MWF[8] }, result);
        }
      } else if (day === '금') {
        // 금요일: 담임 교사 (2번째 담임 수업)
        const h = fixed.homeroom;
        if (busy.can(day, 8, h)) {
          busy.occupy(day, 8, h);
          homeroomCount.set(h, (homeroomCount.get(h) ?? 0) + 1);
          pushAssignMWF(day, 8, { teacher: h, role: 'H', classId, round: 4, period: 8, time: TIMES_MWF[8] }, result);
        }
      }

      // 시험 (담임) - 담임 카운트에서 제외
      const hExam = fixed.homeroom;
      const c = consMap.get(hExam);
      if (!isWTBlocked(c, day)) {
        result[day].wordTests.push({
          classId,
          teacher: hExam,
          role: 'H',
          label: 'WT',
          time: MWF_WORDTEST_TIMES[4],
        });
      }
    }
  }

  return {
    result,
    validation: {
      isValid: warnings.length === 0,
      errors: [],
      warnings,
      infos
    }
  };
}

// -------- 외부 공개 API --------
export function generateUnifiedSchedules(config: UnifiedSlotConfig): UnifiedGenerateResult {
  console.log('🚀 Starting unified schedule generation with v2.0 algorithm...');
  console.log('📅 Starting MWF generation...');
  const mwfResult = generateMWF(config);
  console.log('✅ MWF generation completed');
  console.log('📅 Starting TT generation...');
  const ttResult = generateTT(config);
  console.log('✅ TT generation completed');
  
  // 교사 일관성 메트릭스 계산
  const teacherConsistencyMetrics = calculateTeacherConsistencyMetrics(mwfResult.result, ttResult.result);
  
  // 라운드별 통계 계산
  const roundStatistics = calculateRoundStatistics(mwfResult.result, ttResult.result);
  
  // 마이그레이션 안전장치 적용
  const mwf = normalizeResultCells(mwfResult.result);
  const tt = normalizeResultCells(ttResult.result);
  
  // 통합 검증 결과
  const validation: ValidationResult = {
    isValid: mwfResult.validation.isValid && ttResult.validation.isValid,
    errors: [...mwfResult.validation.errors, ...ttResult.validation.errors],
    warnings: [...mwfResult.validation.warnings, ...ttResult.validation.warnings],
    infos: [...(mwfResult.validation.infos || []), ...(ttResult.validation.infos || []), 
           `교사 일관성 점수: ${teacherConsistencyMetrics.overall_consistency_score.toFixed(2)}`]
  };
  
  return {
    mwf,
    tt,
    validation
  };
}

// 교사 일관성 메트릭스 계산 함수
function calculateTeacherConsistencyMetrics(mwfResult: MWFScheduleResult, ttResult: TTScheduleResult): TeacherConsistencyMetrics {
  const metrics: TeacherConsistencyMetrics = {
    overall_consistency_score: 1.0
  };
  
  // MWF 일관성 체크
  const mwfDays = Object.keys(mwfResult);
  const classConsistency: { [classId: string]: { homeroom: string[], korean: string[], foreign: string[] } } = {};
  
  // 각 반의 교사 배정 수집
  mwfDays.forEach(day => {
    const dayResult = mwfResult[day];
    Object.keys(dayResult.periods).forEach(period => {
      const assignments = dayResult.periods[parseInt(period)];
      assignments.forEach(assignment => {
        const classId = assignment.classId;
        if (!classConsistency[classId]) {
          classConsistency[classId] = { homeroom: [], korean: [], foreign: [] };
        }
        classConsistency[classId][assignment.role.toLowerCase() as 'homeroom' | 'korean' | 'foreign'].push(assignment.teacher);
      });
    });
  });
  
  // 일관성 점수 계산
  Object.keys(classConsistency).forEach(classId => {
    const consistency = classConsistency[classId];
    const homeroomConsistent = new Set(consistency.homeroom).size === 1;
    const koreanConsistent = new Set(consistency.korean).size === 1;
    const foreignConsistent = new Set(consistency.foreign).size === 1;
    
    metrics[classId] = {
      homeroom: consistency.homeroom[0] || '미배정',
      korean: consistency.korean[0] || '미배정',
      foreign: consistency.foreign[0] || '미배정',
      consistency: homeroomConsistent && koreanConsistent && foreignConsistent ? '완전 일관' : '부분 일관'
    };
  });
  
  // 전체 일관성 점수 계산
  const totalClasses = Object.keys(classConsistency).length;
  const consistentClasses = Object.values(metrics).filter(m => m.consistency === '완전 일관').length;
  metrics.overall_consistency_score = totalClasses > 0 ? consistentClasses / totalClasses : 1.0;
  
  return metrics;
}

// 라운드별 통계 계산 함수
function calculateRoundStatistics(mwfResult: MWFScheduleResult, ttResult: TTScheduleResult): RoundStatistics {
  const stats: RoundStatistics = {};
  
  // MWF 통계
  const mwfDays = Object.keys(mwfResult);
  mwfDays.forEach(day => {
    const dayResult = mwfResult[day];
    Object.keys(dayResult.periods).forEach(period => {
      const assignments = dayResult.periods[parseInt(period)];
      assignments.forEach(assignment => {
        const round = `R${assignment.round}`;
        if (!stats[round]) {
          stats[round] = { homeroom: 0, korean: 0, foreign: 0 };
        }
        stats[round][assignment.role.toLowerCase() as 'homeroom' | 'korean' | 'foreign']++;
      });
    });
  });
  
  return stats;
}

/* ========= 사용 예시 =========
import { generateUnifiedSchedules } from '@/engine/unifiedScheduler';

const result = generateUnifiedSchedules({
  id: 'slot-1',
  name: '9월 3주차',
  slot: {
    teachers: {
      homeroomKoreanPool: [
        { id:'h1', name:'앤디', role:'H' },
        { id:'h2', name:'레이', role:'H' },
        { id:'k1', name:'정한국', role:'K' },
      ],
      foreignPool: [
        { id:'f1', name:'Tanya', role:'F' },
        { id:'f2', name:'Alice', role:'F' },
      ],
    },
    globalOptions: {
      includeHInK: true,
      preferOtherHForK: true,
      disallowOwnHAsK: false,
      roundClassCounts: {
        mwf: { 1: 2, 2: 2, 3: 2, 4: 1 },
        tt: { 1: 2, 2: 2 },
      },
      mwfRound1Period2: 'K',
    },
    constraints: [
      { teacherName:'앤디', maxHomerooms: 3, unavailable:['화|WT','목|6'] },
      { teacherName:'레이', homeroomDisabled:false, unavailable:['월|4'] },
      { teacherName:'Tanya', unavailable:['수|2'] },
    ],
    fixedHomerooms: {
      'MWF-R2C1':'앤디',
      'TT-R2C2':'레이'
    }
  }
});
*/