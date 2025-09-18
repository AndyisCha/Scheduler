import { test, expect } from '@playwright/test';
import { login, testUsers, createTestSlot } from './test-utils';

test.describe('Schedule Generation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    
    // Create a test slot with teachers and constraints
    await createTestSlot(page, 'E2E Schedule Test Slot');
    
    // Navigate to slot edit page
    await page.goto('/slots');
    await page.click('[data-testid="slot-card-E2E Schedule Test Slot"]');
    
    // Add teachers
    await page.click('[data-testid="teachers-tab"]');
    
    // Add homeroom Korean teachers
    await page.fill('[data-testid="add-teacher-input"]', '김선생');
    await page.click('[data-testid="add-homeroom-korean-button"]');
    
    await page.fill('[data-testid="add-teacher-input"]', '이선생');
    await page.click('[data-testid="add-homeroom-korean-button"]');
    
    // Add foreign teachers
    await page.fill('[data-testid="add-teacher-input"]', 'John');
    await page.click('[data-testid="add-foreign-button"]');
    
    await page.fill('[data-testid="add-teacher-input"]', 'Sarah');
    await page.click('[data-testid="add-foreign-button"]');
    
    // Add some constraints
    await page.click('[data-testid="constraints-tab"]');
    await page.selectOption('[data-testid="teacher-select"]', '김선생');
    await page.click('[data-testid="add-constraint-button"]');
    await page.check('[data-testid="period-1-checkbox"]');
    await page.check('[data-testid="period-5-checkbox"]');
    await page.click('[data-testid="save-constraint-button"]');
    
    // Set global options
    await page.click('[data-testid="global-options-tab"]');
    await page.fill('[data-testid="round-1-count"]', '2');
    await page.fill('[data-testid="round-2-count"]', '2');
  });

  test('should generate MWF schedule successfully', async ({ page }) => {
    // Navigate to MWF scheduler
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    
    // Select the test slot
    await page.selectOption('[data-testid="slot-select"]', 'E2E Schedule Test Slot');
    
    // Click generate button
    await page.click('[data-testid="generate-mwf-button"]');
    
    // Wait for generation to complete
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Verify schedule result is displayed
    await expect(page.locator('[data-testid="mwf-schedule-result"]')).toBeVisible();
    
    // Verify schedule table has content
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-table"] tbody tr')).toHaveCount({ min: 1 });
    
    // Verify metrics are displayed
    await expect(page.locator('[data-testid="metrics-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="generation-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="assignment-count"]')).toBeVisible();
  });

  test('should generate TT schedule successfully', async ({ page }) => {
    // Navigate to TT scheduler
    await page.goto('/');
    await page.click('[data-testid="tt-tab"]');
    
    // Select the test slot
    await page.selectOption('[data-testid="slot-select"]', 'E2E Schedule Test Slot');
    
    // Click generate button
    await page.click('[data-testid="generate-tt-button"]');
    
    // Wait for generation to complete
    await expect(page.locator('text=TT 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Verify schedule result is displayed
    await expect(page.locator('[data-testid="tt-schedule-result"]')).toBeVisible();
    
    // Verify schedule table has content
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-table"] tbody tr')).toHaveCount({ min: 1 });
  });

  test('should show generation metrics and performance data', async ({ page }) => {
    // Generate a schedule first
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    await page.selectOption('[data-testid="slot-select"]', 'E2E Schedule Test Slot');
    await page.click('[data-testid="generate-mwf-button"]');
    
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Check metrics panel
    await expect(page.locator('[data-testid="metrics-panel"]')).toBeVisible();
    
    // Verify performance metrics are shown
    await expect(page.locator('[data-testid="generation-time"]')).toBeVisible();
    await expect(page.locator('[data-testid="assignment-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="teacher-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="class-count"]')).toBeVisible();
    
    // Check that metrics values are reasonable
    const generationTime = await page.locator('[data-testid="generation-time"]').textContent();
    expect(generationTime).toMatch(/\d+ms/);
    
    const assignmentCount = await page.locator('[data-testid="assignment-count"]').textContent();
    expect(parseInt(assignmentCount || '0')).toBeGreaterThan(0);
  });

  test('should handle schedule generation errors gracefully', async ({ page }) => {
    // Try to generate schedule without selecting a slot
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    
    // Click generate without selecting slot
    await page.click('[data-testid="generate-mwf-button"]');
    
    // Verify error message
    await expect(page.locator('text=먼저 슬롯을 선택해주세요')).toBeVisible();
  });

  test('should allow viewing different schedule views (class/teacher/day)', async ({ page }) => {
    // Generate a schedule first
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    await page.selectOption('[data-testid="slot-select"]', 'E2E Schedule Test Slot');
    await page.click('[data-testid="generate-mwf-button"]');
    
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Test different view modes
    await page.click('[data-testid="class-view-tab"]');
    await expect(page.locator('[data-testid="class-view-content"]')).toBeVisible();
    
    await page.click('[data-testid="teacher-view-tab"]');
    await expect(page.locator('[data-testid="teacher-view-content"]')).toBeVisible();
    
    await page.click('[data-testid="day-view-tab"]');
    await expect(page.locator('[data-testid="day-view-content"]')).toBeVisible();
  });

  test('should show loading state during generation', async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    await page.selectOption('[data-testid="slot-select"]', 'E2E Schedule Test Slot');
    
    // Click generate and immediately check for loading state
    await page.click('[data-testid="generate-mwf-button"]');
    
    // Verify loading indicator is shown
    await expect(page.locator('[data-testid="generating-indicator"]')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Verify loading indicator is hidden
    await expect(page.locator('[data-testid="generating-indicator"]')).not.toBeVisible();
  });

  test('should save schedule snapshot successfully', async ({ page }) => {
    // Generate a schedule first
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    await page.selectOption('[data-testid="slot-select"]', 'E2E Schedule Test Slot');
    await page.click('[data-testid="generate-mwf-button"]');
    
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Save snapshot
    await page.click('[data-testid="save-snapshot-button"]');
    await page.fill('[data-testid="snapshot-name-input"]', 'E2E Test Snapshot');
    await page.click('[data-testid="confirm-save-button"]');
    
    // Verify success
    await expect(page.locator('text=스냅샷이 저장되었습니다')).toBeVisible();
  });
});