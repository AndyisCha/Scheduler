// 성능 테스트 유틸리티

interface PerformanceTestConfig {
  name: string;
  iterations: number;
  warmup?: number;
  timeout?: number;
}

interface PerformanceTestResult {
  name: string;
  averageTime: number;
  minTime: number;
  maxTime: number;
  medianTime: number;
  iterations: number;
  passed: boolean;
  threshold?: number;
}

/**
 * 함수의 성능을 측정합니다
 */
export async function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  args: Parameters<T>,
  config: PerformanceTestConfig
): Promise<PerformanceTestResult> {
  const { name, iterations, warmup = 3, timeout = 5000 } = config;
  
  // 워밍업 실행
  for (let i = 0; i < warmup; i++) {
    try {
      await fn(...args);
    } catch (error) {
      // 워밍업 중 에러는 무시
    }
  }

  const times: number[] = [];
  let error: Error | null = null;

  const startTime = Date.now();

  for (let i = 0; i < iterations; i++) {
    // 타임아웃 체크
    if (Date.now() - startTime > timeout) {
      error = new Error(`Performance test "${name}" timed out after ${timeout}ms`);
      break;
    }

    const iterationStart = performance.now();
    try {
      await fn(...args);
      const iterationEnd = performance.now();
      times.push(iterationEnd - iterationStart);
    } catch (err) {
      error = err as Error;
      break;
    }
  }

  if (error) {
    throw error;
  }

  // 통계 계산
  const sortedTimes = [...times].sort((a, b) => a - b);
  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = sortedTimes[0];
  const maxTime = sortedTimes[sortedTimes.length - 1];
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

  return {
    name,
    averageTime,
    minTime,
    maxTime,
    medianTime,
    iterations: times.length,
    passed: true
  };
}

/**
 * 여러 성능 테스트를 실행합니다
 */
export async function runPerformanceTests(
  tests: Array<{
    name: string;
    fn: () => Promise<void> | void;
    config: PerformanceTestConfig;
  }>
): Promise<PerformanceTestResult[]> {
  const results: PerformanceTestResult[] = [];

  for (const test of tests) {
    try {
      console.log(`🧪 Running performance test: ${test.name}`);
      const result = await measurePerformance(test.fn, [], test.config);
      results.push(result);
      
      console.log(`✅ ${test.name}: ${result.averageTime.toFixed(2)}ms (avg)`);
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
      results.push({
        name: test.name,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        medianTime: 0,
        iterations: 0,
        passed: false
      });
    }
  }

  return results;
}

/**
 * React 컴포넌트 렌더링 성능을 측정합니다
 */
export function measureComponentRender(
  componentName: string,
  renderFn: () => void,
  iterations = 100
): PerformanceTestResult {
  const times: number[] = [];

  // 워밍업
  for (let i = 0; i < 3; i++) {
    renderFn();
  }

  // 측정
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    renderFn();
    const end = performance.now();
    times.push(end - start);
  }

  const sortedTimes = [...times].sort((a, b) => a - b);
  const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
  const minTime = sortedTimes[0];
  const maxTime = sortedTimes[sortedTimes.length - 1];
  const medianTime = sortedTimes[Math.floor(sortedTimes.length / 2)];

  return {
    name: `${componentName} render`,
    averageTime,
    minTime,
    maxTime,
    medianTime,
    iterations,
    passed: true,
    threshold: 16 // 60fps 기준
  };
}

/**
 * 메모리 사용량을 측정합니다
 */
export function measureMemoryUsage(): {
  used: number;
  total: number;
  limit: number;
} | null {
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    return {
      used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }
  return null;
}

/**
 * 성능 테스트 결과를 보고서 형태로 출력합니다
 */
export function generatePerformanceReport(results: PerformanceTestResult[]): string {
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);
  
  let report = `
# 성능 테스트 보고서

## 요약
- 총 테스트: ${results.length}개
- 성공: ${passed.length}개
- 실패: ${failed.length}개

## 상세 결과
`;

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const threshold = result.threshold ? ` (임계값: ${result.threshold}ms)` : '';
    
    report += `
### ${status} ${result.name}
- 평균 시간: ${result.averageTime.toFixed(2)}ms${threshold}
- 최소 시간: ${result.minTime.toFixed(2)}ms
- 최대 시간: ${result.maxTime.toFixed(2)}ms
- 중간값: ${result.medianTime.toFixed(2)}ms
- 반복 횟수: ${result.iterations}회
`;
  });

  return report;
}

/**
 * 성능 기준점을 설정하고 비교합니다
 */
export class PerformanceBenchmark {
  private benchmarks = new Map<string, PerformanceTestResult>();

  setBenchmark(name: string, result: PerformanceTestResult) {
    this.benchmarks.set(name, result);
  }

  compare(name: string, currentResult: PerformanceTestResult): {
    improved: boolean;
    regression: boolean;
    percentageChange: number;
  } {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) {
      throw new Error(`Benchmark not found for ${name}`);
    }

    const percentageChange = ((currentResult.averageTime - benchmark.averageTime) / benchmark.averageTime) * 100;
    const improved = percentageChange < -5; // 5% 이상 개선
    const regression = percentageChange > 10; // 10% 이상 성능 저하

    return {
      improved,
      regression,
      percentageChange
    };
  }

  getAllBenchmarks() {
    return Array.from(this.benchmarks.entries()).map(([name, result]) => ({ name, ...result }));
  }
}
