// src/utils/performanceBenchmark.ts
// Performance benchmarking utilities for the scheduler

import { createWeeklySchedule } from './scheduler'
import type { SchedulerSlot } from '../types/scheduler'

export interface BenchmarkResult {
  testName: string
  averageTimeMs: number
  minTimeMs: number
  maxTimeMs: number
  medianTimeMs: number
  iterations: number
  successRate: number
  averageAssignments: number
  averageWarnings: number
  cacheHitRate: number
}

interface BenchmarkConfig {
  iterations: number
  warmupIterations: number
  targetTimeMs: number
}

const DEFAULT_CONFIG: BenchmarkConfig = {
  iterations: 10,
  warmupIterations: 3,
  targetTimeMs: 1000
}

// Create test slots with different scales
export function createTestSlot(
  teachers: number,
  classes: number
): SchedulerSlot {
  const homeroomTeachers = Array.from({ length: Math.ceil(teachers * 0.6) }, (_, i) => `H${i + 1}`)
  const foreignTeachers = Array.from({ length: Math.ceil(teachers * 0.4) }, (_, i) => `F${i + 1}`)
  
  const roundCounts = {
    1: Math.ceil(classes * 0.4),
    2: Math.ceil(classes * 0.3),
    3: Math.ceil(classes * 0.2),
    4: Math.ceil(classes * 0.1)
  }

  return {
    teachers: {
      homeroomKoreanPool: homeroomTeachers,
      foreignPool: foreignTeachers,
      constraints: {}
    },
    fixedHomerooms: {},
    globalOptions: {
      includeHInK: false,
      preferOtherHForK: false,
      disallowOwnHAsK: false,
      roundClassCounts: roundCounts
    }
  }
}

// Run a single benchmark test
export async function runBenchmark(
  slot: SchedulerSlot,
  config: Partial<BenchmarkConfig> = {}
): Promise<BenchmarkResult> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const times: number[] = []
  const assignments: number[] = []
  const warnings: number[] = []
  const cacheHitRates: number[] = []
  let successfulRuns = 0

  // Warmup runs (not counted)
  for (let i = 0; i < finalConfig.warmupIterations; i++) {
    try {
      createWeeklySchedule(slot)
    } catch (error) {
      console.warn(`Warmup iteration ${i} failed:`, error)
    }
  }

  // Actual benchmark runs
  for (let i = 0; i < finalConfig.iterations; i++) {
    try {
      const startTime = performance.now()
      const result = createWeeklySchedule(slot)
      const endTime = performance.now()
      
      const timeMs = Math.round(endTime - startTime)
      times.push(timeMs)
      assignments.push(result.metrics?.totalAssignments || 0)
      warnings.push(result.metrics?.warningsCount || 0)
      
      const metrics = result.metrics as any
      cacheHitRates.push(metrics.cacheHitRate || 0)
      
      successfulRuns++
    } catch (error) {
      console.error(`Benchmark iteration ${i} failed:`, error)
    }
  }

  if (times.length === 0) {
    throw new Error('All benchmark iterations failed')
  }

  // Calculate statistics
  const sortedTimes = [...times].sort((a, b) => a - b)
  const averageTime = Math.round(times.reduce((sum, time) => sum + time, 0) / times.length)
  const minTime = Math.min(...times)
  const maxTime = Math.max(...times)
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)]

  return {
    testName: `${slot.teachers.homeroomKoreanPool.length + slot.teachers.foreignPool.length}T-${Object.values(slot.globalOptions.roundClassCounts).reduce((sum, count) => sum + count, 0)}C`,
    averageTimeMs: averageTime,
    minTimeMs: minTime,
    maxTimeMs: maxTime,
    medianTimeMs: medianTime,
    iterations: times.length,
    successRate: Math.round((successfulRuns / finalConfig.iterations) * 100),
    averageAssignments: Math.round(assignments.reduce((sum, count) => sum + count, 0) / assignments.length),
    averageWarnings: Math.round(warnings.reduce((sum, count) => sum + count, 0) / warnings.length),
    cacheHitRate: Math.round(cacheHitRates.reduce((sum, rate) => sum + rate, 0) / cacheHitRates.length)
  }
}

// Run comprehensive benchmark suite
export async function runBenchmarkSuite(): Promise<BenchmarkResult[]> {
  const testSlots = [
    // Small scale (should be < 100ms)
    createTestSlot(5, 4),
    createTestSlot(8, 6),
    
    // Medium scale (should be < 500ms)
    createTestSlot(12, 10),
    createTestSlot(15, 12),
    
    // Large scale (should be less than 1000ms)
    createTestSlot(20, 16),
    createTestSlot(25, 20),
    
    // Target scale (4R*6C*20T)
    createTestSlot(20, 24),
  ]

  const results: BenchmarkResult[] = []

  console.log('🚀 Starting performance benchmark suite...')
  console.log(`📊 Running ${testSlots.length} test configurations`)
  console.log(`🔄 ${DEFAULT_CONFIG.iterations} iterations per test`)
  console.log('')

  for (const slot of testSlots) {
    try {
      console.log(`⏱️  Testing: ${slot.teachers.homeroomKoreanPool.length + slot.teachers.foreignPool.length} teachers, ${Object.values(slot.globalOptions.roundClassCounts).reduce((sum, count) => sum + count, 0)} classes`)
      
      const result = await runBenchmark(slot)
      results.push(result)
      
      const performanceStatus = result.averageTimeMs < DEFAULT_CONFIG.targetTimeMs ? '✅' : '⚠️'
      console.log(`${performanceStatus} ${result.testName}: ${result.averageTimeMs}ms avg (${result.successRate}% success)`)
      
    } catch (error) {
      console.error(`❌ Test failed for ${slot.teachers.homeroomKoreanPool.length + slot.teachers.foreignPool.length}T-${Object.values(slot.globalOptions.roundClassCounts).reduce((sum, count) => sum + count, 0)}C:`, error)
    }
  }

  console.log('')
  console.log('📈 Benchmark Summary:')
  console.log('===================')
  
  results.forEach(result => {
    const status = result.averageTimeMs < DEFAULT_CONFIG.targetTimeMs ? '✅' : '⚠️'
    console.log(`${status} ${result.testName}:`)
    console.log(`   Average: ${result.averageTimeMs}ms`)
    console.log(`   Range: ${result.minTimeMs}ms - ${result.maxTimeMs}ms`)
    console.log(`   Success: ${result.successRate}%`)
    console.log(`   Assignments: ${result.averageAssignments}`)
    console.log(`   Warnings: ${result.averageWarnings}`)
    console.log(`   Cache Hit Rate: ${result.cacheHitRate}%`)
    console.log('')
  })

  return results
}

// Quick performance check
export async function quickPerformanceCheck(): Promise<boolean> {
  console.log('🔍 Running quick performance check...')
  
  try {
    const targetSlot = createTestSlot(20, 24)
    const result = await runBenchmark(targetSlot, { iterations: 5, warmupIterations: 1 })
    
    const passed = result.averageTimeMs < DEFAULT_CONFIG.targetTimeMs
    
    console.log(`${passed ? '✅' : '❌'} Quick check result: ${result.averageTimeMs}ms (target: <${DEFAULT_CONFIG.targetTimeMs}ms)`)
    
    return passed
  } catch (error) {
    console.error('❌ Quick performance check failed:', error)
    return false
  }
}

// Performance regression detection
export function detectPerformanceRegression(
  currentResults: BenchmarkResult[],
  baselineResults: BenchmarkResult[]
): { hasRegression: boolean; regressions: Array<{ test: string; current: number; baseline: number; regression: number }> } {
  const regressions: Array<{ test: string; current: number; baseline: number; regression: number }> = []
  
  for (const current of currentResults) {
    const baseline = baselineResults.find(b => b.testName === current.testName)
    if (baseline) {
      const regression = current.averageTimeMs - baseline.averageTimeMs
      const regressionPercent = (regression / baseline.averageTimeMs) * 100
      
      // Consider > 20% slower as regression
      if (regressionPercent > 20) {
        regressions.push({
          test: current.testName,
          current: current.averageTimeMs,
          baseline: baseline.averageTimeMs,
          regression: Math.round(regressionPercent)
        })
      }
    }
  }
  
  return {
    hasRegression: regressions.length > 0,
    regressions
  }
}
