// 성능 관련 타입 정의

export interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
  memoryUsage?: {
    used: number;
    total: number;
    limit: number;
  };
}

export interface VirtualizationConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  threshold?: number;
}

export interface LazyLoadingConfig {
  delay?: number;
  fallback?: React.ReactNode;
  threshold?: number;
}

export interface CacheConfig {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
}

export interface DebounceConfig {
  wait: number;
  immediate?: boolean;
}

export interface ThrottleConfig {
  limit: number; // milliseconds
}

// 성능 모니터링 옵션
export interface PerformanceMonitorOptions {
  enabled?: boolean;
  threshold?: number;
  onSlowRender?: (metrics: PerformanceMetrics) => void;
  onMemoryLeak?: (usage: PerformanceMetrics['memoryUsage']) => void;
}

// 가상화 관련 타입
export interface VirtualizedItem {
  index: number;
  data: any;
  height?: number;
}

export interface VirtualizedRange {
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

// 캐시 관련 타입
export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
}

export interface CacheStats {
  size: number;
  hitRate: number;
  missRate: number;
  totalAccesses: number;
}

// 웹 워커 관련 타입
export interface WorkerMessage<T = any> {
  type: string;
  data: T;
  id?: string;
}

export interface WorkerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  id?: string;
}

// 성능 프로파일링 타입
export interface PerformanceProfile {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  minRenderTime: number;
  slowRenderCount: number;
  memoryUsage?: {
    average: number;
    max: number;
    min: number;
  };
}

// 번들 분석 타입
export interface BundleAnalysis {
  totalSize: number;
  chunkSizes: Record<string, number>;
  duplicateModules: string[];
  unusedModules: string[];
  largestModules: Array<{
    name: string;
    size: number;
    percentage: number;
  }>;
}
