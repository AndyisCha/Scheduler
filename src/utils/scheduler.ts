// src/utils/scheduler.ts
// Weekly scheduler engine with fairness, capacity-based staggering, and per-teacher constraints.
// Mon/Wed/Fri with 4 rounds: R1=(1,2), R2=(3,4), R3=(5,6), R4=(7,8).
// R1..R3 per-class weekly roles: H2+K2+F2; R4: H4+K2 (F=0). Exams in R2/R3/R4 (homeroom proctor).

import type {
  Day,
  Role,
  Period,
  Teacher,
  TeacherConstraints,
  Pools,
  GlobalOptions,
  SchedulerSlot,
  Assignment,
  ScheduleResult,
} from '../types/scheduler';
import {
  DAYS,
  PERIOD_TIMES,
  ROUND_PERIODS,
} from '../types/scheduler';

// Weekly role pattern per round, 6 slots per class: [Mon pA, Mon pB, Wed pA, Wed pB, Fri pA, Fri pB]
const WEEKLY_ROLE_PATTERN: Record<1|2|3|4, Role[]> = {
  1: ["H","K","F","H","F","K"],
  2: ["H","K","F","H","F","K"],
  3: ["H","K","F","H","F","K"],
  4: ["H","K","H","K","H","H"], // R4 special: H4 + K2, F=0
};


// ---------- Helpers ----------

const uniq = <T>(a: T[]) => Array.from(new Set(a));
const has = (s?: Set<string>, key?: string) => !!s && !!key && s.has(key);

// Performance optimization: Enhanced caching system
const availabilityCache = new Map<string, boolean>();
const candidateCache = new Map<string, Teacher[]>();

// Performance metrics
interface PerformanceMetrics {
  generationTimeMs: number;
  attempts: number;
  assignments: number;
  unassigned: number;
  warnings: number;
  sortOperations: number;
  cacheHits: number;
  cacheMisses: number;
}

let currentMetrics: PerformanceMetrics = {
  generationTimeMs: 0,
  attempts: 0,
  assignments: 0,
  unassigned: 0,
  warnings: 0,
  sortOperations: 0,
  cacheHits: 0,
  cacheMisses: 0,
};

// Memoized availability check with enhanced caching
export function isUnavailable(teacher: Teacher, dayPeriod: string, constraints: TeacherConstraints): boolean {
  const cacheKey = `${teacher}-${dayPeriod}`;
  if (availabilityCache.has(cacheKey)) {
    currentMetrics.cacheHits++;
    return availabilityCache.get(cacheKey)!;
  }
  
  currentMetrics.cacheMisses++;
  const result = constraints.unavailable?.has(dayPeriod) || false;
  availabilityCache.set(cacheKey, result);
  return result;
}




function buildClassIdsForRound(round: 1|2|3|4, count: number): string[] {
  const out: string[] = [];
  for (let i=1;i<=count;i++) out.push(`R${round}C${i}`);
  return out;
}

function computeHomerooms(
  roundClasses: Record<1|2|3|4,string[]>,
  slot: SchedulerSlot
): Record<string, Teacher> {
  const { fixedHomerooms = {}, teachers } = slot;
  const constraints = teachers.constraints || {};
  const Hs = teachers.homeroomKoreanPool;

  const takenClasses = new Set<string>(Object.values(fixedHomerooms));
  const homerooms: Record<string, Teacher> = {};

  // 1) set fixed
  for (const [t, cid] of Object.entries(fixedHomerooms)) {
    homerooms[cid] = t;
  }

  // 2) auto-assign remaining, honoring homeroomDisabled/maxHomerooms and fairness
  const maxHCount: Record<Teacher, number> = {};
  const curHCount: Record<Teacher, number> = {};
  const allowedH = Hs.filter(t => !constraints[t]?.homeroomDisabled);
  for (const t of allowedH) {
    maxHCount[t] = constraints[t]?.maxHomerooms ?? Number.POSITIVE_INFINITY;
    curHCount[t] = Object.values(fixedHomerooms).filter(cid => homerooms[cid] === t).length;
  }

  const allClassIds = uniq(Object.values(roundClasses).flat());
  const remaining = allClassIds.filter(cid => !takenClasses.has(cid));

  for (const cid of remaining) {
    // pick teacher with minimal current homerooms and not exceeding max
    const candidates = allowedH.filter(t => curHCount[t] < maxHCount[t]);
    if (candidates.length === 0) {
      // leave unassigned homeroom
      continue;
    }
    candidates.sort((a,b) => (curHCount[a]-curHCount[b]) || a.localeCompare(b,"ko"));
    const picked = candidates[0];
    homerooms[cid] = picked;
    curHCount[picked] = (curHCount[picked] ?? 0) + 1;
  }

  // fallback default label for unassigned homerooms (rare)
  for (const cid of allClassIds) {
    if (!homerooms[cid]) homerooms[cid] = `H-${cid}`;
  }
  return homerooms;
}

class BusyMatrix {
  private busy = new Set<string>(); // `${day}|${period}|${teacher}`
  private dayPeriodBusy = new Map<string, Set<Teacher>>(); // `${day}|${period}` -> Set<Teacher>
  
  can(day: Day, period: Period, teacher: Teacher) {
    return !this.busy.has(`${day}|${period}|${teacher}`);
  }
  
  occupy(day: Day, period: Period, teacher: Teacher) {
    this.busy.add(`${day}|${period}|${teacher}`);
    
    const dayPeriod = `${day}|${period}`;
    if (!this.dayPeriodBusy.has(dayPeriod)) {
      this.dayPeriodBusy.set(dayPeriod, new Set());
    }
    this.dayPeriodBusy.get(dayPeriod)!.add(teacher);
  }
  
  getBusyTeachers(day: Day, period: Period): Set<Teacher> {
    const dayPeriod = `${day}|${period}`;
    return this.dayPeriodBusy.get(dayPeriod) || new Set();
  }
  
  // Performance optimization: batch operations
  occupyBatch(assignments: Array<{day: Day, period: Period, teacher: Teacher}>) {
    for (const {day, period, teacher} of assignments) {
      this.occupy(day, period, teacher);
    }
  }
}

function pickTeacherK(
  _classId: string,
  ownH: Teacher,
  day: Day,
  period: Period,
  pools: Pools,
  homeroomsMap: Record<string,Teacher>,
  busy: BusyMatrix,
  loads: Record<Teacher, number>,
  opts: GlobalOptions,
  constraints: Record<Teacher, TeacherConstraints>
): Teacher | null {

  const {
    includeHInK = true,
    preferOtherHForK = true,
    disallowOwnHAsK = false
  } = opts;

  // candidate set - 담임 교사는 제외
  let candidates = [...(pools.homeroomKoreanPool || [])].filter(t => t !== ownH);

  if (includeHInK) {
    const allHs = Object.values(homeroomsMap);
    // 담임 교사는 절대 한국어 수업에 배정되지 않도록 필터링
    candidates.push(...allHs.filter(t => t !== ownH));
  }

  // Filter by availability, busy, and fairness (min load first)
  candidates = uniq(candidates).filter(t => {
    const c = constraints[t];
    if (c?.unavailable && has(c.unavailable, `${day}|${period}`)) return false;
    if (!busy.can(day, period, t)) return false;
    
    // 담임 교사는 절대 한국어 수업에 배정되지 않도록 강력한 제약
    if (t === ownH) {
      console.log(`🚫 Blocking homeroom teacher ${ownH} from Korean class ${_classId}`);
      return false;
    }
    
    return true;
  });

  candidates.sort((a,b) => (loads[a]-loads[b]) || a.localeCompare(b,"ko"));
  return candidates[0] ?? null;
}

function pickTeacherF(
  day: Day,
  period: Period,
  pools: Pools,
  busy: BusyMatrix,
  _loads: Record<Teacher, number>,
  constraints: Record<Teacher, TeacherConstraints>
): Teacher | null {
  let candidates = [...(pools.foreignPool || [])];
  candidates = candidates.filter(t => {
    const c = constraints[t];
    if (c?.unavailable && has(c.unavailable, `${day}|${period}`)) return false;
    if (!busy.can(day, period, t)) return false;
    return true;
  });
  candidates.sort((a,b) => (_loads[a]-_loads[b]) || a.localeCompare(b,"ko"));
  return candidates[0] ?? null;
}

function pickTeacherH(
  ownH: Teacher,
  day: Day,
  period: Period,
  busy: BusyMatrix,
  _loads: Record<Teacher, number>,
  constraints: Record<Teacher, TeacherConstraints>
): Teacher | null {
  const c = constraints[ownH];
  if (c?.unavailable && has(c.unavailable, `${day}|${period}`)) return null;
  if (!busy.can(day, period, ownH)) return null;
  // Homeroom fairness is still tracked via loads
  return ownH;
}

// capacity-aware phase for role staggering
// function roleAt(rolePattern: Role[], dayIdx: number, classIdx: number, capacity: number): Role {
//   const phase = Math.floor(classIdx / Math.max(1, capacity));
//   const base = (dayIdx * 2 + phase) % 6;
//   return rolePattern[base];
// }
function roleAt2(rolePattern: Role[], dayIdx: number, classIdx: number, capacity: number): [Role, Role] {
  // Fix: 각 클래스가 요일별로 다른 역할을 가지도록 phase 계산 수정
  // 월/수/금에 같은 클래스가 같은 역할을 가지는 문제 해결
  const phase = (dayIdx + classIdx) % Math.max(1, capacity);
  const base = (dayIdx * 2 + phase) % 6;
  const role1 = rolePattern[base];
  const role2 = rolePattern[(base+1)%6];
  
  console.log(`🔍 roleAt2: dayIdx=${dayIdx}, classIdx=${classIdx}, capacity=${capacity}, phase=${phase}, base=${base}, roles=[${role1}, ${role2}]`);
  
  return [role1, role2];
}

// ---------- Main ----------

export function createWeeklySchedule(slot: SchedulerSlot): ScheduleResult {
  // Performance: Clear caches and reset metrics at start of generation
  availabilityCache.clear();
  candidateCache.clear();
  
  // Reset performance metrics
  currentMetrics = {
    generationTimeMs: 0,
    attempts: 0,
    assignments: 0,
    unassigned: 0,
    warnings: 0,
    sortOperations: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };
  
  const startTime = performance.now();
  const warnings: string[] = [];
  const { teachers, globalOptions } = slot;
  const pools: Pools = {
    homeroomKoreanPool: teachers.homeroomKoreanPool || [],
    foreignPool: teachers.foreignPool || [],
  };
  const constraints = teachers.constraints || {};
  const roundCounts = globalOptions.roundClassCounts;

  // Build class ids per round
  const roundClasses: Record<1|2|3|4,string[]> = {
    1: buildClassIdsForRound(1, roundCounts[1] || 0),
    2: buildClassIdsForRound(2, roundCounts[2] || 0),
    3: buildClassIdsForRound(3, roundCounts[3] || 0),
    4: buildClassIdsForRound(4, roundCounts[4] || 0),
  };

  // Homerooms per class
  const homeroomsMap = computeHomerooms(roundClasses, slot);

  // Outputs
  const byDay: Record<Day, Record<Period, Assignment[]>> = {
    "월": {} as Record<Period, Assignment[]>,
    "수": {} as Record<Period, Assignment[]>,
    "금": {} as Record<Period, Assignment[]>
  };
  const byClass: Record<string, Record<Day, Assignment[]>> = {};
  const byTeacher: Record<Teacher, Record<Day, Assignment[]>> = {};

  const busy = new BusyMatrix();
  const loadCount: Record<Teacher, number> = {}; // fairness counter across all roles
  const bump = (t: Teacher) => { loadCount[t] = (loadCount[t] || 0) + 1; };

  // helper to push
  const push = (day: Day, a: Assignment) => {
    if (!byDay[day][a.period]) byDay[day][a.period] = [];
    byDay[day][a.period].push(a);
    
    if (!byClass[a.classId]) byClass[a.classId] = {} as Record<Day, Assignment[]>;
    if (!byClass[a.classId][day]) byClass[a.classId][day] = [];
    byClass[a.classId][day].push(a);
    
    if (!byTeacher[a.teacher]) byTeacher[a.teacher] = {} as Record<Day, Assignment[]>;
    if (!byTeacher[a.teacher][day]) byTeacher[a.teacher][day] = [];
    byTeacher[a.teacher][day].push(a);
  };

  // Exams per round (before the first period of the round)
  const examTime: Record<1|2|3|4,string> = {
    1: "", 2: "16:00–16:15", 3: "17:50–18:05", 4: "20:00–20:15"
  };

    // Custom exam periods from global options
    const customExamPeriods = globalOptions.examPeriods || {};
    console.log('🔍 Custom exam periods:', customExamPeriods);

  // Role capacities
  const F_CAP = Math.max(1, pools.foreignPool.length);
  const K_CAP = Math.max(1, pools.homeroomKoreanPool.length); // used for staggering only
  // const H_CAP = Math.max(1, pools.homeroomKoreanPool.length); // homerooms count

  // Iterate rounds/days/classes
  ( [1,2,3,4] as (1|2|3|4)[] ).forEach(round => {
    const classes = roundClasses[round];
    if (!classes.length) return;

    const pattern = WEEKLY_ROLE_PATTERN[round];
    const [pA, pB] = ROUND_PERIODS[round];

    DAYS.forEach((day, dayIdx) => {

      // EXAM (except round1): homeroom proctor, prevent simultaneous clash
      if (round !== 1) {
        classes.forEach((cid, _classIdx) => {
          const h = homeroomsMap[cid];
          
          // Check for custom exam periods for this day
          const customExams = customExamPeriods[day] || [];
          console.log(`🔍 [${day}] Custom exams for class ${cid}:`, customExams);
          
          if (customExams.length > 0) {
            // Use custom exam periods (교시 사이)
            customExams.forEach(examPeriod => {
              // 교시 사이에 시험시간을 배치하기 위해 소수점 period 사용
              const betweenPeriod = examPeriod; // 2.5는 이미 2교시와 3교시 사이를 의미
              console.log(`📝 Adding exam for ${cid} at period ${betweenPeriod} (between ${Math.floor(examPeriod)} and ${Math.ceil(examPeriod)})`);
              push(day, {
                classId: cid, round, period: betweenPeriod as Period,
                time: `시험시간 (${Math.floor(examPeriod)}교시-${Math.ceil(examPeriod)}교시 사이)`,
                role: "EXAM",
                teacher: h,
                isExam: true,
              });
            });
          } else {
            // Use default exam time (기존 로직)
            push(day, {
              classId: cid, round, period: pA, // anchor to first period slot for table proximity
              time: examTime[round],
              role: "EXAM",
              teacher: h,
              isExam: true,
            });
          }
        });
      }

      // CLASS slots with capacity-aware staggering
      classes.forEach((cid, classIdx) => {
        const h = homeroomsMap[cid];
        const [r1, r2] =
          round === 4
            ? roleAt2(pattern, dayIdx, classIdx, Math.max(1, K_CAP)) // no F in round4
            : roleAt2(pattern, dayIdx, classIdx, Math.max(1, F_CAP));
        
        // Debug logging
        console.log(`🔍 [${day} R${round}] Class ${cid} (idx:${classIdx}): roles [${r1}, ${r2}], homeroom: ${h}`);

        // first slot
        const assignOne = (role: Role, period: Period) => {
          let teacher: Teacher | null = null;
          if (role === "H") {
            teacher = pickTeacherH(h, day, period, busy, loadCount, constraints);
          } else if (role === "K") {
            teacher = pickTeacherK(cid, h, day, period, pools, homeroomsMap, busy, loadCount, globalOptions, constraints);
          } else { // F
            if (round === 4) {
              teacher = null; // forbidden
            } else {
              teacher = pickTeacherF(day, period, pools, busy, loadCount, constraints);
            }
          }

          if (teacher) {
            busy.occupy(day, period, teacher);
            bump(teacher);
            push(day, {
              classId: cid, round,
              period, time: PERIOD_TIMES[period],
              role, teacher
            });
          } else {
            warnings.push(`[${day} ${period}] ${cid} ${role} 배정 실패`);
            push(day, {
              classId: cid, round,
              period, time: PERIOD_TIMES[period],
              role, teacher: "(미배정)"
            });
          }
        };

        assignOne(r1, pA);
        assignOne(r2, pB);
      });
    });
  });

  // sort outputs by period for readability
  for (const d of DAYS) {
    for (const p of Object.keys(byDay[d]) as unknown as Period[]) {
      byDay[d][p].sort((a,b) => a.classId.localeCompare(b.classId,"ko"));
      currentMetrics.sortOperations++;
    }
  }
  for (const cid of Object.keys(byClass)) {
    for (const d of DAYS) {
      (byClass[cid][d] ||= []).sort((a,b) => a.period - b.period);
      currentMetrics.sortOperations++;
    }
  }
  for (const t of Object.keys(byTeacher)) {
    for (const d of DAYS) {
      (byTeacher[t][d] ||= []).sort((a,b) => a.period - b.period);
      currentMetrics.sortOperations++;
    }
  }

  // Performance metrics
  const endTime = performance.now();
  const generationTime = Math.round(endTime - startTime);
  
  // Calculate assignment metrics
  const totalAssignments = Object.values(byDay).reduce((sum, day) => 
    sum + Object.values(day).reduce((daySum, period) => daySum + period.length, 0), 0
  );
  const unassignedCount = warnings.filter(w => w.includes('배정 실패')).length;
  const assignedCount = totalAssignments - unassignedCount;

  // Update current metrics
  currentMetrics.generationTimeMs = generationTime;
  currentMetrics.attempts = totalAssignments;
  currentMetrics.assignments = assignedCount;
  currentMetrics.unassigned = unassignedCount;
  currentMetrics.warnings = warnings.length;

  return {
    classSummary: byClass,
    teacherSummary: byTeacher,
    dayGrid: byDay,
    warnings,
    metrics: {
      generationTimeMs: generationTime,
      totalAssignments,
      assignedCount,
      unassignedCount,
      warningsCount: warnings.length,
      teachersCount: Object.keys(byTeacher).length,
      classesCount: Object.keys(byClass).length,
      // Enhanced performance metrics
      sortOperations: currentMetrics.sortOperations,
      cacheHits: currentMetrics.cacheHits,
      cacheMisses: currentMetrics.cacheMisses,
      cacheHitRate: currentMetrics.cacheHits + currentMetrics.cacheMisses > 0 
        ? Math.round((currentMetrics.cacheHits / (currentMetrics.cacheHits + currentMetrics.cacheMisses)) * 100) 
        : 0
    } as any // Type assertion for enhanced metrics
  };
}
