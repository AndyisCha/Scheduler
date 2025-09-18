import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MWFScheduleResult, TTScheduleResult, ScheduleResult } from '../engine/types';

export type SchedulerTab = 'mwf' | 'tt' | 'unified';

interface SchedulerState {
  // 현재 선택된 탭
  activeTab: SchedulerTab;
  
  // 스케줄 결과 캐시
  mwfResult: MWFScheduleResult | null;
  ttResult: TTScheduleResult | null;
  unifiedResult: ScheduleResult | null;
  
  // 로딩 상태
  isGenerating: boolean;
  generationError: string | null;
  
  // 마지막 생성 시간
  lastGeneratedAt: Date | null;
  
  // Actions
  setActiveTab: (tab: SchedulerTab) => void;
  setMwfResult: (result: MWFScheduleResult | null) => void;
  setTtResult: (result: TTScheduleResult | null) => void;
  setUnifiedResult: (result: ScheduleResult | null) => void;
  setGenerating: (isGenerating: boolean) => void;
  setGenerationError: (error: string | null) => void;
  clearResults: () => void;
  clearError: () => void;
  
  // 통합 결과 생성
  generateUnifiedResult: (mwf: MWFScheduleResult, tt: TTScheduleResult) => ScheduleResult;
}

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set) => ({
      // 초기 상태
      activeTab: 'mwf',
      mwfResult: null,
      ttResult: null,
      unifiedResult: null,
      isGenerating: false,
      generationError: null,
      lastGeneratedAt: null,

      // Actions
      setActiveTab: (tab) => set({ activeTab: tab }),
      
      setMwfResult: (result) => set({ 
        mwfResult: result,
        lastGeneratedAt: new Date()
      }),
      
      setTtResult: (result) => set({ 
        ttResult: result,
        lastGeneratedAt: new Date()
      }),
      
      setUnifiedResult: (result) => set({ 
        unifiedResult: result,
        lastGeneratedAt: new Date()
      }),
      
      setGenerating: (isGenerating) => set({ isGenerating }),
      
      setGenerationError: (error) => set({ generationError: error }),
      
      clearResults: () => set({
        mwfResult: null,
        ttResult: null,
        unifiedResult: null,
        generationError: null,
        lastGeneratedAt: null,
      }),
      
      clearError: () => set({ generationError: null }),

      // 통합 결과 생성
      generateUnifiedResult: (mwf, tt) => {
        // MWF와 TT 결과를 통합하여 ScheduleResult 형태로 변환
        const classSummary: Record<string, Record<string, any[]>> = {};
        const teacherSummary: Record<string, Record<string, any[]>> = {};
        const dayGrid: Record<string, Record<number, any[]>> = {};
        const warnings: string[] = [];

        // MWF 결과 처리
        Object.entries(mwf).forEach(([day, daySchedule]) => {
          if (!dayGrid[day]) dayGrid[day] = {};
          
          Object.entries(daySchedule).forEach(([period, assignment]) => {
            if (assignment) {
              const periodNum = parseInt(period);
              if (!dayGrid[day][periodNum]) dayGrid[day][periodNum] = [];
              
              if (Array.isArray(assignment)) {
                dayGrid[day][periodNum].push(...assignment);
              } else {
                dayGrid[day][periodNum].push(assignment);
              }
            }
          });
        });

        // TT 결과 처리
        Object.entries(tt).forEach(([day, daySchedule]) => {
          if (!dayGrid[day]) dayGrid[day] = {};
          
          Object.entries(daySchedule).forEach(([period, assignment]) => {
            if (period !== 'exam' && assignment) {
              const periodNum = parseInt(period);
              if (!dayGrid[day][periodNum]) dayGrid[day][periodNum] = [];
              
              if (Array.isArray(assignment)) {
                dayGrid[day][periodNum].push(...assignment);
              } else {
                dayGrid[day][periodNum].push(assignment);
              }
            }
          });
        });

        // 교사별 요약 생성
        Object.values(dayGrid).forEach(daySchedule => {
          Object.values(daySchedule).forEach(assignments => {
            assignments.forEach(assignment => {
              if (assignment && assignment.teacher) {
                if (!teacherSummary[assignment.teacher]) {
                  teacherSummary[assignment.teacher] = {};
                }
                
                const day = Object.keys(dayGrid).find(d => 
                  dayGrid[d] && Object.values(dayGrid[d]).some(period => 
                    period.includes(assignment)
                  )
                ) || 'unknown';
                
                if (!teacherSummary[assignment.teacher][day]) {
                  teacherSummary[assignment.teacher][day] = [];
                }
                
                teacherSummary[assignment.teacher][day].push(assignment);
              }
            });
          });
        });

        const unifiedResult: ScheduleResult = {
          classSummary,
          teacherSummary,
          dayGrid,
          warnings,
          metrics: {
            generationTimeMs: 0,
            totalAssignments: Object.values(dayGrid).flatMap(day => 
              Object.values(day).flat()
            ).length,
            assignedCount: 0,
            unassignedCount: 0,
            warningsCount: warnings.length,
            teachersCount: Object.keys(teacherSummary).length,
            classesCount: 0,
          }
        };

        set({ unifiedResult });
        return unifiedResult;
      },
    }),
    {
      name: 'scheduler-store',
      partialize: (state) => ({
        activeTab: state.activeTab,
        // 결과는 캐시하지 않음 (매번 새로 생성)
      }),
    }
  )
);
