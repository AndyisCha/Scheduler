// src/utils/ttScheduler.ts
// Tue/Thu (TT) Scheduler Engine
// R1: periods [1,2,3] -> roles multiset {H:1, K:1, F:1}
// R2: periods [4,5,6] -> roles multiset {H:2, K:1} (F forbidden)
// Common exam time between R1 and R2: 17:50–18:10 (homeroom proctor by default)

export type DayTT = "화" | "목";
export type PeriodTT = 1|2|3|4|5|6;
export type Role = "H" | "K" | "F";
export type Teacher = string;

export const DAYS_TT: DayTT[] = ["화","목"];

export const PERIOD_TIMES_TT: Record<PeriodTT, string> = {
  1: "15:20–16:05",
  2: "16:10–16:55",
  3: "17:00–17:45",
  4: "18:10–19:00",
  5: "19:05–19:55",
  6: "20:00–20:50",
};

export const EXAM_TIME_TT = "17:50–18:10";

export type TeacherConstraints = {
  unavailable?: Set<string>;   // e.g., "화|1", "목|4"
  homeroomDisabled?: boolean;
  maxHomerooms?: number;
};

export type Pools = {
  homeroomKoreanPool: Teacher[]; // 담임=한국인 동일 풀 개념
  foreignPool: Teacher[];
};

export type GlobalOptionsTT = {
  includeHInK?: boolean;
  preferOtherHForK?: boolean;
  disallowOwnHAsK?: boolean;
  // TT 전용 라운드별 반 수
  roundClassCounts: Record<1|2, number>; // {1: R1반수, 2: R2반수}
};

export type FixedHomerooms = Record<Teacher, string>; // "앤디": "R1C2" (TT도 라운드별 클래스 ID 사용)

export type TTSchedulerSlot = {
  teachers: {
    homeroomKoreanPool: Teacher[];
    foreignPool: Teacher[];
    constraints: Record<Teacher, TeacherConstraints>;
  };
  fixedHomerooms?: FixedHomerooms; // optional pinning
  globalOptions: GlobalOptionsTT;
};

// 결과 구조는 기존 MWF와 합쳐 쓰기 쉽게 동일 포맷 유지
export type Assignment = {
  classId: string;
  round: 1|2;
  period: PeriodTT;
  time: string;
  role: Role | "EXAM";
  teacher: Teacher | "(미배정)";
};

export type TTScheduleResult = {
  classSummary: Record<string, Record<DayTT, Assignment[]>>;
  teacherSummary: Record<Teacher, Record<DayTT, Assignment[]>>;
  dayGrid: Record<DayTT, Record<PeriodTT, Assignment[]>>;
  warnings: string[];
  feasibility: {
    r1ForeignOk: boolean;
    r1ForeignDemand: number;
    r1ForeignCapacity: number;
    r2HNeeded: number;
    r2KNeeded: number;
  };
  metrics?: {
    generationTimeMs: number;
    totalAssignments: number;
    assignedCount: number;
    unassignedCount: number;
    warningsCount: number;
    teachersCount: number;
    classesCount: number;
  };
};

// 공정성 카운터: 주차 전체(MWF+TT) 공유를 가정
export type FairnessLedger = {
  // 전체 역할 누계
  totalByTeacher: Record<Teacher, number>;
  // 역할별 누계
  byRole: {
    H: Record<Teacher, number>;
    K: Record<Teacher, number>;
    F: Record<Teacher, number>;
  };
};

const bump = (ledger: FairnessLedger, t: Teacher, role: Role) => {
  ledger.totalByTeacher[t] = (ledger.totalByTeacher[t] || 0) + 1;
  ledger.byRole[role][t] = (ledger.byRole[role][t] || 0) + 1;
};

const has = (s?: Set<string>, key?: string) => !!s && !!key && s.has(key);

class BusyMatrix {
  private busy = new Set<string>(); // `${day}|${period}|${teacher}`
  can(day: DayTT, period: PeriodTT, teacher: Teacher) {
    return !this.busy.has(`${day}|${period}|${teacher}`);
  }
  occupy(day: DayTT, period: PeriodTT, teacher: Teacher) {
    this.busy.add(`${day}|${period}|${teacher}`);
  }
}

function uniq<T>(arr: T[]) { return Array.from(new Set(arr)); }

function buildClassIdsForRound(round: 1|2, count: number): string[] {
  const out: string[] = [];
  for (let i=1;i<=count;i++) out.push(`R${round}C${i}`);
  return out;
}

function computeHomerooms(
  roundClasses: Record<1|2,string[]>,
  slot: TTSchedulerSlot
): Record<string, Teacher> {
  const { fixedHomerooms = {}, teachers } = slot;
  const constraints = teachers.constraints || {};
  const Hs = teachers.homeroomKoreanPool;

  const takenClasses = new Set<string>(Object.values(fixedHomerooms));
  const homerooms: Record<string, Teacher> = {};

  // fixed 먼저
  for (const [t,cid] of Object.entries(fixedHomerooms)) homerooms[cid] = t;

  // 자동 배정 (fair하게, 제한 준수)
  const maxH: Record<Teacher, number> = {};
  const curH: Record<Teacher, number> = {};
  const allowed = Hs.filter(t => !constraints[t]?.homeroomDisabled);
  for (const t of allowed) {
    maxH[t] = constraints[t]?.maxHomerooms ?? Number.POSITIVE_INFINITY;
    curH[t] = Object.values(fixedHomerooms).filter(cid => homerooms[cid] === t).length;
  }

  const all = uniq(Object.values(roundClasses).flat());
  const remaining = all.filter(cid => !takenClasses.has(cid));

  for (const cid of remaining) {
    const candidates = allowed.filter(t => curH[t] < maxH[t]);
    if (!candidates.length) { continue; }
    candidates.sort((a,b) => (curH[a]-curH[b]) || a.localeCompare(b,"ko"));
    const pick = candidates[0];
    homerooms[cid] = pick;
    curH[pick] = (curH[pick] || 0) + 1;
  }

  for (const cid of all) if (!homerooms[cid]) homerooms[cid] = `H-${cid}`;
  return homerooms;
}

// 후보 선택기들 (공정성 + 가용성 + 동시간대 금지)
function pickH(
  ownH: Teacher,
  day: DayTT,
  period: PeriodTT,
  busy: BusyMatrix,
  constraints: Record<Teacher, TeacherConstraints>,
): Teacher | null {
  const c = constraints[ownH];
  if (c?.unavailable && has(c.unavailable, `${day}|${period}`)) return null;
  if (!busy.can(day, period, ownH)) return null;
  return ownH;
}

function pickK(
  _classId: string,
  ownH: Teacher,
  day: DayTT,
  period: PeriodTT,
  pools: Pools,
  homeroomsMap: Record<string,Teacher>,
  busy: BusyMatrix,
  constraints: Record<Teacher, TeacherConstraints>,
  ledger: FairnessLedger,
  opts: GlobalOptionsTT
): Teacher | null {
  const {
    includeHInK = true,
    preferOtherHForK = true,
    disallowOwnHAsK = false,
  } = opts;

  let candidates = [...(pools.homeroomKoreanPool || [])];
  if (includeHInK) {
    const allHs = Object.values(homeroomsMap);
    if (preferOtherHForK || disallowOwnHAsK) {
      candidates.push(...allHs.filter(t => t !== ownH));
    } else {
      candidates.push(...allHs);
    }
  }
  candidates = uniq(candidates).filter(t => {
    const c = constraints[t];
    if (c?.unavailable && has(c.unavailable, `${day}|${period}`)) return false;
    if (!busy.can(day, period, t)) return false;
    return true;
  });

  candidates.sort((a,b) =>
    ( (ledger.byRole.K[a]||0) - (ledger.byRole.K[b]||0) ) ||
    ( (ledger.totalByTeacher[a]||0) - (ledger.totalByTeacher[b]||0) ) ||
    a.localeCompare(b,"ko")
  );
  return candidates[0] ?? null;
}

function pickF(
  day: DayTT,
  period: PeriodTT,
  pools: Pools,
  busy: BusyMatrix,
  constraints: Record<Teacher, TeacherConstraints>,
  ledger: FairnessLedger
): Teacher | null {
  let candidates = [...(pools.foreignPool || [])];
  candidates = candidates.filter(t => {
    const c = constraints[t];
    if (c?.unavailable && has(c.unavailable, `${day}|${period}`)) return false;
    if (!busy.can(day, period, t)) return false;
    return true;
  });
  candidates.sort((a,b) =>
    ( (ledger.byRole.F[a]||0) - (ledger.byRole.F[b]||0) ) ||
    ( (ledger.totalByTeacher[a]||0) - (ledger.totalByTeacher[b]||0) ) ||
    a.localeCompare(b,"ko")
  );
  return candidates[0] ?? null;
}

// 역할 분산용 위상 (capacity-aware)
function phaseIndex(classIdx: number, capacity: number, base: number, modulo: number) {
  const cap = Math.max(1, capacity);
  const phase = Math.floor(classIdx / cap);
  return (base + phase) % modulo;
}

export function createTTScheduleDay(
  slot: TTSchedulerSlot,
  day: DayTT,
  ledger: FairnessLedger
): TTScheduleResult {
  const warnings: string[] = [];
  const pools: Pools = {
    homeroomKoreanPool: slot.teachers.homeroomKoreanPool || [],
    foreignPool: slot.teachers.foreignPool || [],
  };
  const constraints = slot.teachers.constraints || {};
  const countsR1 = slot.globalOptions.roundClassCounts[1] || 0;
  const countsR2 = slot.globalOptions.roundClassCounts[2] || 0;
  const classesR1 = buildClassIdsForRound(1, countsR1);
  const classesR2 = buildClassIdsForRound(2, countsR2);

  const byDay: Record<DayTT, Record<PeriodTT, Assignment[]>> = { 
    [day]: {} as Record<PeriodTT, Assignment[]>
  } as any;
  const byClass: Record<string, Record<DayTT, Assignment[]>> = {};
  const byTeacher: Record<Teacher, Record<DayTT, Assignment[]>> = {};
  const push = (a: Assignment) => {
    (byDay[day][a.period] ||= []).push(a);
    (byClass[a.classId] ||= {} as any); 
    (byClass[a.classId][day] ||= []).push(a);
    const tkey = a.teacher;
    (byTeacher[tkey] ||= {} as any); 
    (byTeacher[tkey][day] ||= []).push(a);
  };

  // Homerooms (R1+R2 모두 포함)
  const roundClasses: Record<1|2,string[]> = { 1: classesR1, 2: classesR2 };
  const homeroomsMap = computeHomerooms(roundClasses, slot);

  const busy = new BusyMatrix();

  // --- Feasibility checks ---
  const foreignCap = pools.foreignPool.length;
  const r1ForeignDemand = classesR1.length; // 하루 R1에서 반당 1회 F
  const r1ForeignCapacity = foreignCap * 3; // 한 원어민이 1,2,3교시 각각 1반씩 → x3
  const r1ForeignOk = r1ForeignDemand <= r1ForeignCapacity;

  const r2HNeeded = 2 * classesR2.length;
  const r2KNeeded = 1 * classesR2.length;

  // --- Exams (between 3 and 4) ---
  // 담임 우선, 동시간 감독 충돌은 없음(모두 같은 시간) → 한 교사가 여러 반 담임이면 충돌. 폴백 규칙 간단화(다른 담임→한국인)
  const homeroomToClassesAtExam: Record<Teacher, string[]> = {};
  [...classesR1, ...classesR2].forEach(cid => {
    const h = homeroomsMap[cid];
    (homeroomToClassesAtExam[h] ||= []).push(cid);
  });
  for (const [h, list] of Object.entries(homeroomToClassesAtExam)) {
    if (list.length <= 1) continue;
    // 동일 시간에 여러 반 감독 불가 → 첫 반만 H, 나머지는 폴백
    for (let i=1;i<list.length;i++) {
      const cid = list[i];
      // 폴백: 다른 담임 또는 한국인
      const others = uniq(Object.values(homeroomsMap).filter(x => x !== h));
      let sub: Teacher | undefined;
      for (const t of others) { sub = t; break; }
      if (!sub && pools.homeroomKoreanPool.length) sub = pools.homeroomKoreanPool[0];
      if (!sub) {
        warnings.push(`[EXAM ${day}] ${cid} 감독자 부족 (담임 충돌)`);
      }
    }
  }
  // 기록(표시용): 시험은 일괄 표시. period=3에 anchor
  [...classesR1, ...classesR2].forEach(cid => {
    const h = homeroomsMap[cid];
    push({
      classId: cid,
      round: (cid.startsWith("R1") ? 1 : 2),
      period: 3,
      time: EXAM_TIME_TT,
      role: "EXAM",
      teacher: h,
    });
  });

  // --- Round 1: [H,K,F] across periods [1,2,3] ---
  // 위상 분산: 같은 교시에 F 수요 ≤ foreignCap
  for (const [idx, cid] of classesR1.entries()) {
    const ownH = homeroomsMap[cid];
    // role order via phase: base=0 -> (1: H/K/F), base=1 -> (1: K/F/H), base=2 -> (1: F/H/K) 등
    const base = phaseIndex(idx, Math.max(1, foreignCap), 0, 3);
    const roles: Role[] = ["H","K","F"];
    const rotated: Role[] = [roles[base], roles[(base+1)%3], roles[(base+2)%3]];
    const periods: PeriodTT[] = [1,2,3];

    for (let i=0;i<3;i++) {
      const role = rotated[i];
      const p = periods[i];
      let t: Teacher | null = null;
      if (role === "H") t = pickH(ownH, day, p, busy, constraints);
      else if (role === "K") t = pickK(cid, ownH, day, p, pools, homeroomsMap, busy, constraints, ledger, slot.globalOptions);
      else t = pickF(day, p, pools, busy, constraints, ledger);

      if (t) {
        busy.occupy(day, p, t);
        bump(ledger, t, role);
        push({ classId: cid, round: 1, period: p, time: PERIOD_TIMES_TT[p], role, teacher: t });
      } else {
        push({ classId: cid, round: 1, period: p, time: PERIOD_TIMES_TT[p], role, teacher: "(미배정)" });
        warnings.push(`[${day} ${p}] ${cid} R1 ${role} 배정 실패`);
      }
    }
  }

  // --- Round 2: [H,H,K] across periods [4,5,6] (F 금지) ---
  // 분산: K가 특정 교시에 몰리지 않게 phase by korean capacity
  const koreanCap = Math.max(1, pools.homeroomKoreanPool.length);
  for (const [idx, cid] of classesR2.entries()) {
    const ownH = homeroomsMap[cid];
    const base = phaseIndex(idx, koreanCap, 0, 3);
    // base=0 -> [H,H,K], base=1 -> [H,K,H], base=2 -> [K,H,H]
    const order: Role[][] = [
      ["H","H","K"], ["H","K","H"], ["K","H","H"]
    ];
    const rotated: Role[] = order[base];
    const periods: PeriodTT[] = [4,5,6];

    for (let i=0;i<3;i++) {
      const role = rotated[i];
      const p = periods[i];
      let t: Teacher | null = null;
      if (role === "H") t = pickH(ownH, day, p, busy, constraints);
      else if (role === "K") t = pickK(cid, ownH, day, p, pools, homeroomsMap, busy, constraints, ledger, slot.globalOptions);
      else {
        // F forbidden in R2
        warnings.push(`[${day} ${p}] ${cid} R2에서 F 금지 규칙 위반 시도`);
        t = null;
      }

      if (t) {
        busy.occupy(day, p, t);
        bump(ledger, t, role);
        push({ classId: cid, round: 2, period: p, time: PERIOD_TIMES_TT[p], role, teacher: t });
      } else {
        push({ classId: cid, round: 2, period: p, time: PERIOD_TIMES_TT[p], role, teacher: "(미배정)" });
        warnings.push(`[${day} ${p}] ${cid} R2 ${role} 배정 실패`);
      }
    }
  }

  // 정렬(가독성)
  for (const p of Object.keys(byDay[day]) as unknown as PeriodTT[]) {
    byDay[day][p].sort((a,b) => a.classId.localeCompare(b.classId,"ko"));
  }
  for (const cid of Object.keys(byClass)) {
    byClass[cid][day].sort((a,b) => a.period - b.period);
  }
  for (const t of Object.keys(byTeacher)) {
    byTeacher[t][day].sort((a,b) => a.period - b.period);
  }

  return {
    classSummary: byClass,
    teacherSummary: byTeacher,
    dayGrid: byDay,
    warnings,
    feasibility: {
      r1ForeignOk,
      r1ForeignDemand: r1ForeignDemand,
      r1ForeignCapacity: r1ForeignCapacity,
      r2HNeeded,
      r2KNeeded,
    },
  };
}

// Performance optimization: Cache for availability lookups
const ttAvailabilityCache = new Map<string, boolean>();
const ttCandidateCache = new Map<string, string[]>();

// Memoized availability check for TT
function isTTUnavailable(teacher: string, dayPeriod: string, constraints: Record<string, TeacherConstraints>): boolean {
  const cacheKey = `tt-${teacher}-${dayPeriod}`;
  if (ttAvailabilityCache.has(cacheKey)) {
    return ttAvailabilityCache.get(cacheKey)!;
  }
  
  const result = constraints[teacher]?.unavailable?.has(dayPeriod) || false;
  ttAvailabilityCache.set(cacheKey, result);
  return result;
}

// Memoized candidate filtering for TT
function getTTCandidates(role: 'H' | 'K' | 'F', teachers: string[], constraints: Record<string, TeacherConstraints>, dayPeriod: string): string[] {
  const cacheKey = `tt-${role}-${dayPeriod}-${teachers.length}`;
  if (ttCandidateCache.has(cacheKey)) {
    return ttCandidateCache.get(cacheKey)!;
  }
  
  const candidates = teachers.filter(t => !isTTUnavailable(t, dayPeriod, constraints));
  ttCandidateCache.set(cacheKey, candidates);
  return candidates;
}

// Export for potential future use
export { getTTCandidates }

// Clear TT caches when needed
function clearTTCaches() {
  ttAvailabilityCache.clear();
  ttCandidateCache.clear();
}

export function createTTWeeklySchedule(
  slot: TTSchedulerSlot,
  ledger: FairnessLedger,
  days: DayTT[] = ["화","목"]
): TTScheduleResult {
  // Performance: Clear caches at start of generation
  clearTTCaches();
  
  const startTime = performance.now();
  // 두 날을 합산
  const merged: TTScheduleResult = {
    classSummary: {},
    teacherSummary: {},
    dayGrid: { "화":{}, "목":{} } as any,
    warnings: [],
    feasibility: {
      r1ForeignOk: true,
      r1ForeignDemand: 0,
      r1ForeignCapacity: 0,
      r2HNeeded: 0,
      r2KNeeded: 0,
    },
  };

  for (const d of days) {
    const r = createTTScheduleDay(slot, d, ledger);
    // merge class
    for (const [cid, byD] of Object.entries(r.classSummary)) {
      merged.classSummary[cid] ||= {} as any;
      merged.classSummary[cid][d] = byD[d] || [];
    }
    // merge teacher
    for (const [t, byD] of Object.entries(r.teacherSummary)) {
      merged.teacherSummary[t] ||= {} as any;
      merged.teacherSummary[t][d] = byD[d] || [];
    }
    // merge day grid
    merged.dayGrid[d] = r.dayGrid[d] || {};
    // warnings/feasibility
    merged.warnings.push(...r.warnings);
    merged.feasibility.r1ForeignOk &&= r.feasibility.r1ForeignOk;
    merged.feasibility.r1ForeignDemand += r.feasibility.r1ForeignDemand;
    merged.feasibility.r1ForeignCapacity += r.feasibility.r1ForeignCapacity;
    merged.feasibility.r2HNeeded += r.feasibility.r2HNeeded;
    merged.feasibility.r2KNeeded += r.feasibility.r2KNeeded;
  }

  // Performance metrics
  const endTime = performance.now();
  const generationTime = Math.round(endTime - startTime);
  
  // Calculate assignment metrics
  const totalAssignments = Object.values(merged.dayGrid).reduce((sum, day) => 
    sum + Object.values(day).reduce((daySum, period) => daySum + period.length, 0), 0
  );
  const unassignedCount = merged.warnings.filter(w => w.includes('배정 실패')).length;
  const assignedCount = totalAssignments - unassignedCount;

  // Add metrics to result
  (merged as any).metrics = {
    generationTimeMs: generationTime,
    totalAssignments,
    assignedCount,
    unassignedCount,
    warningsCount: merged.warnings.length,
    teachersCount: Object.keys(merged.teacherSummary).length,
    classesCount: Object.keys(merged.classSummary).length
  };

  return merged;
}
