// Test factory helpers for creating MWF and TT scheduler slots
import type { SchedulerSlot } from '../types/scheduler'
import type { TTSchedulerSlot, TeacherConstraints } from '../utils/ttScheduler'

export type TeacherPool = {
  homeroomKorean: string[]
  foreign: string[]
}

export type ConstraintsOverrides = Record<string, Partial<TeacherConstraints>>

export type MWFSlotConfig = {
  teachers?: Partial<TeacherPool>
  constraints?: ConstraintsOverrides
  roundClassCounts?: Record<1|2|3|4, number>
  fixedHomerooms?: Record<string, string>
}

export type TTSlotConfig = {
  teachers?: Partial<TeacherPool>
  constraints?: ConstraintsOverrides
  roundClassCounts?: Record<1|2, number>
  fixedHomerooms?: Record<string, string>
}

// Default teacher pools for testing
const DEFAULT_HOMEROOM_KOREAN = ['김선생', '이선생', '박선생', '최선생']
const DEFAULT_FOREIGN = ['John', 'Sarah', 'Mike']

/**
 * Creates a minimal MWF scheduler slot for testing
 */
export function createMWFSlot(config: MWFSlotConfig = {}): SchedulerSlot {
  const {
    teachers = {},
    constraints = {},
    roundClassCounts = { 1: 2, 2: 2, 3: 2, 4: 2 },
    fixedHomerooms = {}
  } = config

  const homeroomKoreanPool = teachers.homeroomKorean || DEFAULT_HOMEROOM_KOREAN
  const foreignPool = teachers.foreign || DEFAULT_FOREIGN

  // Build constraints with defaults
  const allTeachers = [...homeroomKoreanPool, ...foreignPool]
  const teacherConstraints: Record<string, TeacherConstraints> = {}
  
  for (const teacher of allTeachers) {
    teacherConstraints[teacher] = {
      maxHomerooms: 2,
      ...constraints[teacher]
    }
  }

  return {
    teachers: {
      homeroomKoreanPool,
      foreignPool,
      constraints: teacherConstraints
    },
    globalOptions: {
      includeHInK: true,
      preferOtherHForK: true,
      disallowOwnHAsK: false,
      roundClassCounts
    },
    fixedHomerooms
  }
}

/**
 * Creates a minimal TT scheduler slot for testing
 */
export function createTTSlot(config: TTSlotConfig = {}): TTSchedulerSlot {
  const {
    teachers = {},
    constraints = {},
    roundClassCounts = { 1: 3, 2: 3 },
    fixedHomerooms = {}
  } = config

  const homeroomKoreanPool = teachers.homeroomKorean || DEFAULT_HOMEROOM_KOREAN
  const foreignPool = teachers.foreign || DEFAULT_FOREIGN

  // Build constraints with defaults
  const allTeachers = [...homeroomKoreanPool, ...foreignPool]
  const teacherConstraints: Record<string, TeacherConstraints> = {}
  
  for (const teacher of allTeachers) {
    teacherConstraints[teacher] = {
      maxHomerooms: 2,
      ...constraints[teacher]
    }
  }

  return {
    teachers: {
      homeroomKoreanPool,
      foreignPool,
      constraints: teacherConstraints
    },
    globalOptions: {
      includeHInK: true,
      preferOtherHForK: true,
      disallowOwnHAsK: false,
      roundClassCounts
    },
    fixedHomerooms
  }
}

/**
 * Helper to create unavailability constraints
 */
export function createUnavailableConstraint(day: string, periods: number[]): TeacherConstraints {
  const unavailable = new Set<string>()
  for (const period of periods) {
    unavailable.add(`${day}|${period}`)
  }
  return { unavailable }
}

/**
 * Helper to create max homerooms constraint
 */
export function createMaxHomeroomsConstraint(maxHomerooms: number): TeacherConstraints {
  return { maxHomerooms }
}

/**
 * Helper to create homeroom disabled constraint
 */
export function createHomeroomDisabledConstraint(): TeacherConstraints {
  return { homeroomDisabled: true }
}

/**
 * Scenario-specific factory helpers
 */
export const ScenarioFactories = {
  // Scenario A: F=1, TT.R1 classes=3 (feasible)
  scenarioA: () => ({
    mwf: createMWFSlot({
      teachers: { foreign: ['John'] },
      roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
    }),
    tt: createTTSlot({
      teachers: { foreign: ['John'] },
      roundClassCounts: { 1: 3, 2: 3 }
    })
  }),

  // Scenario B: F=1, TT.R1 classes=4 (infeasible)
  scenarioB: () => ({
    mwf: createMWFSlot({
      teachers: { foreign: ['John'] },
      roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
    }),
    tt: createTTSlot({
      teachers: { foreign: ['John'] },
      roundClassCounts: { 1: 4, 2: 3 } // TT.R1 classes=4 > foreign capacity (1*3=3)
    })
  }),

  // Scenario C: maxHomerooms=1 but same teacher fixed twice
  scenarioC: () => {
    const fixedHomerooms: Record<string, string> = {}
    fixedHomerooms['김선생'] = 'R1C1'
    // Note: This creates a constraint violation - same teacher assigned twice
    // The second assignment will overwrite the first in the object
    
    return {
      mwf: createMWFSlot({
        constraints: { '김선생': createMaxHomeroomsConstraint(1) },
        fixedHomerooms
      }),
      tt: createTTSlot({
        constraints: { '김선생': createMaxHomeroomsConstraint(1) }
      })
    }
  },

  // Scenario D: Heavy unavailability for Korean pool in TT.R2
  scenarioD: () => {
    const constraints: Record<string, TeacherConstraints> = {}
    
    // 김선생 unavailable for TT.R2 periods on both days
    constraints['김선생'] = {
      unavailable: new Set(['화|4', '화|5', '화|6', '목|4', '목|5', '목|6'])
    }
    
    // 이선생 unavailable for TT.R2 periods on both days
    constraints['이선생'] = {
      unavailable: new Set(['화|4', '화|5', '화|6', '목|4', '목|5', '목|6'])
    }
    
    return {
      mwf: createMWFSlot(),
      tt: createTTSlot({
        teachers: { homeroomKorean: ['김선생', '이선생', '박선생'] },
        constraints,
        roundClassCounts: { 1: 3, 2: 3 } // Need 3 K teachers for TT.R2, but only 박선생 available
      })
    }
  },

  // Scenario E: Fairness optimization test
  scenarioE: () => ({
    mwf: createMWFSlot({
      teachers: { homeroomKorean: ['김선생', '이선생', '박선생', '최선생'] },
      roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 }
    }),
    tt: createTTSlot({
      teachers: { homeroomKorean: ['김선생', '이선생', '박선생', '최선생'] },
      roundClassCounts: { 1: 3, 2: 3 }
    })
  }),

  // Scenario G: Unavailable constraint test
  scenarioG: () => ({
    mwf: createMWFSlot(),
    tt: createTTSlot({
      constraints: {
        '김선생': createUnavailableConstraint('화', [1]) // Should never be scheduled at 화|1
      }
    })
  })
}
