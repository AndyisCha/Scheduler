// src/utils/unifiedGenerator.ts
// Orchestrates MWF (existing engine) + TT (new engine) into a single weekly result.

import type { ScheduleResult as MWFResult, SchedulerSlot as MWFSlot } from "../types/scheduler"; // 기존 MWF 엔진 타입
import { createWeeklySchedule as createMWFWeekly } from "./scheduler";                      // 기존 MWF 엔진 함수
import type {
  TTSchedulerSlot, TTScheduleResult,
  FairnessLedger
} from "./ttScheduler";
import { createTTWeeklySchedule } from "./ttScheduler";

export type UnifiedOptions = {
  includeExams?: boolean; // (엔진 내부는 기본 포함 설계, 필요시 토글용)
  fairnessMode?: "balanced" | "F-priority" | "H-priority";
};

export type UnifiedWeekResult = {
  classSummary: Record<string, Record<"월"|"화"|"수"|"목"|"금", any[]>>;
  teacherSummary: Record<string, Record<"월"|"화"|"수"|"목"|"금", any[]>>;
  dayGrid: Record<"월"|"화"|"수"|"목"|"금", Record<number, any[]>>;
  warnings: string[];
  reports: {
    feasibilityTT: TTScheduleResult["feasibility"];
    fairness: {
      perTeacher: Record<string, { H: number; K: number; F: number; total: number }>;
      deviation: { H: number; K: number; F: number; total: number };
    };
  };
  mwfResult?: MWFResult;
  ttResult?: TTScheduleResult;
};

// 공정성 원장 초기화
function initLedger(): FairnessLedger {
  return {
    totalByTeacher: {},
    byRole: { H:{}, K:{}, F:{} },
  };
}

// MWF 결과를 ledger에 반영 (역할 카운트)
function absorbMWFIntoLedger(ledger: FairnessLedger, mwf: MWFResult) {
  for (const [teacher, days] of Object.entries(mwf.teacherSummary)) {
    for (const d of ["월","수","금"] as const) {
      const dayAssignments = (days as any)[d] || [];
      for (const sess of dayAssignments) {
        const role = sess.role as "H"|"K"|"F" | "EXAM";
        if (role === "EXAM") continue;
        ledger.totalByTeacher[teacher] = (ledger.totalByTeacher[teacher] || 0) + 1;
        ledger.byRole[role][teacher] = (ledger.byRole[role][teacher] || 0) + 1;
      }
    }
  }
}

// TT 결과를 ledger에 반영하는 것은 ttScheduler가 내부에서 bump 하므로 필요 없음.
// 하지만 합치기 전/후 카운트 집계는 리포트에서 계산.

export function generateUnifiedWeek(
  mwfSlot: MWFSlot,
  ttSlot: TTSchedulerSlot,
  _opts: UnifiedOptions = {}
): UnifiedWeekResult {
  const ledger = initLedger();

  // 1) MWF 생성 (월/수/금)
  const mwf = createMWFWeekly({ ...mwfSlot }); // 기존 엔진: 내부에서 자체 카운트만 하므로, ledger에 반영 필요 → absorb
  absorbMWFIntoLedger(ledger, mwf);

  // 2) TT 생성 (화/목) — 공유 ledger로 공정성 이어받음
  const tt = createTTWeeklySchedule(ttSlot, ledger, ["화","목"]);

  // 3) 병합
  const unified: UnifiedWeekResult = {
    classSummary: {},
    teacherSummary: {},
    dayGrid: {
      "월": mwf.dayGrid?.["월"] || {},
      "화": tt.dayGrid?.["화"] || {},
      "수": mwf.dayGrid?.["수"] || {},
      "목": tt.dayGrid?.["목"] || {},
      "금": mwf.dayGrid?.["금"] || {},
    } as any,
    warnings: [],
    reports: {
      feasibilityTT: tt.feasibility,
      fairness: { perTeacher: {}, deviation: { H:0, K:0, F:0, total:0 } }
    }
  };

  // classSummary 병합
  // MWF: mwf.classSummary -> 월/수/금
  for (const [cid, days] of Object.entries(mwf.classSummary)) {
    unified.classSummary[cid] ||= { "월":[], "화":[], "수":[], "목":[], "금":[] } as any;
    unified.classSummary[cid]["월"] = days["월"] || [];
    unified.classSummary[cid]["수"] = days["수"] || [];
    unified.classSummary[cid]["금"] = days["금"] || [];
  }
  // TT: tt.classSummary -> 화/목
  for (const [cid, days] of Object.entries(tt.classSummary)) {
    unified.classSummary[cid] ||= { "월":[], "화":[], "수":[], "목":[], "금":[] } as any;
    unified.classSummary[cid]["화"] = days["화"] || [];
    unified.classSummary[cid]["목"] = days["목"] || [];
  }

  // teacherSummary 병합
  for (const [t, days] of Object.entries(mwf.teacherSummary)) {
    unified.teacherSummary[t] ||= { "월":[], "화":[], "수":[], "목":[], "금":[] } as any;
    unified.teacherSummary[t]["월"] = days["월"] || [];
    unified.teacherSummary[t]["수"] = days["수"] || [];
    unified.teacherSummary[t]["금"] = days["금"] || [];
  }
  for (const [t, days] of Object.entries(tt.teacherSummary)) {
    unified.teacherSummary[t] ||= { "월":[], "화":[], "수":[], "목":[], "금":[] } as any;
    unified.teacherSummary[t]["화"] = days["화"] || [];
    unified.teacherSummary[t]["목"] = days["목"] || [];
  }

  // warnings
  unified.warnings.push(...(mwf.warnings || []));
  unified.warnings.push(...(tt.warnings || []));

  // 4) 공정성 리포트 (주간 H/K/F/total per teacher)
  const per: Record<string, { H:number; K:number; F:number; total:number }> = {};
  const add = (teacher: string, role: "H"|"K"|"F") => {
    per[teacher] ||= { H:0, K:0, F:0, total:0 };
    per[teacher][role]++; per[teacher].total++;
  };
  // from teacherSummary merged
  for (const [t, days] of Object.entries(unified.teacherSummary)) {
    for (const d of ["월","화","수","목","금"] as const) {
      for (const sess of (days[d] || [])) {
        const r = sess.role as "H"|"K"|"F"|"EXAM";
        if (r === "EXAM") continue;
        add(t, r);
      }
    }
  }
  // deviation
  const dev = (k: "H"|"K"|"F"|"total") => {
    const vals = Object.values(per).map(v => v[k]).sort((a,b)=>a-b);
    if (vals.length === 0) return 0;
    return vals[vals.length-1] - vals[0];
  };
  unified.reports.fairness.perTeacher = per;
  unified.reports.fairness.deviation = {
    H: dev("H"), K: dev("K"), F: dev("F"), total: dev("total")
  };

  // Include original results for history service
  unified.mwfResult = mwf;
  unified.ttResult = tt;

  return unified;
}
