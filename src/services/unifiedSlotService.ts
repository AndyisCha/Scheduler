// Unified slot service that falls back to mock when Supabase is not configured
import { isSupabaseConfigured } from '../lib/supabase'
import { slotService as dbSlotService } from './db/slotService'
import { slotService as mockSlotService } from './slotService'

// Extended interface for unified slot management
export interface UnifiedSlotConfig {
  id: string
  name: string
  description?: string
  dayGroup: 'MWF' | 'TT'
  createdAt: string
  updatedAt: string
  createdBy: string
  // SlotConfig properties
  teachers: {
    homeroomKoreanPool: string[];
    foreignPool: string[];
  };
  teacherConstraints: Record<string, {
    teacherName: string;
    unavailablePeriods: number[];
    homeroomDisabled: boolean;
    maxHomerooms?: number;
  }>;
  fixedHomerooms: Record<string, string>;
  globalOptions: {
    roundClassCounts: Record<number, number>;
    includeHInK: boolean;
    preferOtherHForK: boolean;
    disallowOwnHAsK: boolean;
  };
}

// Extended interface for slot creation and updates
export interface CreateSlotRequest {
  name: string
  description?: string
  day_group: 'MWF' | 'TT'
  created_by: string
}

export interface UpdateSlotRequest {
  id: string
  name?: string
  description?: string
  slot_data?: any
}


// Generated schedule interface
export interface UnifiedGeneratedSchedule {
  id: string
  slot_id: string
  day_group: 'MWF' | 'TT'
  created_by: string
  created_at: string
  generation_batch_id?: string
  result: any
  warnings: string[]
}

// Unified service that uses Supabase when available, falls back to mock
class UnifiedSlotService {
  async getSlotConfig(slotId: string, userId: string, userRole: 'ADMIN' | 'SUPER_ADMIN'): Promise<UnifiedSlotConfig> {
    if (isSupabaseConfigured()) {
      return await dbSlotService.getSlotConfig(slotId)
    } else {
      // Fall back to mock service
      return await mockSlotService.getSlotConfig(slotId, userId, userRole)
    }
  }

  async getSlotsByDayGroup(dayGroup: 'MWF' | 'TT', userId: string, userRole: 'ADMIN' | 'SUPER_ADMIN'): Promise<UnifiedSlotConfig[]> {
    if (isSupabaseConfigured()) {
      const slotConfigs = await dbSlotService.getSlotsByDayGroup(dayGroup, userId, userRole)
      // Convert SlotConfig to UnifiedSlotConfig
      return slotConfigs.map(slot => ({
        id: slot.id,
        name: slot.name,
        description: slot.description,
        dayGroup: slot.dayGroup,
        createdAt: slot.createdAt,
        updatedAt: slot.updatedAt,
        createdBy: slot.createdBy,
        teachers: slot.teachers,
        teacherConstraints: slot.teacherConstraints,
        fixedHomerooms: slot.fixedHomerooms,
        globalOptions: slot.globalOptions
      }))
    } else {
      // Fall back to mock service
      return await mockSlotService.getSlotsByDayGroup(dayGroup, userId, userRole)
    }
  }

  // Create new slot
  async createSlot(request: CreateSlotRequest): Promise<UnifiedSlotConfig> {
    if (isSupabaseConfigured()) {
      return await dbSlotService.createSlot({
        name: request.name,
        description: request.description || '',
        dayGroup: request.day_group,
        userId: request.created_by
      })
    } else {
      // Mock implementation
      const newSlot: UnifiedSlotConfig = {
        id: `slot-${Date.now()}`,
        name: request.name,
        description: request.description || '',
        dayGroup: request.day_group,
        createdBy: request.created_by,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // SlotConfig properties are directly on UnifiedSlotConfig
        teachers: {
          homeroomKoreanPool: [],
          foreignPool: []
        },
        teacherConstraints: {},
        fixedHomerooms: {},
        globalOptions: {
          includeHInK: true,
          preferOtherHForK: false,
          disallowOwnHAsK: true,
          roundClassCounts: { '1': 3, '2': 3, '3': 3, '4': 3 }
        }
      }
      return newSlot
    }
  }

  // Update slot basic info
  async updateSlot(request: UpdateSlotRequest): Promise<void> {
    if (isSupabaseConfigured()) {
      await dbSlotService.updateSlot(request.id, {
        name: request.name,
        description: request.description
      })
    } else {
      // Mock implementation
      throw new Error('Mock slot update not implemented')
    }
  }

  // Update slot teachers
  async updateSlotTeachers(slotId: string, teachers: { homeroomKoreanPool: string[], foreignPool: string[] }): Promise<void> {
    if (isSupabaseConfigured()) {
      await dbSlotService.updateSlotTeachers(slotId, teachers)
    } else {
      // Mock implementation
      throw new Error('Mock slot teachers update not implemented')
    }
  }

  // Update teacher constraints
  async updateTeacherConstraints(slotId: string, constraints: Record<string, any>): Promise<void> {
    if (isSupabaseConfigured()) {
      await dbSlotService.updateTeacherConstraints(slotId, constraints)
    } else {
      // Mock implementation
      throw new Error('Mock teacher constraints update not implemented')
    }
  }

  // Update fixed homerooms
  async updateFixedHomerooms(slotId: string, fixedHomerooms: Record<string, string>): Promise<void> {
    if (isSupabaseConfigured()) {
      await dbSlotService.updateFixedHomerooms(slotId, fixedHomerooms)
    } else {
      // Mock implementation
      throw new Error('Mock fixed homerooms update not implemented')
    }
  }

  // Update global options
  async updateGlobalOptions(slotId: string, options: any): Promise<void> {
    if (isSupabaseConfigured()) {
      await dbSlotService.updateGlobalOptions(slotId, options)
    } else {
      // Mock implementation
      throw new Error('Mock global options update not implemented')
    }
  }

  // Delete slot
  async deleteSlot(slotId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      await dbSlotService.deleteSlot(slotId)
    } else {
      // Mock implementation
      throw new Error('Mock slot deletion not implemented')
    }
  }


  async saveGeneratedSchedule(
    slotId: string,
    dayGroup: 'MWF' | 'TT',
    result: any,
    generationBatchId: string,
    userId: string
  ): Promise<UnifiedGeneratedSchedule> {
    if (isSupabaseConfigured()) {
      await dbSlotService.saveGenerated(slotId, dayGroup, {
        result,
        warnings: result.warnings || [],
        generationBatchId
      }, userId)
      
      // Return the saved schedule structure
      return {
        id: `generated-${Date.now()}`, // This would be the actual ID from DB
        slot_id: slotId,
        day_group: dayGroup,
        created_by: userId,
        created_at: new Date().toISOString(),
        generation_batch_id: generationBatchId,
        result: result,
        warnings: result.warnings || []
      }
    } else {
      // Fall back to mock service
      const mockSchedule = await mockSlotService.saveGeneratedSchedule(slotId, dayGroup, result, generationBatchId, userId)
      // Convert mock format to unified format
      return {
        id: mockSchedule.id,
        slot_id: slotId,
        day_group: dayGroup,
        created_by: userId,
        created_at: mockSchedule.createdAt,
        generation_batch_id: generationBatchId,
        result: mockSchedule.result,
        warnings: mockSchedule.warnings
      }
    }
  }

  async getGeneratedSchedulesByBatch(batchId: string, userId: string): Promise<UnifiedGeneratedSchedule[]> {
    if (isSupabaseConfigured()) {
      // TODO: Implement getGeneratedSchedulesByBatch in SlotService
      throw new Error('getGeneratedSchedulesByBatch not implemented in Supabase service')
    } else {
      // Fall back to mock service
      const mockSchedules = await mockSlotService.getGeneratedSchedulesByBatch(batchId, userId)
      // Convert mock format to unified format
      return mockSchedules.map(schedule => ({
        id: schedule.id,
        slot_id: schedule.slotId,
        day_group: schedule.dayGroup,
        created_by: (schedule as any).createdBy,
        created_at: schedule.createdAt,
        generation_batch_id: schedule.generationBatchId,
        result: schedule.result,
        warnings: schedule.warnings
      }))
    }
  }

  // Conversion helpers
  // TODO: Implement conversion functions
  // convertToSchedulerSlot = convertToSchedulerSlot
  // convertToTTSchedulerSlot = convertToTTSchedulerSlot
}

export const unifiedSlotService = new UnifiedSlotService()
