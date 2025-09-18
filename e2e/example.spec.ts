import { test, expect } from '@playwright/test';

test('basic app loading test', async ({ page }) => {
  await page.goto('/');
  
  // Just check that the page loads without errors
  await expect(page).toHaveTitle(/Schedule/);
  
  // Take a screenshot for verification
  await page.screenshot({ path: 'test-results/app-loaded.png' });
});
