// Debug test to check imports
import { describe, it, expect } from 'vitest'

describe('Debug Import Test', () => {
  it('should be able to import functions', async () => {
    // Try dynamic import to see the actual error
    try {
      const unifiedModule = await import('../utils/unifiedGenerator')
      console.log('Unified module:', Object.keys(unifiedModule))
      
      const ttModule = await import('../utils/ttScheduler')
      console.log('TT module:', Object.keys(ttModule))
      
      const schedulerModule = await import('../utils/scheduler')
      console.log('Scheduler module:', Object.keys(schedulerModule))
      
      expect(true).toBe(true)
    } catch (error) {
      console.error('Import error:', error)
      throw error
    }
  })
})


