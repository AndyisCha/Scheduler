// Snapshot tests for key outputs: warnings, feasibility, fairness reports
import { describe, it, expect } from 'vitest'
import { generateUnifiedWeek } from '../utils/unifiedGenerator'
import { createTTWeeklySchedule } from '../utils/ttScheduler'
import { ScenarioFactories } from './factories'

describe('Snapshot Tests - Key Outputs', () => {
  
  describe('Scenario A: Optimal case - warnings snapshot', () => {
    it('should produce minimal warnings for feasible scenario', () => {
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'balanced'
      })

      // Snapshot warnings (should be minimal for optimal case)
      expect(result.warnings).toMatchSnapshot('scenario-a-warnings')
    })
  })

  describe('Scenario B: Infeasible case - warnings snapshot', () => {
    it('should produce critical warnings for infeasible scenario', () => {
      const { mwf, tt } = ScenarioFactories.scenarioB()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'F-priority'
      })

      // Snapshot warnings (should include capacity warnings)
      expect(result.warnings).toMatchSnapshot('scenario-b-warnings')
    })
  })

  describe('Scenario D: Korean shortage - warnings snapshot', () => {
    it('should produce Korean teacher shortage warnings', () => {
      const { mwf, tt } = ScenarioFactories.scenarioD()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'H-priority'
      })

      // Snapshot warnings (should include Korean unavailability warnings)
      expect(result.warnings).toMatchSnapshot('scenario-d-warnings')
    })
  })

  describe('TT Feasibility Reports - snapshots', () => {
    it('should produce consistent feasibility reports for scenario A', () => {
      const { tt } = ScenarioFactories.scenarioA()
      
      const ttResult = createTTWeeklySchedule(
        tt, 
        { totalByTeacher: {}, byRole: { H: {}, K: {}, F: {} } }, 
        ['화', '목']
      )

      // Snapshot TT feasibility report
      expect(ttResult.feasibility).toMatchSnapshot('scenario-a-tt-feasibility')
    })

    it('should produce consistent feasibility reports for scenario B', () => {
      const { tt } = ScenarioFactories.scenarioB()
      
      const ttResult = createTTWeeklySchedule(
        tt, 
        { totalByTeacher: {}, byRole: { H: {}, K: {}, F: {} } }, 
        ['화', '목']
      )

      // Snapshot TT feasibility report (should show infeasibility)
      expect(ttResult.feasibility).toMatchSnapshot('scenario-b-tt-feasibility')
    })

    it('should produce consistent feasibility reports for scenario D', () => {
      const { tt } = ScenarioFactories.scenarioD()
      
      const ttResult = createTTWeeklySchedule(
        tt, 
        { totalByTeacher: {}, byRole: { H: {}, K: {}, F: {} } }, 
        ['화', '목']
      )

      // Snapshot TT feasibility report (should show Korean capacity issues)
      expect(ttResult.feasibility).toMatchSnapshot('scenario-d-tt-feasibility')
    })
  })

  describe('Fairness Reports - snapshots', () => {
    it('should produce consistent fairness reports for scenario A', () => {
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'balanced'
      })

      // Snapshot fairness report
      expect(result.reports.fairness).toMatchSnapshot('scenario-a-fairness')
    })

    it('should produce consistent fairness reports for scenario E', () => {
      const { mwf, tt } = ScenarioFactories.scenarioE()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'balanced'
      })

      // Snapshot fairness report (should show good balance)
      expect(result.reports.fairness).toMatchSnapshot('scenario-e-fairness')
    })

    it('should produce consistent fairness reports for F-priority mode', () => {
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'F-priority'
      })

      // Snapshot fairness report (should prioritize foreign assignments)
      expect(result.reports.fairness).toMatchSnapshot('scenario-a-f-priority-fairness')
    })

    it('should produce consistent fairness reports for H-priority mode', () => {
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'H-priority'
      })

      // Snapshot fairness report (should prioritize homeroom assignments)
      expect(result.reports.fairness).toMatchSnapshot('scenario-a-h-priority-fairness')
    })
  })

  describe('Deterministic Output - same inputs produce same outputs', () => {
    it('should produce identical results for multiple runs of scenario A', () => {
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      // Run multiple times to ensure deterministic output
      const results = []
      for (let i = 0; i < 3; i++) {
        const result = generateUnifiedWeek(mwf, tt, {
          includeExams: true,
          fairnessMode: 'balanced'
        })
        results.push(result)
      }

      // All results should be identical
      const firstResult = results[0]
      for (let i = 1; i < results.length; i++) {
        expect(results[i].warnings).toEqual(firstResult.warnings)
        expect(results[i].reports.feasibilityTT).toEqual(firstResult.reports.feasibilityTT)
        expect(results[i].reports.fairness).toEqual(firstResult.reports.fairness)
      }
    })
  })

  describe('Small Fixture Validation', () => {
    it('should use minimal test data for consistent snapshots', () => {
      // Verify our test fixtures are minimal and deterministic
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      // MWF slot should have minimal teacher pool
      expect(mwf.teachers.homeroomKoreanPool).toHaveLength(4)
      expect(mwf.teachers.foreignPool).toHaveLength(1)
      expect(Object.keys(mwf.teachers.constraints)).toHaveLength(5) // 4 Korean + 1 foreign
      
      // TT slot should have minimal configuration
      expect(tt.teachers.homeroomKoreanPool).toHaveLength(4)
      expect(tt.teachers.foreignPool).toHaveLength(1)
      expect(tt.globalOptions.roundClassCounts).toEqual({ 1: 3, 2: 3 })
      
      // Verify no extra complexity
      expect(mwf.fixedHomerooms).toEqual({})
      expect(tt.fixedHomerooms).toEqual({})
    })

    it('should produce compact snapshot data', () => {
      const { mwf, tt } = ScenarioFactories.scenarioA()
      
      const result = generateUnifiedWeek(mwf, tt, {
        includeExams: true,
        fairnessMode: 'balanced'
      })

      // Warnings should be minimal for optimal case
      expect(result.warnings.length).toBeLessThanOrEqual(5)
      
      // Fairness report should be compact
      const teacherCount = Object.keys(result.reports.fairness.perTeacher).length
      expect(teacherCount).toBeLessThanOrEqual(6) // Allow for 4 Korean + 1 foreign + potential extras
      
      // Feasibility should be simple
      expect(typeof result.reports.feasibilityTT.r1ForeignOk).toBe('boolean')
      expect(typeof result.reports.feasibilityTT.r1ForeignDemand).toBe('number')
      expect(typeof result.reports.feasibilityTT.r1ForeignCapacity).toBe('number')
    })
  })
})
