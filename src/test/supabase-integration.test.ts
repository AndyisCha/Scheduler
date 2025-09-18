// Supabase integration tests
import { describe, it, expect, vi } from 'vitest'
// import { slotService } from '../services/db/slotService'
import { unifiedSlotService } from '../services/unifiedSlotService'
import { isSupabaseConfigured } from '../lib/supabase'

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
  supabase: null
}))

describe('Supabase Integration', () => {
  describe('Configuration Detection', () => {
    it('should detect when Supabase is not configured', () => {
      expect(isSupabaseConfigured).toBe(false)
    })
  })

  describe('DB Slot Service', () => {
    it('should throw error when Supabase is not configured', async () => {
      await expect(
        unifiedSlotService.getSlotConfig('test-id', 'user-1', 'ADMIN')
      ).rejects.toThrow('Supabase is not configured')
    })

    it('should throw error when listing slots without Supabase', async () => {
      await expect(
        unifiedSlotService.getSlotsByDayGroup('MWF', 'user-1', 'ADMIN')
      ).rejects.toThrow('Supabase is not configured')
    })

    it('should throw error when saving schedule without Supabase', async () => {
      await expect(
        unifiedSlotService.saveGeneratedSchedule('slot-1', 'MWF', {}, 'batch-1', 'user-1')
      ).rejects.toThrow('Supabase is not configured')
    })
  })

  describe('Unified Slot Service', () => {
    it('should fall back to mock service when Supabase is not configured', async () => {
      // This should not throw and should return mock data
      const slots = await unifiedSlotService.getSlotsByDayGroup('MWF', 'user-1', 'ADMIN')
      expect(Array.isArray(slots)).toBe(true)
    })

    it('should fall back to mock service for getSlotConfig', async () => {
      const slot = await unifiedSlotService.getSlotConfig('mwf-slot-1', 'user-1', 'ADMIN')
      expect(slot).toBeDefined()
      expect(slot.id).toBe('mwf-slot-1')
    })

    it('should fall back to mock service for saveGeneratedSchedule', async () => {
      const result = await unifiedSlotService.saveGeneratedSchedule(
        'slot-1',
        'MWF',
        { warnings: [] },
        'batch-1',
        'user-1'
      )
      expect(result).toBeDefined()
      expect(result.slot_id).toBe('slot-1')
    })
  })

  describe('Service Conversion Helpers', () => {
    it('should convert SlotConfig to SchedulerSlot', () => {
      // TODO: Implement conversion functions
      /* const slotConfig = {
        id: 'test-slot',
        name: 'Test Slot',
        dayGroup: 'MWF' as const,
        slot_data: {
          teachers: {
          homeroomKoreanPool: ['김선생'],
          foreignPool: ['John'],
          constraints: { '김선생': { maxHomerooms: 2 } }
        },
        },
        globalOptions: { roundClassCounts: { 1: 2 }         },
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z'
      }

      // TODO: Implement conversion functions
      // const schedulerSlot = unifiedSlotService.convertToSchedulerSlot(slotConfig)
      
      // TODO: Implement conversion functions
      // expect(schedulerSlot.teachers.homeroomKoreanPool).toEqual(['김선생'])
      // expect(schedulerSlot.teachers.foreignPool).toEqual(['John'])
      // expect(schedulerSlot.globalOptions.roundClassCounts).toEqual({ 1: 2 })
      */
    })

    it('should convert SlotConfig to TTSchedulerSlot', () => {
      // TODO: Implement conversion functions
      /* const slotConfig = {
        id: 'test-slot',
        name: 'Test Slot',
        dayGroup: 'TT' as const,
        slot_data: {
          teachers: {
          homeroomKoreanPool: ['김선생'],
          foreignPool: ['John'],
          constraints: { '김선생': { maxHomerooms: 2 } }
        },
        },
        globalOptions: { roundClassCounts: { 1: 3 }         },
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z'
      }

      // TODO: Implement conversion functions
      // const ttSchedulerSlot = unifiedSlotService.convertToTTSchedulerSlot(slotConfig)
      
      // TODO: Implement conversion functions
      // expect(ttSchedulerSlot.teachers.homeroomKoreanPool).toEqual(['김선생'])
      // expect(ttSchedulerSlot.teachers.foreignPool).toEqual(['John'])
      // expect(ttSchedulerSlot.globalOptions.roundClassCounts).toEqual({ 1: 3 })
      */
    })
  })
})
