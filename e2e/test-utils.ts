import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
}

export const testUsers: Record<string, TestUser> = {
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    role: 'ADMIN'
  },
  superAdmin: {
    email: 'superadmin@example.com',
    password: 'password123',
    role: 'SUPER_ADMIN'
  }
};

/**
 * Login with test credentials
 */
export async function login(page: Page, user: TestUser) {
  await page.goto('/');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[name="email"]', { timeout: 10000 });
  
  // Fill login form
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL(/\/slots/, { timeout: 10000 });
  
  // Verify login success by checking for user info in header
  await expect(page.locator('[data-testid="user-info"]')).toBeVisible();
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  // Click logout button
  await page.click('[data-testid="logout-button"]');
  
  // Wait for redirect to login page
  await page.waitForURL(/\/$/, { timeout: 5000 });
  
  // Verify logout by checking login form is visible
  await expect(page.locator('input[name="email"]')).toBeVisible();
}

/**
 * Create a test slot with basic configuration
 */
export async function createTestSlot(page: Page, slotName: string = 'E2E Test Slot') {
  // Navigate to slots page
  await page.goto('/slots');
  await page.waitForLoadState('networkidle');
  
  // Click create slot button
  await page.click('[data-testid="create-slot-button"]');
  
  // Fill slot form
  await page.fill('[data-testid="slot-name-input"]', slotName);
  await page.fill('[data-testid="slot-description-input"]', 'E2E 테스트용 슬롯입니다.');
  
  // Select day group (default to MWF)
  await page.selectOption('[data-testid="day-group-select"]', 'MWF');
  
  // Save slot
  await page.click('[data-testid="save-slot-button"]');
  
  // Wait for success message and redirect
  await expect(page.locator('text=슬롯이 생성되었습니다')).toBeVisible();
  await page.waitForURL(/\/slots\/[^/]+$/, { timeout: 5000 });
  
  return slotName;
}