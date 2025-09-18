import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SlotConfig, TeacherConstraint, GlobalOptions, FixedHomerooms } from '../engine/types';

interface SlotState {
  // 슬롯 관리
  slots: SlotConfig[];
  activeSlotId: string | null;
  
  // 교사 풀 관리
  homeroomKoreanPool: string[];
  foreignPool: string[];
  
  // 제약조건 관리
  teacherConstraints: Record<string, TeacherConstraint>;
  
  // 고정 담임 관리
  fixedHomerooms: FixedHomerooms;
  
  // 글로벌 옵션
  globalOptions: GlobalOptions;
  
  // Actions
  setSlots: (slots: SlotConfig[]) => void;
  addSlot: (slot: SlotConfig) => void;
  updateSlot: (id: string, updates: Partial<SlotConfig>) => void;
  deleteSlot: (id: string) => void;
  setActiveSlot: (id: string | null) => void;
  
  // 교사 풀 관리
  addTeacherToPool: (pool: 'homeroomKorean' | 'foreign', teacher: string) => void;
  removeTeacherFromPool: (pool: 'homeroomKorean' | 'foreign', teacher: string) => void;
  
  // 제약조건 관리
  updateTeacherConstraint: (teacherName: string, constraint: Partial<TeacherConstraint>) => void;
  removeTeacherConstraint: (teacherName: string) => void;
  
  // 고정 담임 관리
  setFixedHomeroom: (teacherName: string, classId: string) => void;
  removeFixedHomeroom: (teacherName: string) => void;
  
  // 글로벌 옵션 관리
  updateGlobalOptions: (options: Partial<GlobalOptions>) => void;
  
  // 초기화
  reset: () => void;
}

const defaultGlobalOptions: GlobalOptions = {
  roundClassCounts: { 1: 2, 2: 2, 3: 0, 4: 0 },
  includeHInK: false,
  preferOtherHForK: true,
  disallowOwnHAsK: true,
};

export const useSlotStore = create<SlotState>()(
  persist(
    (set) => ({
      // 초기 상태
      slots: [],
      activeSlotId: null,
      homeroomKoreanPool: [],
      foreignPool: [],
      teacherConstraints: {},
      fixedHomerooms: {},
      globalOptions: defaultGlobalOptions,

      // 슬롯 관리
      setSlots: (slots) => set({ slots }),
      
      addSlot: (slot) => set((state) => ({
        slots: [...state.slots, slot],
        activeSlotId: slot.id
      })),
      
      updateSlot: (id, updates) => set((state) => ({
        slots: state.slots.map(slot => 
          slot.id === id ? { ...slot, ...updates } : slot
        )
      })),
      
      deleteSlot: (id) => set((state) => ({
        slots: state.slots.filter(slot => slot.id !== id),
        activeSlotId: state.activeSlotId === id ? null : state.activeSlotId
      })),
      
      setActiveSlot: (id) => set({ activeSlotId: id }),

      // 교사 풀 관리
      addTeacherToPool: (pool, teacher) => set((state) => {
        if (pool === 'homeroomKorean') {
          return {
            homeroomKoreanPool: [...state.homeroomKoreanPool, teacher]
          };
        } else {
          return {
            foreignPool: [...state.foreignPool, teacher]
          };
        }
      }),
      
      removeTeacherFromPool: (pool, teacher) => set((state) => {
        if (pool === 'homeroomKorean') {
          return {
            homeroomKoreanPool: state.homeroomKoreanPool.filter(t => t !== teacher)
          };
        } else {
          return {
            foreignPool: state.foreignPool.filter(t => t !== teacher)
          };
        }
      }),

      // 제약조건 관리
      updateTeacherConstraint: (teacherName, constraint) => set((state) => ({
        teacherConstraints: {
          ...state.teacherConstraints,
          [teacherName]: {
            ...state.teacherConstraints[teacherName],
            teacherName,
            ...constraint
          }
        }
      })),
      
      removeTeacherConstraint: (teacherName) => set((state) => {
        const newConstraints = { ...state.teacherConstraints };
        delete newConstraints[teacherName];
        return { teacherConstraints: newConstraints };
      }),

      // 고정 담임 관리
      setFixedHomeroom: (teacherName, classId) => set((state) => ({
        fixedHomerooms: {
          ...state.fixedHomerooms,
          [teacherName]: classId
        }
      })),
      
      removeFixedHomeroom: (teacherName) => set((state) => {
        const newFixedHomerooms = { ...state.fixedHomerooms };
        delete newFixedHomerooms[teacherName];
        return { fixedHomerooms: newFixedHomerooms };
      }),

      // 글로벌 옵션 관리
      updateGlobalOptions: (options) => set((state) => ({
        globalOptions: { ...state.globalOptions, ...options }
      })),

      // 초기화
      reset: () => set({
        slots: [],
        activeSlotId: null,
        homeroomKoreanPool: [],
        foreignPool: [],
        teacherConstraints: {},
        fixedHomerooms: {},
        globalOptions: defaultGlobalOptions,
      }),
    }),
    {
      name: 'slot-store',
      partialize: (state) => ({
        slots: state.slots,
        activeSlotId: state.activeSlotId,
        homeroomKoreanPool: state.homeroomKoreanPool,
        foreignPool: state.foreignPool,
        teacherConstraints: state.teacherConstraints,
        fixedHomerooms: state.fixedHomerooms,
        globalOptions: state.globalOptions,
      }),
    }
  )
);
