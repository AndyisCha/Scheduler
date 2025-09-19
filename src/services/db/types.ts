// Database table row types for Supabase
// Only essential columns needed for the scheduler

export interface DbSlot {
  id: string
  name: string
  description?: string
  day_group?: string
  created_by?: string
  owner_id: string
  created_at: string
  updated_at: string
}

export interface DbSlotTeacher {
  id: string
  slot_id: string
  teacher_name: string
  kind: 'H_K_POOL' | 'FOREIGN'
  created_at: string
}

export interface DbTeacherConstraint {
  id: string
  slot_id: string
  teacher_name: string
  homeroom_disabled: boolean
  max_homerooms: number
  unavailable: string[] // Array of "요일|교시" strings
  created_at: string
  updated_at: string
}

export interface DbFixedHomeroom {
  id: string
  slot_id: string
  teacher_name: string
  class_id: string // e.g., "R1C1", "R2C2"
  created_at: string
}

export interface DbGlobalOption {
  id: string
  slot_id: string
  include_h_in_k: boolean
  prefer_other_h_for_k: boolean
  disallow_own_h_as_k: boolean
  round_class_counts: Record<string, number>
  created_at: string
  updated_at: string
}

export interface DbGeneratedSchedule {
  id: string
  slot_id: string
  created_by: string
  result: any // JSON result from scheduler engine
  warnings: any[] // JSON array of warnings
  created_at: string
}

// Additional types for slot service
export interface SlotConfig {
  id: string
  name: string
  description?: string
  dayGroup: 'MWF' | 'TT'
  teachers: {
    homeroomKoreanPool: string[]
    foreignPool: string[]
  }
  teacherConstraints: Record<string, any>
  fixedHomerooms: Record<string, string>
  globalOptions: any
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface SlotListItem {
  id: string
  name: string
  description?: string
  dayGroup: 'MWF' | 'TT'
  createdAt: string
  updatedAt: string
  createdBy: string
}

export type SlotScope = 'all' | 'mine'

// Helper type for error handling
export interface DbError {
  message: string
  code?: string
  details?: any
}