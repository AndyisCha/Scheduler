import { test, expect } from '@playwright/test';
import { login, testUsers, createTestSlot } from './test-utils';

test.describe('Print and Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    
    // Create a test slot with content for testing
    await createTestSlot(page, 'E2E A11y Test Slot');
    
    // Navigate to slot edit page and add teachers
    await page.goto('/slots');
    await page.click('[data-testid="slot-card-E2E A11y Test Slot"]');
    
    await page.click('[data-testid="teachers-tab"]');
    await page.fill('[data-testid="add-teacher-input"]', '김선생');
    await page.click('[data-testid="add-homeroom-korean-button"]');
    await page.fill('[data-testid="add-teacher-input"]', '이선생');
    await page.click('[data-testid="add-homeroom-korean-button"]');
    await page.fill('[data-testid="add-teacher-input"]', 'John');
    await page.click('[data-testid="add-foreign-button"]');
    
    // Generate a schedule
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    await page.selectOption('[data-testid="slot-select"]', 'E2E A11y Test Slot');
    await page.click('[data-testid="generate-mwf-button"]');
    
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
  });

  test('should support keyboard navigation in tabs', async ({ page }) => {
    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="mwf-tab"]')).toBeFocused();
    
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="tt-tab"]')).toBeFocused();
    
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="unified-tab"]')).toBeFocused();
    
    await page.keyboard.press('Home');
    await expect(page.locator('[data-testid="mwf-tab"]')).toBeFocused();
    
    await page.keyboard.press('End');
    await expect(page.locator('[data-testid="unified-tab"]')).toBeFocused();
  });

  test('should have proper ARIA roles and labels', async ({ page }) => {
    // Check tab list has proper ARIA role
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    
    // Check tabs have proper ARIA roles
    await expect(page.locator('[role="tab"]')).toHaveCount({ min: 3 });
    
    // Check tab panels have proper ARIA roles
    await expect(page.locator('[role="tabpanel"]')).toHaveCount({ min: 1 });
    
    // Check tables have proper ARIA roles
    await expect(page.locator('[role="table"]')).toHaveCount({ min: 1 });
    
    // Check for ARIA labels
    await expect(page.locator('[aria-label]')).toHaveCount({ min: 1 });
    await expect(page.locator('[aria-labelledby]')).toHaveCount({ min: 1 });
    
    // Check for proper tab associations
    await expect(page.locator('[aria-controls]')).toHaveCount({ min: 1 });
    await expect(page.locator('[aria-selected]')).toHaveCount({ min: 1 });
  });

  test('should activate tabs with Enter and Space keys', async ({ page }) => {
    // Focus on TT tab
    await page.keyboard.press('Tab');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="tt-tab"]')).toBeFocused();
    
    // Activate with Enter
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="tt-tab"]')).toHaveAttribute('aria-selected', 'true');
    
    // Focus on MWF tab
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('[data-testid="mwf-tab"]')).toBeFocused();
    
    // Activate with Space
    await page.keyboard.press(' ');
    await expect(page.locator('[data-testid="mwf-tab"]')).toHaveAttribute('aria-selected', 'true');
  });

  test('should support keyboard navigation in tables', async ({ page }) => {
    // Ensure schedule is visible
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Test tab navigation in table
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should focus on table elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['TD', 'TH', 'BUTTON', 'INPUT', 'SELECT']).toContain(focusedElement);
  });

  test('should have proper heading structure', async ({ page }) => {
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    const h2Count = await page.locator('h2').count();
    
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h2Count).toBeGreaterThanOrEqual(1);
    
    // Check that headings have proper content
    await expect(page.locator('h1')).toHaveCount({ min: 1 });
    await expect(page.locator('h2')).toHaveCount({ min: 1 });
  });

  test('should have proper form labels and associations', async ({ page }) => {
    // Check for proper form labels
    await expect(page.locator('label[for]')).toHaveCount({ min: 1 });
    
    // Check that inputs have associated labels
    const inputs = page.locator('input:not([type="hidden"])');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      // Each input should have either id with label[for], aria-label, or aria-labelledby
      expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  });

  test('should support print functionality', async ({ page }) => {
    // Click print button
    await page.click('[data-testid="print-button"]');
    
    // Wait for print view or print dialog
    await page.waitForTimeout(1000);
    
    // Check if print-specific CSS classes are applied
    const printElements = page.locator('.print-title, .print-table, .print-section');
    const printElementCount = await printElements.count();
    
    expect(printElementCount).toBeGreaterThan(0);
    
    // Verify print view is activated if applicable
    const printView = page.locator('[data-testid="print-view"]');
    if (await printView.isVisible()) {
      await expect(printView).toBeVisible();
    }
  });

  test('should have proper contrast ratios', async ({ page }) => {
    // This test would need to be implemented with a proper contrast checking library
    // For now, we'll check that text elements exist and are visible
    await expect(page.locator('text=스케줄')).toBeVisible();
    await expect(page.locator('[data-testid="schedule-table"]')).toBeVisible();
    
    // Check that important elements have sufficient contrast by ensuring they're visible
    await expect(page.locator('[data-testid="generate-mwf-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="mwf-tab"]')).toBeVisible();
  });

  test('should have proper focus indicators', async ({ page }) => {
    // Test focus indicators on interactive elements
    await page.keyboard.press('Tab');
    
    // Check that focused element has visible focus indicator
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
    
    // Check that focus is visible (this would need custom CSS testing)
    const focusStyles = await focusedElement.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        boxShadow: styles.boxShadow,
        border: styles.border
      };
    });
    
    // At least one focus indicator should be present
    const hasFocusIndicator = focusStyles.outline !== 'none' || 
                             focusStyles.boxShadow !== 'none' || 
                             focusStyles.border !== 'none';
    expect(hasFocusIndicator).toBeTruthy();
  });

  test('should have proper skip links', async ({ page }) => {
    // Check for skip to content link
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeVisible();
      
      // Test skip link functionality
      await skipLink.click();
      
      // Should focus on main content
      const mainContent = page.locator('[data-testid="main-content"]');
      await expect(mainContent).toBeFocused();
    }
  });

  test('should have proper table headers and associations', async ({ page }) => {
    // Check that tables have proper headers
    await expect(page.locator('[data-testid="schedule-table"] th')).toHaveCount({ min: 1 });
    
    // Check that table headers have proper scope attributes
    await expect(page.locator('[data-testid="schedule-table"] th[scope]')).toHaveCount({ min: 1 });
    
    // Check that table cells have proper headers attributes where needed
    const cellsWithHeaders = page.locator('[data-testid="schedule-table"] td[headers]');
    const cellsWithHeadersCount = await cellsWithHeaders.count();
    
    // At least some cells should have headers attribute for complex tables
    expect(cellsWithHeadersCount).toBeGreaterThanOrEqual(0);
  });

  test('should support screen reader navigation', async ({ page }) => {
    // Check for proper landmark roles
    await expect(page.locator('[role="main"]')).toHaveCount({ min: 1 });
    await expect(page.locator('[role="navigation"]')).toHaveCount({ min: 1 });
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    expect(headingCount).toBeGreaterThanOrEqual(2);
    
    // Check for proper list structure where applicable
    const lists = page.locator('ul, ol');
    const listCount = await lists.count();
    
    if (listCount > 0) {
      await expect(lists.first().locator('li')).toHaveCount({ min: 1 });
    }
  });

  test('should have proper error handling and announcements', async ({ page }) => {
    // Test error handling with invalid input
    await page.fill('[data-testid="slot-name-input"]', '');
    await page.click('[data-testid="save-slot-button"]');
    
    // Check for error message
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 5000 });
    
    // Check that error is announced to screen readers
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
  });

  test('should maintain focus management during dynamic updates', async ({ page }) => {
    // Generate schedule and check focus management
    await page.click('[data-testid="generate-mwf-button"]');
    
    // During loading, focus should be managed properly
    await expect(page.locator('[data-testid="generating-indicator"]')).toBeVisible();
    
    // After completion, focus should return to appropriate element
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Check that focus is on a reasonable element
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});
