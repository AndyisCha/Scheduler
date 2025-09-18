// DB integration tests
import { describe, it, expect, beforeEach } from 'vitest'
import { slotService, convertToSchedulerSlot, convertToTTSchedulerSlot } from '../services/slotService'
import type { SlotConfig } from '../services/slotService'

describe('DB Integration', () => {
  const mockUser = { id: 'user-1', role: 'ADMIN' as const }
  const mockSuperUser = { id: 'admin-1', role: 'SUPER_ADMIN' as const }

  beforeEach(() => {
    // Reset mock data before each test
    slotService['slots'] = [
      {
        id: 'mwf-slot-1',
        name: 'MWF 기본 슬롯',
        dayGroup: 'MWF',
        slot_data: {
        teachers: {
          homeroomKoreanPool: ['김선생', '이선생'],
          foreignPool: ['John'],
          constraints: {
            '김선생': { maxHomerooms: 2 },
            '이선생': { maxHomerooms: 2 },
            'John': {}
          }
        },
        },
        globalOptions: {
          roundClassCounts: { 1: 2, 2: 2 }
        },
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'tt-slot-1',
        name: 'TT 기본 슬롯',
        dayGroup: 'TT',
        slot_data: {
        teachers: {
          homeroomKoreanPool: ['김선생', '이선생'],
          foreignPool: ['John'],
          constraints: {
            '김선생': { maxHomerooms: 2 },
            '이선생': { maxHomerooms: 2 },
            'John': {}
          }
        },
        },
        globalOptions: {
          roundClassCounts: { 1: 3, 2: 3 }
        },
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z'
      }
    ]
    slotService['generatedSchedules'] = []
  })

  it('should load MWF slots for ADMIN user', async () => {
    const slots = await slotService.getSlotsByDayGroup('MWF', mockUser.id, mockUser.role)
    
    expect(slots).toHaveLength(1)
    expect(slots[0].id).toBe('mwf-slot-1')
    expect(slots[0].dayGroup).toBe('MWF')
    expect(slots[0].created_by).toBe('user-1')
  })

  it('should load TT slots for ADMIN user', async () => {
    const slots = await slotService.getSlotsByDayGroup('TT', mockUser.id, mockUser.role)
    
    expect(slots).toHaveLength(1)
    expect(slots[0].id).toBe('tt-slot-1')
    expect(slots[0].dayGroup).toBe('TT')
    expect(slots[0].created_by).toBe('user-1')
  })

  it('should deny access to other user slots for ADMIN', async () => {
    // Add another user's slot
    slotService['slots'].push({
      id: 'mwf-slot-2',
      name: 'Other User Slot',
      dayGroup: 'MWF',
      slot_data: {
        teachers: { homeroomKoreanPool: [], foreignPool: [], constraints: {} }
        },
        globalOptions: { roundClassCounts: {} },
      created_by: 'user-2',
      created_at: '2024-01-01T00:00:00Z'
    })

    const slots = await slotService.getSlotsByDayGroup('MWF', mockUser.id, mockUser.role)
    
    expect(slots).toHaveLength(1)
    expect(slots[0].created_by).toBe('user-1')
  })

  it('should allow SUPER_ADMIN to access all slots', async () => {
    // Add another user's slot
    slotService['slots'].push({
      id: 'mwf-slot-2',
      name: 'Other User Slot',
      dayGroup: 'MWF',
      slot_data: {
        teachers: { homeroomKoreanPool: [], foreignPool: [], constraints: {} }
        },
        globalOptions: { roundClassCounts: {} },
      created_by: 'user-2',
      created_at: '2024-01-01T00:00:00Z'
    })

    const slots = await slotService.getSlotsByDayGroup('MWF', mockSuperUser.id, mockSuperUser.role)
    
    expect(slots).toHaveLength(2)
  })

  it('should get slot config with RLS protection', async () => {
    const slot = await slotService.getSlotConfig('mwf-slot-1', mockUser.id, mockUser.role)
    
    expect(slot.id).toBe('mwf-slot-1')
    expect(slot.name).toBe('MWF 기본 슬롯')
    expect(slot.dayGroup).toBe('MWF')
  })

  it('should deny slot config access for other user', async () => {
    // Add another user's slot
    slotService['slots'].push({
      id: 'mwf-slot-2',
      name: 'Other User Slot',
      dayGroup: 'MWF',
      slot_data: {
        teachers: { homeroomKoreanPool: [], foreignPool: [], constraints: {} }
        },
        globalOptions: { roundClassCounts: {} },
      created_by: 'user-2',
      created_at: '2024-01-01T00:00:00Z'
    })

    await expect(
      slotService.getSlotConfig('mwf-slot-2', mockUser.id, mockUser.role)
    ).rejects.toThrow('Access denied: You can only access your own slots')
  })

  it('should save generated schedule', async () => {
    const mockResult = {
      warnings: ['Test warning'],
      reports: { fairness: { perTeacher: {} } },
      classSummary: {},
      teacherSummary: {},
      dayGrid: {}
    }

    const batchId = 'batch-123'
    const saved = await slotService.saveGeneratedSchedule(
      'mwf-slot-1',
      'MWF',
      mockResult,
      batchId,
      mockUser.id
    )

    expect(saved.slotId).toBe('mwf-slot-1')
    expect(saved.dayGroup).toBe('MWF')
    expect(saved.generationBatchId).toBe(batchId)
    expect(saved.userId).toBe(mockUser.id)
    expect(saved.warnings).toEqual(['Test warning'])
  })

  it('should retrieve generated schedules by batch', async () => {
    const mockResult = { warnings: [], reports: {}, classSummary: {}, teacherSummary: {}, dayGrid: {} }
    const batchId = 'batch-123'

    await slotService.saveGeneratedSchedule('mwf-slot-1', 'MWF', mockResult, batchId, mockUser.id)
    await slotService.saveGeneratedSchedule('tt-slot-1', 'TT', mockResult, batchId, mockUser.id)

    const schedules = await slotService.getGeneratedSchedulesByBatch(batchId, mockUser.id)
    
    expect(schedules).toHaveLength(2)
    expect(schedules[0].generationBatchId).toBe(batchId)
    expect(schedules[1].generationBatchId).toBe(batchId)
  })

  it('should convert SlotConfig to SchedulerSlot', () => {
    const slotConfig: SlotConfig = {
      id: 'test-slot',
      name: 'Test Slot',
      dayGroup: 'MWF',
      slot_data: {
        teachers: {
        homeroomKoreanPool: [{ name: '김선생', kind: 'homeroomKorean' }],
        foreignPool: [{ name: 'John', kind: 'foreign' }]
        },
        teacherConstraints: { '김선생': { unavailable: [], homeroomDisabled: false, maxHomerooms: 2 } },
        fixedHomerooms: {},
        globalOptions: { 
          include_h_in_k: true, 
          prefer_other_h_for_k: false, 
          disallow_own_h_as_k: true, 
          roundClassCounts: { 1: 2 } 
        }
        },
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z'
    }

    const schedulerSlot = convertToSchedulerSlot(slotConfig)
    
    expect(schedulerSlot.teachers.homeroomKoreanPool).toEqual([{ name: '김선생', kind: 'homeroomKorean' }])
    expect(schedulerSlot.teachers.foreignPool).toEqual([{ name: 'John', kind: 'foreign' }])
    expect(schedulerSlot.teachers.constraints).toEqual({ '김선생': { unavailable: [], homeroomDisabled: false, maxHomerooms: 2 } })
    expect(schedulerSlot.globalOptions.roundClassCounts).toEqual({ 1: 2 })
  })

  it('should convert SlotConfig to TTSchedulerSlot', () => {
    const slotConfig: SlotConfig = {
      id: 'test-slot',
      name: 'Test Slot',
      dayGroup: 'TT',
      slot_data: {
        teachers: {
        homeroomKoreanPool: [{ name: '김선생', kind: 'homeroomKorean' }],
        foreignPool: [{ name: 'John', kind: 'foreign' }]
        },
        teacherConstraints: { '김선생': { unavailable: [], homeroomDisabled: false, maxHomerooms: 2 } },
        fixedHomerooms: {},
        globalOptions: { 
          include_h_in_k: true, 
          prefer_other_h_for_k: false, 
          disallow_own_h_as_k: true, 
          roundClassCounts: { 1: 3 } 
        }
        },
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z'
    }

    const ttSchedulerSlot = convertToTTSchedulerSlot(slotConfig)
    
    expect(ttSchedulerSlot.teachers.homeroomKoreanPool).toEqual([{ name: '김선생', kind: 'homeroomKorean' }])
    expect(ttSchedulerSlot.teachers.foreignPool).toEqual([{ name: 'John', kind: 'foreign' }])
    expect(ttSchedulerSlot.globalOptions.roundClassCounts).toEqual({ 1: 3 })
  })
})
