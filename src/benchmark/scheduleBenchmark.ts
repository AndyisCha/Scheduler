// Schedule generation benchmark script
import { createWeeklySchedule } from '../utils/scheduler'
import { generateUnifiedWeek } from '../utils/unifiedGenerator'
import type { SchedulerSlot } from '../types/scheduler'

// Generate test data for benchmarking
function generateTestSlot(): SchedulerSlot {
  const teachers = {
    homeroomKoreanPool: Array.from({ length: 15 }, (_, i) => `H${i + 1}`),
    foreignPool: Array.from({ length: 8 }, (_, i) => `F${i + 1}`),
    constraints: {}
  }

  const globalOptions = {
    includeHInK: true,
    preferOtherHForK: false,
    disallowOwnHAsK: true,
    roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 } as Record<1|2|3|4, number>
  }

  return {
    teachers,
    globalOptions,
    fixedHomerooms: {}
  }
}

function generateTestTTSlot(): SchedulerSlot {
  const teachers = {
    homeroomKoreanPool: Array.from({ length: 15 }, (_, i) => `H${i + 1}`),
    foreignPool: Array.from({ length: 8 }, (_, i) => `F${i + 1}`),
    constraints: {}
  }

  const globalOptions = {
    includeHInK: true,
    preferOtherHForK: false,
    disallowOwnHAsK: true,
    roundClassCounts: { 1: 3, 2: 3, 3: 3, 4: 3 } as Record<1|2|3|4, number>
  }

  return {
    teachers,
    globalOptions,
    fixedHomerooms: {}
  }
}

// Benchmark function
async function benchmarkScheduleGeneration(
  name: string,
  generator: () => any,
  iterations: number = 5
): Promise<{ avg: number; p95: number; min: number; max: number }> {
  const times: number[] = []
  
  console.log(`\n🚀 Benchmarking ${name} (${iterations} iterations)...`)
  
  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now()
    await generator()
    const endTime = performance.now()
    const duration = endTime - startTime
    times.push(duration)
    console.log(`  Iteration ${i + 1}: ${duration.toFixed(2)}ms`)
  }
  
  times.sort((a, b) => a - b)
  const avg = times.reduce((sum, time) => sum + time, 0) / times.length
  const p95 = times[Math.ceil(times.length * 0.95) - 1]
  const min = times[0]
  const max = times[times.length - 1]
  
  return { avg, p95, min, max }
}

// Main benchmark runner
async function runScheduleBenchmark() {
  console.log('📊 Schedule Generation Benchmark')
  console.log('=' .repeat(50))
  
  const mwfSlot = generateTestSlot()
  const ttSlot = generateTestTTSlot()
  
  // MWF Benchmark
  const mwfResults = await benchmarkScheduleGeneration(
    'MWF Schedule (4 rounds * 6 classes * 20 teachers)',
    () => createWeeklySchedule(mwfSlot),
    5
  )
  
  // TT Benchmark (using MWF scheduler for now)
  const ttResults = await benchmarkScheduleGeneration(
    'TT Schedule (4 rounds * 6 classes * 20 teachers)',
    () => createWeeklySchedule(ttSlot),
    5
  )
  
  // Unified Benchmark
  const unifiedResults = await benchmarkScheduleGeneration(
    'Unified Schedule (MWF + TT)',
    () => generateUnifiedWeek(mwfSlot, ttSlot, { includeExams: true, fairnessMode: 'balanced' }),
    5
  )
  
  // Results Summary
  console.log('\n📈 Results Summary')
  console.log('=' .repeat(50))
  
  console.log(`\nMWF Schedule:`)
  console.log(`  Average: ${mwfResults.avg.toFixed(2)}ms`)
  console.log(`  95th percentile: ${mwfResults.p95.toFixed(2)}ms`)
  console.log(`  Min: ${mwfResults.min.toFixed(2)}ms`)
  console.log(`  Max: ${mwfResults.max.toFixed(2)}ms`)
  console.log(`  Status: ${mwfResults.avg < 1000 ? '✅ PASS' : '❌ FAIL'} (less than 1000ms target)`)
  
  console.log(`\nTT Schedule:`)
  console.log(`  Average: ${ttResults.avg.toFixed(2)}ms`)
  console.log(`  95th percentile: ${ttResults.p95.toFixed(2)}ms`)
  console.log(`  Min: ${ttResults.min.toFixed(2)}ms`)
  console.log(`  Max: ${ttResults.max.toFixed(2)}ms`)
  console.log(`  Status: ${ttResults.avg < 1000 ? '✅ PASS' : '❌ FAIL'} (less than 1000ms target)`)
  
  console.log(`\nUnified Schedule:`)
  console.log(`  Average: ${unifiedResults.avg.toFixed(2)}ms`)
  console.log(`  95th percentile: ${unifiedResults.p95.toFixed(2)}ms`)
  console.log(`  Min: ${unifiedResults.min.toFixed(2)}ms`)
  console.log(`  Max: ${unifiedResults.max.toFixed(2)}ms`)
  console.log(`  Status: ${unifiedResults.avg < 1000 ? '✅ PASS' : '❌ FAIL'} (less than 1000ms target)`)
  
  // Overall Status
  const allPassed = mwfResults.avg < 1000 && ttResults.avg < 1000 && unifiedResults.avg < 1000
  console.log(`\n🎯 Overall Status: ${allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`)
  
  if (allPassed) {
    console.log('🎉 Performance targets met! All schedules generate in under 1 second.')
  } else {
    console.log('⚠️  Some schedules exceed 1 second. Consider further optimizations.')
  }
  
  return {
    mwf: mwfResults,
    tt: ttResults,
    unified: unifiedResults,
    allPassed
  }
}

// Memory usage monitoring
export function measureMemoryUsage() {
  if ('memory' in performance) {
    const memory = (performance as any).memory
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    }
  }
  return null
}

// Run benchmark if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScheduleBenchmark().catch(console.error)
}
