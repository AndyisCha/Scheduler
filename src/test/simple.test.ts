// Simple test to verify basic functionality
import { describe, it, expect } from 'vitest'
import { ScenarioFactories } from './factories'

describe('Simple Functionality Test', () => {
  it('should create test scenarios without errors', () => {
    const { mwf, tt } = ScenarioFactories.scenarioA()
    
    // Verify scenario A creates valid slots
    expect(mwf.teachers.homeroomKoreanPool).toHaveLength(4)
    expect(mwf.teachers.foreignPool).toHaveLength(1)
    expect(tt.teachers.homeroomKoreanPool).toHaveLength(4)
    expect(tt.teachers.foreignPool).toHaveLength(1)
    expect(tt.globalOptions.roundClassCounts).toEqual({ 1: 3, 2: 3 })
  })

  it('should import and call unified generator', async () => {
    const unifiedModule = await import('../utils/unifiedGenerator')
    
    // Debug what's actually imported
    expect(Object.keys(unifiedModule)).toContain('generateUnifiedWeek')
    expect(typeof unifiedModule.generateUnifiedWeek).toBe('function')
    
    const { mwf, tt } = ScenarioFactories.scenarioA()
    
    const result = unifiedModule.generateUnifiedWeek(mwf, tt, {
      includeExams: true,
      fairnessMode: 'balanced'
    })

    // Basic result validation
    expect(result).toBeDefined()
    expect(result.warnings).toBeDefined()
    expect(result.reports).toBeDefined()
    expect(result.reports.feasibilityTT).toBeDefined()
    expect(result.reports.fairness).toBeDefined()
  })
})
