// Slot service for DB operations
import type { SchedulerSlot } from '../types/scheduler'
import type { TTSchedulerSlot } from '../utils/ttScheduler'
import type { UnifiedWeekResult } from '../utils/unifiedGenerator'

export interface SlotConfig {
  id: string
  name: string
  description?: string
  dayGroup: 'MWF' | 'TT'
  created_by: string
  created_at: string
  slot_data: {
    teachers: {
      homeroomKoreanPool: Array<{ name: string; kind: 'homeroomKorean' }>
      foreignPool: Array<{ name: string; kind: 'foreign' }>
    }
    teacherConstraints: Record<string, {
      unavailable: string[]
      homeroomDisabled: boolean
      maxHomerooms?: number
    }>
    fixedHomerooms: Record<string, string>
    globalOptions: {
      include_h_in_k: boolean
      prefer_other_h_for_k: boolean
      disallow_own_h_as_k: boolean
      roundClassCounts: Record<string, number>
    }
  }
}

export interface GeneratedSchedule {
  id: string
  slot_id: string
  day_group: 'MWF' | 'TT'
  created_by: string
  created_at: string
  generation_batch_id?: string
  result: {
    mwf: any
    tt: any
    validation: {
      isValid: boolean
      errors: string[]
      warnings: string[]
      infos: string[]
    }
  }
  warnings: string[]
  algorithm_version?: string
  teacher_consistency_metrics?: any
  round_statistics?: any
  validation_details?: any
}

// Mock DB implementation (replace with actual DB calls)
class MockSlotService {
  private slots: any[] = [
    {
      id: 'mwf-slot-1',
      name: 'MWF 기본 슬롯',
      dayGroup: 'MWF',
      teachers: {
        homeroomKoreanPool: ['김선생', '이선생', '박선생', '최선생'],
        foreignPool: ['John', 'Sarah'],
        constraints: {
          '김선생': { maxHomerooms: 2 },
          '이선생': { maxHomerooms: 2 },
          '박선생': { maxHomerooms: 2 },
          '최선생': { maxHomerooms: 2 },
          'John': {},
          'Sarah': {}
        }
      },
      globalOptions: {
        includeHomeroomsInK: true,
        preferOtherHomeroomsForK: true,
        disallowHomeroomAsKForOwnClass: false,
        roundClassCounts: { 1: 2, 2: 2, 3: 2, 4: 2 }
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      userId: 'user-1'
    },
    {
      id: 'mwf-slot-2',
      name: 'MWF 대형 슬롯',
      dayGroup: 'MWF',
      teachers: {
        homeroomKoreanPool: ['김선생', '이선생', '박선생', '최선생', '정선생', '한선생'],
        foreignPool: ['John', 'Sarah', 'Mike', 'Lisa'],
        constraints: {
          '김선생': { maxHomerooms: 3 },
          '이선생': { maxHomerooms: 3 },
          '박선생': { maxHomerooms: 3 },
          '최선생': { maxHomerooms: 3 },
          '정선생': { maxHomerooms: 3 },
          '한선생': { maxHomerooms: 3 },
          'John': {},
          'Sarah': {},
          'Mike': {},
          'Lisa': {}
        }
      },
      globalOptions: {
        includeHomeroomsInK: true,
        preferOtherHomeroomsForK: true,
        disallowHomeroomAsKForOwnClass: false,
        roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 }
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      userId: 'user-1'
    },
    {
      id: 'tt-slot-1',
      name: 'TT 기본 슬롯',
      dayGroup: 'TT',
      teachers: {
        homeroomKoreanPool: ['김선생', '이선생', '박선생', '최선생'],
        foreignPool: ['John'],
        constraints: {
          '김선생': { maxHomerooms: 2 },
          '이선생': { maxHomerooms: 2 },
          '박선생': { maxHomerooms: 2 },
          '최선생': { maxHomerooms: 2 },
          'John': {}
        }
      },
      globalOptions: {
        includeHomeroomsInK: true,
        preferOtherHomeroomsForK: true,
        disallowHomeroomAsKForOwnClass: false,
        roundClassCounts: { 1: 3, 2: 3 }
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      userId: 'user-1'
    },
    {
      id: 'tt-slot-2',
      name: 'TT 확장 슬롯',
      dayGroup: 'TT',
      teachers: {
        homeroomKoreanPool: ['김선생', '이선생', '박선생', '최선생', '정선생'],
        foreignPool: ['John', 'Sarah'],
        constraints: {
          '김선생': { maxHomerooms: 2 },
          '이선생': { maxHomerooms: 2 },
          '박선생': { maxHomerooms: 2 },
          '최선생': { maxHomerooms: 2 },
          '정선생': { maxHomerooms: 2 },
          'John': {},
          'Sarah': {}
        }
      },
      globalOptions: {
        includeHomeroomsInK: true,
        preferOtherHomeroomsForK: true,
        disallowHomeroomAsKForOwnClass: false,
        roundClassCounts: { 1: 4, 2: 4 }
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      userId: 'user-1'
    }
  ]

  private generatedSchedules: GeneratedSchedule[] = []

  async getSlotConfig(slotId: string, userId: string, userRole: 'ADMIN' | 'SUPER_ADMIN'): Promise<any> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    const slot = this.slots.find(s => s.id === slotId)
    if (!slot) {
      throw new Error(`Slot not found: ${slotId}`)
    }

    // RLS check
    if (userRole === 'ADMIN' && slot.userId !== userId) {
      throw new Error('Access denied: You can only access your own slots')
    }

    return slot
  }

  async getSlotsByDayGroup(dayGroup: 'MWF' | 'TT', userId: string, userRole: 'ADMIN' | 'SUPER_ADMIN'): Promise<any[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50))

    console.log('🔍 Mock getSlotsByDayGroup called with:', {
      dayGroup,
      userId,
      userRole,
      totalSlots: this.slots.length
    });

    let filteredSlots = this.slots.filter(s => s.dayGroup === dayGroup)
    console.log('📦 Slots filtered by dayGroup:', filteredSlots.length, filteredSlots.map(s => ({ id: s.id, name: s.name, userId: s.userId })));

    // RLS check - 임시로 모든 슬롯 표시
    if (userRole === 'ADMIN') {
      const beforeCount = filteredSlots.length;
      // 임시로 RLS 필터링 비활성화 - 모든 슬롯 표시
      // filteredSlots = filteredSlots.filter(s => s.userId === userId)
      console.log('🔒 After RLS filtering (ADMIN) - DISABLED FOR DEBUG:', beforeCount, '->', filteredSlots.length);
    } else {
      console.log('🔓 SUPER_ADMIN - no RLS filtering applied');
    }

    console.log('✅ Returning slots:', filteredSlots.length, filteredSlots.map(s => ({ id: s.id, name: s.name })));
    return filteredSlots
  }

  async deleteSlot(slotId: string): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    console.log('🗑️ Mock deleteSlot called with:', slotId)
    
    const initialLength = this.slots.length
    this.slots = this.slots.filter(slot => slot.id !== slotId)
    
    console.log('✅ Mock slot deleted:', slotId, 'slots:', initialLength, '->', this.slots.length)
  }

  async saveGeneratedSchedule(
    slotId: string,
    dayGroup: 'MWF' | 'TT',
    result: UnifiedWeekResult | any,
    generationBatchId: string,
    userId: string
  ): Promise<GeneratedSchedule> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200))

    const generatedSchedule: GeneratedSchedule = {
      id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      slotId,
      dayGroup,
      result,
      warnings: result.warnings || [],
      reports: result.reports || {},
      generationBatchId,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      userId
    }

    this.generatedSchedules.push(generatedSchedule)
    return generatedSchedule
  }

  async getGeneratedSchedulesByBatch(batchId: string, userId: string): Promise<GeneratedSchedule[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))

    return this.generatedSchedules.filter(gs => 
      gs.generationBatchId === batchId && 
      gs.userId === userId
    )
  }
}

export const slotService = new MockSlotService()

// Convert SlotConfig to SchedulerSlot/TTSchedulerSlot
export function convertToSchedulerSlot(config: any): SchedulerSlot {
  return {
    teachers: {
      homeroomKoreanPool: config.slot_data?.teachers?.homeroomKoreanPool || [],
      foreignPool: config.slot_data?.teachers?.foreignPool || [],
      constraints: config.slot_data?.teacherConstraints || {}
    },
    fixedHomerooms: config.slot_data?.fixedHomerooms || {},
    globalOptions: config.slot_data?.globalOptions || {}
  }
}

export function convertToTTSchedulerSlot(config: any): TTSchedulerSlot {
  return {
    teachers: {
      homeroomKoreanPool: config.slot_data?.teachers?.homeroomKoreanPool || [],
      foreignPool: config.slot_data?.teachers?.foreignPool || [],
      constraints: config.slot_data?.teacherConstraints || {}
    },
    fixedHomerooms: config.slot_data?.fixedHomerooms || {},
    globalOptions: config.slot_data?.globalOptions || {}
  }
}
