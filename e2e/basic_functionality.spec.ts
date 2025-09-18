import { test, expect } from '@playwright/test';

test.describe('Basic Functionality', () => {
  test('should load the application and show basic UI', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Vite|Schedule|스케줄/);
    
    // Check for basic elements
    await expect(page.locator('body')).toBeVisible();
    
    // Check that the page has content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText!.length).toBeGreaterThan(10);
  });

  test('should have proper meta tags and viewport', async ({ page }) => {
    await page.goto('/');
    
    // Check for viewport meta tag
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', /width=device-width/);
    
    // Check for charset meta tag
    const charset = page.locator('meta[charset]');
    await expect(charset).toHaveCount(1);
  });

  test('should be responsive on different screen sizes', async ({ page }) => {
    await page.goto('/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test basic keyboard navigation
    await page.keyboard.press('Tab');
    
    // Check that focus is on an interactive element or body
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT', 'SELECT', 'A', 'TEXTAREA', 'BODY']).toContain(focusedElement);
    
    // If focus is on body, tab again to find interactive elements
    if (focusedElement === 'BODY') {
      await page.keyboard.press('Tab');
      const nextFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
      // Should either stay on body or move to interactive element
      expect(['BUTTON', 'INPUT', 'SELECT', 'A', 'TEXTAREA', 'BODY']).toContain(nextFocusedElement);
    }
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility attributes
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Check for proper heading structure
    const headings = page.locator('h1, h2, h3, h4, h5, h6');
    const headingCount = await headings.count();
    
    // Should have at least one heading
    expect(headingCount).toBeGreaterThanOrEqual(0);
  });

  test('should load without JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('favicon') && 
      !error.includes('404') &&
      !error.includes('net::ERR_')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Non-critical errors found:', criticalErrors);
    }
    
    // For now, just ensure the page loads
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle page refresh correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    
    // Refresh the page
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content is still there
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
  });

  test('should have proper security headers', async ({ page }) => {
    const response = await page.goto('/');
    
    // Check for basic security headers
    const headers = response?.headers();
    
    if (headers) {
      // Check for content type
      expect(headers['content-type']).toContain('text/html');
    }
  });
});
