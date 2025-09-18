import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type SchedulerType = 'MWF' | 'TT' | 'UNIFIED';

interface SchedulerState {
  schedulerType: SchedulerType;
  setSchedulerType: (type: SchedulerType) => void;
  
  // TT specific settings
  ttRound1Count: number;
  ttRound2Count: number;
  setTtRoundCounts: (round1: number, round2: number) => void;
  
  // MWF specific settings
  mwfRoundCounts: { [key: number]: number };
  setMwfRoundCounts: (counts: { [key: number]: number }) => void;
  
  // Unified settings
  includeExams: boolean;
  setIncludeExams: (include: boolean) => void;
  
  // Reset to defaults
  reset: () => void;
}

const defaultState = {
  schedulerType: 'MWF' as SchedulerType,
  ttRound1Count: 2,
  ttRound2Count: 2,
  mwfRoundCounts: {
    1: 2,
    2: 2,
    3: 2,
    4: 2
  },
  includeExams: true
};

export const useSchedulerStore = create<SchedulerState>()(
  persist(
    (set) => ({
      ...defaultState,
      
      setSchedulerType: (type: SchedulerType) => {
        set({ schedulerType: type });
      },
      
      setTtRoundCounts: (round1: number, round2: number) => {
        set({ 
          ttRound1Count: round1,
          ttRound2Count: round2
        });
      },
      
      setMwfRoundCounts: (counts: { [key: number]: number }) => {
        set({ mwfRoundCounts: counts });
      },
      
      setIncludeExams: (include: boolean) => {
        set({ includeExams: include });
      },
      
      reset: () => {
        set(defaultState);
      }
    }),
    {
      name: 'scheduler-settings',
      version: 1
    }
  )
);

// Selector hooks for better performance
export const useSchedulerType = () => useSchedulerStore(state => state.schedulerType);
export const useTtSettings = () => useSchedulerStore(state => ({
  round1Count: state.ttRound1Count,
  round2Count: state.ttRound2Count,
  setRoundCounts: state.setTtRoundCounts
}));
export const useMwfSettings = () => useSchedulerStore(state => ({
  roundCounts: state.mwfRoundCounts,
  setRoundCounts: state.setMwfRoundCounts
}));
export const useUnifiedSettings = () => useSchedulerStore(state => ({
  includeExams: state.includeExams,
  setIncludeExams: state.setIncludeExams
}));


