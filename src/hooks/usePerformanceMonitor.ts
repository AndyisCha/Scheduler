import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  componentName: string;
  timestamp: number;
}

interface UsePerformanceMonitorOptions {
  componentName: string;
  enabled?: boolean;
  threshold?: number; // 렌더링 시간 임계값 (ms)
  onSlowRender?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitor({
  componentName,
  enabled = process.env.NODE_ENV === 'development',
  threshold = 16, // 16ms = 60fps 기준
  onSlowRender
}: UsePerformanceMonitorOptions) {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  const startRender = useCallback(() => {
    if (enabled) {
      renderStartTime.current = performance.now();
      renderCount.current += 1;
    }
  }, [enabled]);

  const endRender = useCallback(() => {
    if (enabled && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      const metrics: PerformanceMetrics = {
        renderTime,
        componentName,
        timestamp: Date.now()
      };

      // 느린 렌더링 감지
      if (renderTime > threshold && onSlowRender) {
        onSlowRender(metrics);
      }

      // 개발 환경에서 콘솔에 로그
      if (process.env.NODE_ENV === 'development') {
        const isSlow = renderTime > threshold;
        const logMethod = isSlow ? 'warn' : 'log';
        const emoji = isSlow ? '🐌' : '⚡';
        
        console[logMethod](`${emoji} ${componentName} 렌더링 시간: ${renderTime.toFixed(2)}ms (렌더 #${renderCount.current})`);
        
        if (isSlow) {
          console.warn(`⚠️ 느린 렌더링 감지: ${componentName}이 ${threshold}ms 임계값을 초과했습니다.`);
        }
      }

      renderStartTime.current = 0;
    }
  }, [enabled, componentName, threshold, onSlowRender]);

  // 컴포넌트 마운트 시 렌더링 시작
  useEffect(() => {
    startRender();
    return endRender;
  });

  return {
    startRender,
    endRender,
    renderCount: renderCount.current
  };
}

// 성능 측정을 위한 HOC
export function withPerformanceMonitor<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    
    usePerformanceMonitor({
      componentName: name,
      onSlowRender: (metrics) => {
        // 느린 렌더링 알림
        console.warn(`Slow render detected in ${metrics.componentName}:`, metrics);
        
        // 성능 메트릭스 수집 (실제 앱에서는 분석 서비스로 전송)
        if (typeof window !== 'undefined' && 'performance' in window) {
          // Web Vitals 수집
          try {
            performance.mark(`slow-render-${metrics.componentName}-${metrics.timestamp}`);
          } catch (error) {
            // Performance API를 지원하지 않는 환경에서는 무시
          }
        }
      }
    });

    return <Component {...props} />;
  };

  WrappedComponent.displayName = `withPerformanceMonitor(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// 메모리 사용량 모니터링
export function useMemoryMonitor(componentName: string) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const memoryInfo = (performance as any).memory;
      
      const logMemoryUsage = () => {
        console.log(`🧠 ${componentName} 메모리 사용량:`, {
          used: `${(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      };

      logMemoryUsage();
      
      // 컴포넌트 언마운트 시 메모리 사용량 확인
      return () => {
        setTimeout(logMemoryUsage, 100);
      };
    }
  }, [componentName]);
}
