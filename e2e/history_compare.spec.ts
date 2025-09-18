import { test, expect } from '@playwright/test';

test.describe('Schedule History and Comparison', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/auth/me', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '1',
            email: 'admin@example.com',
            role: 'ADMIN',
            display_name: 'Admin User'
          }
        })
      });
    });

    // Mock schedule history API
    await page.route('**/api/schedules/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'schedule-1',
            slotId: 'slot-1',
            name: 'Schedule v1.0',
            description: 'Initial schedule',
            scheduleType: 'MWF',
            createdAt: '2024-01-01T10:00:00Z',
            createdBy: '1',
            metrics: {
              totalAssignments: 10,
              assignedCount: 8,
              unassignedCount: 2,
              warningsCount: 1
            }
          },
          {
            id: 'schedule-2',
            slotId: 'slot-1',
            name: 'Schedule v1.1',
            description: 'Updated schedule',
            scheduleType: 'MWF',
            createdAt: '2024-01-01T11:00:00Z',
            createdBy: '1',
            metrics: {
              totalAssignments: 10,
              assignedCount: 9,
              unassignedCount: 1,
              warningsCount: 0
            }
          },
          {
            id: 'schedule-3',
            slotId: 'slot-1',
            name: 'Schedule v2.0',
            description: 'Major update',
            scheduleType: 'MWF',
            createdAt: '2024-01-01T12:00:00Z',
            createdBy: '1',
            metrics: {
              totalAssignments: 12,
              assignedCount: 12,
              unassignedCount: 0,
              warningsCount: 0
            }
          }
        ])
      });
    });

    await page.goto('/schedule-history');
  });

  test('should display schedule history list', async ({ page }) => {
    await expect(page.getByTestId('schedule-history-page')).toBeVisible();
    await expect(page.getByTestId('history-list')).toBeVisible();
    
    // Should show all schedule versions
    await expect(page.getByTestId('schedule-item-schedule-1')).toBeVisible();
    await expect(page.getByTestId('schedule-item-schedule-2')).toBeVisible();
    await expect(page.getByTestId('schedule-item-schedule-3')).toBeVisible();
    
    // Should show schedule details
    await expect(page.getByText('Schedule v1.0')).toBeVisible();
    await expect(page.getByText('Schedule v1.1')).toBeVisible();
    await expect(page.getByText('Schedule v2.0')).toBeVisible();
  });

  test('should load schedule details when clicked', async ({ page }) => {
    // Mock individual schedule API
    await page.route('**/api/schedules/schedule-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'schedule-1',
          slotId: 'slot-1',
          name: 'Schedule v1.0',
          description: 'Initial schedule',
          scheduleType: 'MWF',
          createdAt: '2024-01-01T10:00:00Z',
          data: {
            classSummary: {
              'R1C1': {
                '월': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 1,
                    period: 1,
                    time: '14:20-15:05',
                    isExam: false
                  }
                ],
                '수': [],
                '금': []
              }
            },
            teacherSummary: {
              '김담임': {
                '월': [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 1,
                    period: 1,
                    time: '14:20-15:05',
                    isExam: false
                  }
                ],
                '수': [],
                '금': []
              }
            },
            dayGrid: {
              '월': {
                1: [
                  {
                    teacher: '김담임',
                    role: 'H',
                    classId: 'R1C1',
                    round: 1,
                    period: 1,
                    time: '14:20-15:05',
                    isExam: false
                  }
                ],
                2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: []
              },
              '수': { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] },
              '금': { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [] }
            },
            warnings: [],
            metrics: {
              generationTimeMs: 150,
              totalAssignments: 1,
              assignedCount: 1,
              unassignedCount: 0,
              warningsCount: 0,
              teachersCount: 5,
              classesCount: 1
            }
          }
        })
      });
    });

    await page.getByTestId('view-schedule-button-schedule-1').click();
    
    // Should show schedule details modal
    await expect(page.getByTestId('schedule-details-modal')).toBeVisible();
    await expect(page.getByTestId('schedule-viewer')).toBeVisible();
    await expect(page.getByText('Schedule v1.0')).toBeVisible();
  });

  test('should select two schedules for comparison', async ({ page }) => {
    // Mock comparison API
    await page.route('**/api/schedules/compare', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schedule1: {
            id: 'schedule-1',
            name: 'Schedule v1.0',
            metrics: {
              totalAssignments: 10,
              assignedCount: 8,
              unassignedCount: 2,
              warningsCount: 1
            }
          },
          schedule2: {
            id: 'schedule-2',
            name: 'Schedule v1.1',
            metrics: {
              totalAssignments: 10,
              assignedCount: 9,
              unassignedCount: 1,
              warningsCount: 0
            }
          },
          differences: [
            {
              type: 'assignment_change',
              description: 'Teacher assignment changed',
              schedule1: '김담임 -> R1C1',
              schedule2: '이담임 -> R1C1'
            }
          ]
        })
      });
    });

    // Select first schedule
    await page.getByTestId('compare-checkbox-schedule-1').check();
    
    // Select second schedule
    await page.getByTestId('compare-checkbox-schedule-2').check();
    
    // Should enable compare button
    await expect(page.getByTestId('compare-schedules-button')).toBeEnabled();
    
    // Click compare
    await page.getByTestId('compare-schedules-button').click();
    
    // Should navigate to comparison page
    await expect(page).toHaveURL(/.*\/schedule-compare/);
    await expect(page.getByTestId('schedule-comparison-page')).toBeVisible();
  });

  test('should show comparison results', async ({ page }) => {
    // Navigate to comparison page
    await page.goto('/schedule-compare?schedule1=schedule-1&schedule2=schedule-2');
    
    // Mock comparison data
    await page.route('**/api/schedules/compare', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schedule1: {
            id: 'schedule-1',
            name: 'Schedule v1.0',
            metrics: {
              totalAssignments: 10,
              assignedCount: 8,
              unassignedCount: 2,
              warningsCount: 1
            }
          },
          schedule2: {
            id: 'schedule-2',
            name: 'Schedule v1.1',
            metrics: {
              totalAssignments: 10,
              assignedCount: 9,
              unassignedCount: 1,
              warningsCount: 0
            }
          },
          differences: [
            {
              type: 'assignment_change',
              description: 'Teacher assignment changed',
              schedule1: '김담임 -> R1C1',
              schedule2: '이담임 -> R1C1'
            },
            {
              type: 'metric_improvement',
              description: 'Assignment rate improved',
              schedule1: '80%',
              schedule2: '90%'
            }
          ]
        })
      });
    });

    await expect(page.getByTestId('comparison-side-by-side')).toBeVisible();
    
    // Should show both schedules
    await expect(page.getByTestId('schedule-1-panel')).toBeVisible();
    await expect(page.getByTestId('schedule-2-panel')).toBeVisible();
    
    // Should show differences
    await expect(page.getByTestId('differences-panel')).toBeVisible();
    await expect(page.getByText('Teacher assignment changed')).toBeVisible();
    await expect(page.getByText('Assignment rate improved')).toBeVisible();
  });

  test('should filter schedules by date range', async ({ page }) => {
    await page.getByTestId('date-filter-button').click();
    
    // Set date range
    await page.getByTestId('start-date-input').fill('2024-01-01');
    await page.getByTestId('end-date-input').fill('2024-01-02');
    await page.getByTestId('apply-date-filter').click();
    
    // Should show filtered results
    await expect(page.getByTestId('filtered-history-list')).toBeVisible();
  });

  test('should filter schedules by type', async ({ page }) => {
    await page.getByTestId('type-filter-select').selectOption('MWF');
    
    // Should show only MWF schedules
    await expect(page.getByTestId('schedule-item-schedule-1')).toBeVisible();
    await expect(page.getByTestId('schedule-item-schedule-2')).toBeVisible();
    await expect(page.getByTestId('schedule-item-schedule-3')).toBeVisible();
  });

  test('should delete schedule with confirmation', async ({ page }) => {
    // Mock delete API
    await page.route('**/api/schedules/schedule-1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 204
        });
      }
    });

    await page.getByTestId('delete-schedule-button-schedule-1').click();
    
    // Confirm deletion
    await expect(page.getByTestId('delete-confirmation-modal')).toBeVisible();
    await page.getByTestId('confirm-delete-button').click();
    
    // Should show success message
    await expect(page.getByText('스케줄이 삭제되었습니다')).toBeVisible();
    
    // Schedule should be removed from list
    await expect(page.getByTestId('schedule-item-schedule-1')).not.toBeVisible();
  });

  test('should restore schedule from history', async ({ page }) => {
    // Mock restore API
    await page.route('**/api/schedules/schedule-1/restore', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Schedule restored successfully'
        })
      });
    });

    await page.getByTestId('restore-schedule-button-schedule-1').click();
    
    // Should show success message
    await expect(page.getByText('스케줄이 복원되었습니다')).toBeVisible();
  });

  test('should export comparison report', async ({ page }) => {
    await page.goto('/schedule-compare?schedule1=schedule-1&schedule2=schedule-2');
    
    // Export comparison report
    await page.getByTestId('export-comparison-button').click();
    
    // Should show export options
    await expect(page.getByTestId('export-options-modal')).toBeVisible();
    
    // Export as PDF
    await page.getByTestId('export-pdf-option').click();
    
    // Should show success message
    await expect(page.getByText('비교 보고서가 내보내기되었습니다')).toBeVisible();
  });

  test('should handle empty history gracefully', async ({ page }) => {
    // Mock empty history
    await page.route('**/api/schedules/history', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.reload();
    
    // Should show empty state
    await expect(page.getByTestId('empty-history-state')).toBeVisible();
    await expect(page.getByText('생성된 스케줄이 없습니다')).toBeVisible();
  });
});
