import { sentryService } from '../lib/sentry';
import { supabase } from '../lib/supabase';

export interface EngineMetrics {
  generationTimeMs: number;
  totalAssignments: number;
  assignedCount: number;
  unassignedCount: number;
  warningsCount: number;
  teachersCount: number;
  classesCount: number;
  slotId: string;
  scheduleType: 'MWF' | 'TT';
  engineVersion?: string;
  timestamp: string;
  userId: string;
  userRole: string;
}

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  context?: Record<string, any>;
}

class MetricsService {
  private performanceMetrics: PerformanceMetrics[] = [];

  /**
   * Record engine performance metrics
   */
  async recordEngineMetrics(metrics: EngineMetrics): Promise<void> {
    try {
      // Send to Sentry for monitoring
      if (sentryService.initialized) {
        sentryService.addBreadcrumb(
          `Engine metrics recorded: ${metrics.scheduleType} schedule generated`,
          'performance',
          {
            generationTime: metrics.generationTimeMs,
            assignments: metrics.assignedCount,
            warnings: metrics.warningsCount,
            teachers: metrics.teachersCount,
            classes: metrics.classesCount,
          }
        );

        // Set performance tags
        sentryService.setTag('scheduleType', metrics.scheduleType);
        sentryService.setTag('engineVersion', metrics.engineVersion || '1.0.0');
        
        // Log slow generations
        if (metrics.generationTimeMs > 5000) {
          sentryService.captureMessage(
            `Slow schedule generation: ${metrics.generationTimeMs}ms for ${metrics.scheduleType}`,
            'warning',
            {
              generationTime: metrics.generationTimeMs,
              scheduleType: metrics.scheduleType,
              assignments: metrics.assignedCount,
            }
          );
        }
      }

      // Store in database for historical analysis
      await this.storeMetricsInDatabase(metrics);

      console.log('Engine metrics recorded:', metrics);
    } catch (error) {
      console.error('Failed to record engine metrics:', error);
      sentryService.captureException(error as Error, { metrics });
    }
  }

  /**
   * Store metrics in database
   */
  private async storeMetricsInDatabase(metrics: EngineMetrics): Promise<void> {
    try {
      // 임시로 메트릭스 저장을 비활성화 (generated_schedules 테이블에 metrics 컬럼이 없음)
      console.log('📊 Metrics storage temporarily disabled - metrics column not found in generated_schedules table');
      console.log('📊 Would store metrics:', {
        generation_time_ms: metrics.generationTimeMs,
        total_assignments: metrics.totalAssignments,
        assigned_count: metrics.assignedCount,
        unassigned_count: metrics.unassignedCount,
        warnings_count: metrics.warningsCount,
        teachers_count: metrics.teachersCount,
        classes_count: metrics.classesCount,
        engine_version: metrics.engineVersion,
        recorded_at: metrics.timestamp,
        user_id: metrics.userId,
        user_role: metrics.userRole,
      });
      
      // TODO: 데이터베이스 스키마에 metrics 컬럼 추가 후 활성화
      /*
      const { error } = await supabase
        .from('generated_schedules')
        .update({
          metrics: {
            generation_time_ms: metrics.generationTimeMs,
            total_assignments: metrics.totalAssignments,
            assigned_count: metrics.assignedCount,
            unassigned_count: metrics.unassignedCount,
            warnings_count: metrics.warningsCount,
            teachers_count: metrics.teachersCount,
            classes_count: metrics.classesCount,
            engine_version: metrics.engineVersion,
            recorded_at: metrics.timestamp,
            user_id: metrics.userId,
            user_role: metrics.userRole,
          }
        })
        .eq('slot_id', metrics.slotId)
        .eq('schedule_type', metrics.scheduleType)
        .eq('created_by', metrics.userId);

      if (error) {
        throw new Error(`Failed to store metrics: ${error.message}`);
      }
      */
    } catch (error) {
      console.error('Database metrics storage failed:', error);
      sentryService.captureException(error as Error, { 
        operation: 'storeMetricsInDatabase',
        metrics 
      });
    }
  }

  /**
   * Record performance metrics for operations
   */
  recordPerformance(operation: string, duration: number, success: boolean, error?: string, context?: Record<string, any>): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      success,
      error,
      context,
    };

    this.performanceMetrics.push(metric);

    // Keep only last 100 metrics in memory
    if (this.performanceMetrics.length > 100) {
      this.performanceMetrics = this.performanceMetrics.slice(-100);
    }

    // Log to Sentry for slow operations
    if (duration > 2000) { // 2 seconds
      sentryService.captureMessage(
        `Slow operation: ${operation} took ${duration}ms`,
        'warning',
        {
          operation,
          duration,
          success,
          error,
          context,
        }
      );
    }

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`Performance: ${operation} - ${duration}ms (${success ? 'success' : 'failed'})`);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics[] {
    return [...this.performanceMetrics];
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageDuration: number;
    slowestOperation?: PerformanceMetrics;
  } {
    const metrics = this.performanceMetrics;
    const total = metrics.length;
    const successful = metrics.filter(m => m.success).length;
    const failed = total - successful;
    const averageDuration = total > 0 ? metrics.reduce((sum, m) => sum + m.duration, 0) / total : 0;
    const slowestOperation = metrics.reduce((slowest, current) => 
      current.duration > slowest.duration ? current : slowest, 
      metrics[0]
    );

    return {
      totalOperations: total,
      successfulOperations: successful,
      failedOperations: failed,
      averageDuration: Math.round(averageDuration),
      slowestOperation,
    };
  }

  /**
   * Clear performance metrics
   */
  clearPerformanceMetrics(): void {
    this.performanceMetrics = [];
  }

  /**
   * Create a performance timer
   */
  createTimer(operation: string): PerformanceTimer {
    return new PerformanceTimer(operation, this);
  }

  /**
   * Get engine performance statistics from database
   */
  async getEnginePerformanceStats(slotId?: string, days: number = 30): Promise<{
    averageGenerationTime: number;
    totalGenerations: number;
    successRate: number;
    warningsRate: number;
    recentMetrics: EngineMetrics[];
  }> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - days);

      let query = supabase
        .from('generated_schedules')
        .select('metrics, created_at, schedule_type')
        .gte('created_at', since.toISOString());

      if (slotId) {
        query = query.eq('slot_id', slotId);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch performance stats: ${error.message}`);
      }

      const metrics = data?.map(row => ({
        ...row.metrics,
        scheduleType: row.schedule_type,
        timestamp: row.created_at,
      })).filter(m => m.generation_time_ms) as EngineMetrics[];

      const averageGenerationTime = metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.generationTimeMs, 0) / metrics.length 
        : 0;

      const totalGenerations = metrics.length;
      const successfulGenerations = metrics.filter(m => m.assignedCount > 0).length;
      const successRate = totalGenerations > 0 ? (successfulGenerations / totalGenerations) * 100 : 0;
      
      const totalWarnings = metrics.reduce((sum, m) => sum + m.warningsCount, 0);
      const warningsRate = totalGenerations > 0 ? (totalWarnings / totalGenerations) : 0;

      return {
        averageGenerationTime: Math.round(averageGenerationTime),
        totalGenerations,
        successRate: Math.round(successRate * 100) / 100,
        warningsRate: Math.round(warningsRate * 100) / 100,
        recentMetrics: metrics.slice(-10), // Last 10 metrics
      };
    } catch (error) {
      console.error('Failed to get engine performance stats:', error);
      sentryService.captureException(error as Error, { 
        operation: 'getEnginePerformanceStats',
        slotId,
        days 
      });
      
      return {
        averageGenerationTime: 0,
        totalGenerations: 0,
        successRate: 0,
        warningsRate: 0,
        recentMetrics: [],
      };
    }
  }
}

/**
 * Performance timer utility
 */
class PerformanceTimer {
  private startTime: number;
  private operation: string;
  private metricsService: MetricsService;
  private context?: Record<string, any>;

  constructor(operation: string, metricsService: MetricsService, context?: Record<string, any>) {
    this.operation = operation;
    this.metricsService = metricsService;
    this.context = context;
    this.startTime = performance.now();
  }

  /**
   * End the timer and record the metric
   */
  end(success: boolean = true, error?: string): number {
    const duration = Math.round(performance.now() - this.startTime);
    this.metricsService.recordPerformance(this.operation, duration, success, error, this.context);
    return duration;
  }
}

export const metricsService = new MetricsService();
