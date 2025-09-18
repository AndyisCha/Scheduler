import { test, expect } from '@playwright/test';
import { login, logout, testUsers } from './test-utils';

test.describe('Authentication', () => {
  test('should allow admin user to sign in and sign out', async ({ page }) => {
    // Test successful login
    await login(page, testUsers.admin);
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
    await expect(page.locator('text=Admin')).toBeVisible();
    
    // Test logout
    await logout(page);
    
    // Verify user is logged out
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should allow super admin user to sign in', async ({ page }) => {
    await login(page, testUsers.superAdmin);
    
    // Verify super admin is logged in
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
    await expect(page.locator('text=Super Admin')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    // Fill with invalid credentials
    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Verify error message is shown
    await expect(page.locator('text=Invalid credentials')).toBeVisible({ timeout: 10000 });
  });

  test('should show error with empty credentials', async ({ page }) => {
    await page.goto('/');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Verify validation error or login form is still visible
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  test('should persist login state on page refresh', async ({ page }) => {
    // Login first
    await login(page, testUsers.admin);
    
    // Refresh page
    await page.reload();
    
    // Verify user is still logged in
    await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
    await expect(page.locator('text=Admin')).toBeVisible();
  });

  test('should redirect to login page when accessing protected routes without auth', async ({ page }) => {
    // Try to access protected route without login
    await page.goto('/slots');
    
    // Should redirect to login page
    await page.waitForURL(/\/$/, { timeout: 5000 });
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });
});