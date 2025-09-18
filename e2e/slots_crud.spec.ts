import { test, expect } from '@playwright/test';
import { login, testUsers, createTestSlot } from './test-utils';

test.describe('Slot Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
  });

  test('should allow creating a new slot', async ({ page }) => {
    const slotName = 'E2E Test Slot - Create';
    
    // Navigate to slots page
    await page.goto('/slots');
    await page.waitForLoadState('networkidle');
    
    // Click create slot button
    await page.click('[data-testid="create-slot-button"]');
    
    // Fill slot form
    await page.fill('[data-testid="slot-name-input"]', slotName);
    await page.fill('[data-testid="slot-description-input"]', 'E2E 테스트용 슬롯입니다.');
    
    // Select day group
    await page.selectOption('[data-testid="day-group-select"]', 'MWF');
    
    // Save slot
    await page.click('[data-testid="save-slot-button"]');
    
    // Verify success
    await expect(page.locator('text=슬롯이 생성되었습니다')).toBeVisible();
    await expect(page.locator(`text=${slotName}`)).toBeVisible();
  });

  test('should allow editing an existing slot', async ({ page }) => {
    const originalName = 'E2E Test Slot - Edit';
    const updatedName = 'E2E Test Slot - Updated';
    
    // Create a slot first
    await createTestSlot(page, originalName);
    
    // Navigate to slot edit page
    await page.goto('/slots');
    await page.click(`[data-testid="slot-card-${originalName}"]`);
    
    // Click edit button
    await page.click('[data-testid="edit-slot-button"]');
    
    // Update slot name
    await page.fill('[data-testid="slot-name-input"]', updatedName);
    
    // Save changes
    await page.click('[data-testid="save-slot-button"]');
    
    // Verify success
    await expect(page.locator('text=슬롯이 업데이트되었습니다')).toBeVisible();
    await expect(page.locator(`text=${updatedName}`)).toBeVisible();
  });

  test('should allow deleting a slot', async ({ page }) => {
    const slotName = 'E2E Test Slot - Delete';
    
    // Create a slot first
    await createTestSlot(page, slotName);
    
    // Navigate to slots list
    await page.goto('/slots');
    
    // Find and click the slot
    await page.click(`[data-testid="slot-card-${slotName}"]`);
    
    // Click delete button
    await page.click('[data-testid="delete-slot-button"]');
    
    // Confirm deletion
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify success
    await expect(page.locator('text=슬롯이 삭제되었습니다')).toBeVisible();
    await expect(page.locator(`text=${slotName}`)).not.toBeVisible();
  });

  test('should show validation errors for invalid slot data', async ({ page }) => {
    await page.goto('/slots');
    await page.click('[data-testid="create-slot-button"]');
    
    // Try to save without required fields
    await page.click('[data-testid="save-slot-button"]');
    
    // Verify validation errors are shown
    await expect(page.locator('text=슬롯 이름은 필수입니다')).toBeVisible();
  });

  test('should allow switching between MWF and TT day groups', async ({ page }) => {
    await page.goto('/slots');
    await page.click('[data-testid="create-slot-button"]');
    
    // Test MWF selection
    await page.selectOption('[data-testid="day-group-select"]', 'MWF');
    await expect(page.locator('[data-testid="day-group-select"]')).toHaveValue('MWF');
    
    // Test TT selection
    await page.selectOption('[data-testid="day-group-select"]', 'TT');
    await expect(page.locator('[data-testid="day-group-select"]')).toHaveValue('TT');
  });

  test('should display slot list with proper information', async ({ page }) => {
    const slotName = 'E2E Test Slot - List';
    
    // Create a slot
    await createTestSlot(page, slotName);
    
    // Navigate to slots list
    await page.goto('/slots');
    
    // Verify slot information is displayed
    await expect(page.locator(`[data-testid="slot-card-${slotName}"]`)).toBeVisible();
    await expect(page.locator('text=MWF')).toBeVisible();
    await expect(page.locator('text=한국어 교사: 0명')).toBeVisible();
    await expect(page.locator('text=외국어 교사: 0명')).toBeVisible();
  });
});