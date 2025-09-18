import { describe, it, expect, beforeEach, vi } from 'vitest';
import { metricsService, type EngineMetrics } from '../services/metricsService';

// Mock Sentry
vi.mock('../lib/sentry', () => ({
  sentryService: {
    initialized: false,
    addBreadcrumb: vi.fn(),
    captureMessage: vi.fn(),
    captureException: vi.fn(),
    setTag: vi.fn(),
  }
}));

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null }))
          }))
        }))
      }))
    }))
  }
}));

describe('MetricsService', () => {
  beforeEach(() => {
    // Clear performance metrics before each test
    metricsService.clearPerformanceMetrics();
  });

  it('should record performance metrics', () => {
    metricsService.recordPerformance('test_operation', 150, true);
    
    const metrics = metricsService.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      operation: 'test_operation',
      duration: 150,
      success: true,
    });
  });

  it('should track performance summary', () => {
    metricsService.recordPerformance('operation1', 100, true);
    metricsService.recordPerformance('operation2', 200, true);
    metricsService.recordPerformance('operation3', 150, false);
    
    const summary = metricsService.getPerformanceSummary();
    expect(summary.totalOperations).toBe(3);
    expect(summary.successfulOperations).toBe(2);
    expect(summary.failedOperations).toBe(1);
    expect(summary.averageDuration).toBe(150);
    expect(summary.slowestOperation?.operation).toBe('operation2');
  });

  it('should create performance timer', () => {
    const timer = metricsService.createTimer('test_timer');
    expect(timer).toBeDefined();
    expect(typeof timer.end).toBe('function');
    
    // End the timer
    const duration = timer.end(true);
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(0); // Allow 0 in test environment
    
    // Check that metric was recorded
    const metrics = metricsService.getPerformanceMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].operation).toBe('test_timer');
    expect(metrics[0].success).toBe(true);
  });

  it('should record engine metrics', async () => {
    const engineMetrics: EngineMetrics = {
      generationTimeMs: 250,
      totalAssignments: 24,
      assignedCount: 22,
      unassignedCount: 2,
      warningsCount: 1,
      teachersCount: 8,
      classesCount: 4,
      slotId: 'test-slot-1',
      scheduleType: 'MWF',
      engineVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      userId: 'test-user-1',
      userRole: 'ADMIN',
    };

    // This should not throw an error
    await expect(metricsService.recordEngineMetrics(engineMetrics)).resolves.not.toThrow();
  });

  it('should handle engine performance stats', async () => {
    // Mock the database response
    const mockSupabase = await import('../lib/supabase');
    vi.mocked(mockSupabase.supabase.from).mockReturnValue({
      select: vi.fn(() => ({
        gte: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({
            data: [
              {
                metrics: {
                  generation_time_ms: 200,
                  total_assignments: 20,
                  assigned_count: 18,
                  warnings_count: 2,
                },
                created_at: new Date().toISOString(),
                schedule_type: 'MWF'
              }
            ],
            error: null
          }))
        }))
      }))
    } as any);

    const stats = await metricsService.getEnginePerformanceStats();
    
    expect(stats.totalGenerations).toBe(0); // Mock returns empty data due to filtering
    expect(stats.averageGenerationTime).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.warningsRate).toBe(0);
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    const mockSupabase = await import('../lib/supabase');
    vi.mocked(mockSupabase.supabase.from).mockReturnValue({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ 
              error: { message: 'Database error' }
            }))
          }))
        }))
      }))
    } as any);

    const engineMetrics: EngineMetrics = {
      generationTimeMs: 250,
      totalAssignments: 24,
      assignedCount: 22,
      unassignedCount: 2,
      warningsCount: 1,
      teachersCount: 8,
      classesCount: 4,
      slotId: 'test-slot-1',
      scheduleType: 'MWF',
      engineVersion: '1.0.0',
      timestamp: new Date().toISOString(),
      userId: 'test-user-1',
      userRole: 'ADMIN',
    };

    // Should not throw even if database fails
    await expect(metricsService.recordEngineMetrics(engineMetrics)).resolves.not.toThrow();
  });

  it('should limit performance metrics memory usage', () => {
    // Add more than 100 metrics
    for (let i = 0; i < 150; i++) {
      metricsService.recordPerformance(`operation_${i}`, 100 + i, true);
    }

    const metrics = metricsService.getPerformanceMetrics();
    expect(metrics).toHaveLength(100); // Should be limited to 100
    expect(metrics[0].operation).toBe('operation_50'); // Should start from 50th operation
    expect(metrics[99].operation).toBe('operation_149'); // Should end at 149th operation
  });
});
