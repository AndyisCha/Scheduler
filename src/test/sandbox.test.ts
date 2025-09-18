import { describe, it, expect, beforeEach } from 'vitest';
import { sandboxService } from '../services/sandboxService';

describe('SandboxService', () => {
  beforeEach(() => {
    // Reset seeded data before each test
    sandboxService.resetSeededData();
  });

  it('should generate demo data with correct structure', () => {
    const demoData = sandboxService.generateDemoData();
    
    expect(demoData).toBeDefined();
    expect(demoData.slots).toBeInstanceOf(Array);
    expect(demoData.schedules).toBeInstanceOf(Array);
    
    // Check MWF slot
    const mwfSlot = demoData.slots.find(slot => slot.dayGroup === 'MWF');
    expect(mwfSlot).toBeDefined();
    expect(mwfSlot?.name).toContain('Demo MWF');
    expect(mwfSlot?.teachers.homeroomKoreanPool.length).toBeGreaterThan(0);
    expect(mwfSlot?.teachers.foreignPool.length).toBeGreaterThan(0);
    
    // Check TT slot
    const ttSlot = demoData.slots.find(slot => slot.dayGroup === 'TT');
    expect(ttSlot).toBeDefined();
    expect(ttSlot?.name).toContain('Demo TT');
    expect(ttSlot?.teachers.homeroomKoreanPool.length).toBeGreaterThan(0);
    expect(ttSlot?.teachers.foreignPool.length).toBeGreaterThan(0);
    
    // Check complex slot
    const complexSlot = demoData.slots.find(slot => slot.name.includes('Complex'));
    expect(complexSlot).toBeDefined();
    expect(complexSlot?.teachers.homeroomKoreanPool.length).toBeGreaterThan(5);
    expect(complexSlot?.teachers.foreignPool.length).toBeGreaterThan(5);
  });

  it('should have proper teacher constraints structure', () => {
    const demoData = sandboxService.generateDemoData();
    const mwfSlot = demoData.slots[0];
    
    expect(mwfSlot.teacherConstraints).toBeDefined();
    
    const constraintKeys = Object.keys(mwfSlot.teacherConstraints);
    expect(constraintKeys.length).toBeGreaterThan(0);
    
    // Check constraint structure
    const firstConstraint = mwfSlot.teacherConstraints[constraintKeys[0]];
    expect(firstConstraint).toHaveProperty('teacherName');
    expect(firstConstraint).toHaveProperty('unavailablePeriods');
    expect(firstConstraint).toHaveProperty('homeroomDisabled');
    expect(firstConstraint).toHaveProperty('maxHomerooms');
    
    expect(Array.isArray(firstConstraint.unavailablePeriods)).toBe(true);
    expect(typeof firstConstraint.homeroomDisabled).toBe('boolean');
    expect(typeof firstConstraint.maxHomerooms).toBe('number');
  });

  it('should have proper fixed homerooms structure', () => {
    const demoData = sandboxService.generateDemoData();
    const mwfSlot = demoData.slots[0];
    
    expect(mwfSlot.fixedHomerooms).toBeDefined();
    
    const fixedHomeroomKeys = Object.keys(mwfSlot.fixedHomerooms);
    expect(fixedHomeroomKeys.length).toBeGreaterThan(0);
    
    // Check that class IDs are properly formatted
    fixedHomeroomKeys.forEach(classId => {
      expect(classId).toMatch(/^R\d+C\d+$/);
    });
  });

  it('should have proper global options structure', () => {
    const demoData = sandboxService.generateDemoData();
    const mwfSlot = demoData.slots[0];
    
    expect(mwfSlot.globalOptions).toBeDefined();
    expect(mwfSlot.globalOptions).toHaveProperty('roundClassCounts');
    expect(mwfSlot.globalOptions).toHaveProperty('includeHInK');
    expect(mwfSlot.globalOptions).toHaveProperty('preferOtherHForK');
    expect(mwfSlot.globalOptions).toHaveProperty('disallowOwnHAsK');
    
    expect(typeof mwfSlot.globalOptions.includeHInK).toBe('boolean');
    expect(typeof mwfSlot.globalOptions.preferOtherHForK).toBe('boolean');
    expect(typeof mwfSlot.globalOptions.disallowOwnHAsK).toBe('boolean');
    expect(typeof mwfSlot.globalOptions.roundClassCounts).toBe('object');
  });

  it('should have demo schedule with proper structure', () => {
    const demoData = sandboxService.generateDemoData();
    
    expect(demoData.schedules.length).toBeGreaterThan(0);
    
    const schedule = demoData.schedules[0];
    expect(schedule.name).toContain('Demo');
    expect(schedule.scheduleType).toBe('MWF');
    expect(schedule.data).toBeDefined();
    
    // Check schedule data structure
    expect(schedule.data).toHaveProperty('classSummary');
    expect(schedule.data).toHaveProperty('teacherSummary');
    expect(schedule.data).toHaveProperty('dayGrid');
    expect(schedule.data).toHaveProperty('warnings');
    expect(schedule.data).toHaveProperty('metrics');
    
    // Check metrics structure
    expect(schedule.data.metrics).toHaveProperty('generationTimeMs');
    expect(schedule.data.metrics).toHaveProperty('totalAssignments');
    expect(schedule.data.metrics).toHaveProperty('assignedCount');
    expect(schedule.data.metrics).toHaveProperty('unassignedCount');
    expect(schedule.data.metrics).toHaveProperty('warningsCount');
    expect(schedule.data.metrics).toHaveProperty('teachersCount');
    expect(schedule.data.metrics).toHaveProperty('classesCount');
  });

  it('should track seeded data status correctly', () => {
    const initialStatus = sandboxService.getSeededDataStatus();
    expect(initialStatus.hasSeededData).toBe(false);
    expect(initialStatus.seededSlots).toEqual([]);
    expect(initialStatus.seededSchedules).toEqual([]);
  });
});
