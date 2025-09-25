// 성능 최적화 유틸리티 함수들

/**
 * 함수를 디바운스하여 성능을 최적화합니다
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };

    const callNow = immediate && !timeout;

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func(...args);
  };
}

/**
 * 함수를 스로틀하여 성능을 최적화합니다
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * 객체의 깊은 비교를 수행합니다 (React.memo에서 사용)
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;

  if (typeof a !== typeof b) return false;

  if (typeof a !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * 배열의 중복을 제거합니다
 */
export function unique<T>(array: T[], key?: keyof T): T[] {
  if (!key) {
    return [...new Set(array)];
  }

  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 배열을 청크로 나눕니다 (가상화에서 사용)
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * 메모이제이션을 위한 간단한 캐시
 */
export function createMemoCache<T extends (...args: any[]) => any>(
  fn: T,
  maxSize = 100
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    
    // 캐시 크기 제한
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * 비동기 작업의 결과를 캐시합니다
 */
export function createAsyncCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  ttl = 5 * 60 * 1000 // 5분 기본값
): T {
  const cache = new Map<string, { result: any; timestamp: number }>();

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);

    // 캐시된 결과가 있고 TTL이 만료되지 않았다면 반환
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.result;
    }

    const result = await fn(...args);
    cache.set(key, { result, timestamp: Date.now() });
    
    return result;
  }) as T;
}

/**
 * 웹 워커를 사용하여 무거운 계산을 백그라운드에서 수행합니다
 */
export function createWebWorker<T, R>(
  workerScript: string
): (data: T) => Promise<R> {
  const worker = new Worker(
    URL.createObjectURL(new Blob([workerScript], { type: 'application/javascript' }))
  );

  return (data: T): Promise<R> => {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        resolve(event.data);
      };

      const handleError = (error: ErrorEvent) => {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(error);
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      worker.postMessage(data);
    });
  };
}

/**
 * 가상화를 위한 인덱스 계산
 */
export function getVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan = 5
) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return { startIndex, endIndex };
}

/**
 * 성능 측정을 위한 마킹
 */
export function markPerformance(name: string, start = true) {
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${name}-${start ? 'start' : 'end'}`);
    
    if (!start) {
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        // 이미 측정된 경우 무시
      }
    }
  }
}

/**
 * 메모리 사용량 측정 (Chrome DevTools)
 */
export function getMemoryUsage() {
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
