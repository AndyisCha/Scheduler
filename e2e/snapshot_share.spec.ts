import { test, expect } from '@playwright/test';
import { login, testUsers, createTestSlot } from './test-utils';

test.describe('Snapshot Sharing', () => {
  let shareUrl: string;

  test.beforeEach(async ({ page }) => {
    await login(page, testUsers.admin);
    
    // Create a test slot and generate a schedule
    await createTestSlot(page, 'E2E Share Test Slot');
    
    // Navigate to slot edit page and add teachers
    await page.goto('/slots');
    await page.click('[data-testid="slot-card-E2E Share Test Slot"]');
    
    await page.click('[data-testid="teachers-tab"]');
    await page.fill('[data-testid="add-teacher-input"]', '김선생');
    await page.click('[data-testid="add-homeroom-korean-button"]');
    await page.fill('[data-testid="add-teacher-input"]', 'John');
    await page.click('[data-testid="add-foreign-button"]');
    
    // Generate a schedule
    await page.goto('/');
    await page.click('[data-testid="mwf-tab"]');
    await page.selectOption('[data-testid="slot-select"]', 'E2E Share Test Slot');
    await page.click('[data-testid="generate-mwf-button"]');
    
    await expect(page.locator('text=MWF 스케줄이 생성되었습니다')).toBeVisible({ timeout: 30000 });
    
    // Save snapshot
    await page.click('[data-testid="save-snapshot-button"]');
    await page.fill('[data-testid="snapshot-name-input"]', 'E2E Share Test Snapshot');
    await page.click('[data-testid="confirm-save-button"]');
    
    await expect(page.locator('text=스냅샷이 저장되었습니다')).toBeVisible();
  });

  test('should create share link successfully', async ({ page }) => {
    // Click share button
    await page.click('[data-testid="share-snapshot-button"]');
    
    // Configure share options
    await page.selectOption('[data-testid="expires-select"]', '30');
    await page.check('[data-testid="allow-download-checkbox"]');
    
    // Create share link
    await page.click('[data-testid="create-share-link-button"]');
    
    // Wait for success
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    // Get share URL
    const shareUrlElement = await page.locator('[data-testid="share-url-display"]');
    shareUrl = await shareUrlElement.textContent() || '';
    
    expect(shareUrl).toContain('/shared/');
    expect(shareUrl.length).toBeGreaterThan(20);
  });

  test('should access shared snapshot without authentication', async ({ browser }) => {
    // Create a new browser context (simulating different user)
    const context = await browser.newContext();
    const newPage = await context.newPage();
    
    // Generate share URL first (using authenticated session)
    await page.click('[data-testid="share-snapshot-button"]');
    await page.selectOption('[data-testid="expires-select"]', '30');
    await page.click('[data-testid="create-share-link-button"]');
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    const shareUrlElement = await page.locator('[data-testid="share-url-display"]');
    shareUrl = await shareUrlElement.textContent() || '';
    
    // Access shared link without authentication
    await newPage.goto(shareUrl);
    
    // Verify shared content is accessible
    await expect(newPage.locator('text=공유 스케줄: E2E Share Test Slot')).toBeVisible();
    await expect(newPage.locator('[data-testid="schedule-content"]')).toBeVisible();
    
    // Verify it shows read-only message
    await expect(newPage.locator('text=이 스케줄은 읽기 전용으로 공유되었습니다')).toBeVisible();
    
    await context.close();
  });

  test('should show proper error for expired share links', async ({ page }) => {
    // Create a share link with immediate expiration (for testing)
    await page.click('[data-testid="share-snapshot-button"]');
    await page.selectOption('[data-testid="expires-select"]', '0'); // 0 days = immediate expiration
    await page.click('[data-testid="create-share-link-button"]');
    
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    const shareUrlElement = await page.locator('[data-testid="share-url-display"]');
    shareUrl = await shareUrlElement.textContent() || '';
    
    // Try to access the expired link
    await page.goto(shareUrl);
    
    // Verify error message
    await expect(page.locator('text=공유 링크가 만료되었습니다')).toBeVisible();
  });

  test('should show proper error for invalid share tokens', async ({ page }) => {
    // Try to access invalid share URL
    await page.goto('/shared/invalid-token-123');
    
    // Verify error message
    await expect(page.locator('text=공유 링크를 찾을 수 없습니다')).toBeVisible();
  });

  test('should allow copying share URL to clipboard', async ({ page }) => {
    // Create share link
    await page.click('[data-testid="share-snapshot-button"]');
    await page.click('[data-testid="create-share-link-button"]');
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    // Click copy button
    await page.click('[data-testid="copy-share-url-button"]');
    
    // Verify success message
    await expect(page.locator('text=공유 링크가 클립보드에 복사되었습니다')).toBeVisible();
  });

  test('should allow downloading shared snapshot data', async ({ browser }) => {
    // Create share link with download enabled
    await page.click('[data-testid="share-snapshot-button"]');
    await page.check('[data-testid="allow-download-checkbox"]');
    await page.click('[data-testid="create-share-link-button"]');
    
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    const shareUrlElement = await page.locator('[data-testid="share-url-display"]');
    shareUrl = await shareUrlElement.textContent() || '';
    
    // Access shared link in new context
    const context = await browser.newContext();
    const newPage = await context.newPage();
    
    await newPage.goto(shareUrl);
    
    // Verify download button is available
    await expect(newPage.locator('[data-testid="download-button"]')).toBeVisible();
    
    // Test download functionality
    const downloadPromise = newPage.waitForEvent('download');
    await newPage.click('[data-testid="download-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('.json');
    
    await context.close();
  });

  test('should track access count for shared links', async ({ browser }) => {
    // Create share link
    await page.click('[data-testid="share-snapshot-button"]');
    await page.click('[data-testid="create-share-link-button"]');
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    const shareUrlElement = await page.locator('[data-testid="share-url-display"]');
    shareUrl = await shareUrlElement.textContent() || '';
    
    // Access the link multiple times
    const context = await browser.newContext();
    const newPage = await context.newPage();
    
    for (let i = 0; i < 3; i++) {
      await newPage.goto(shareUrl);
      await expect(newPage.locator('text=공유 스케줄: E2E Share Test Slot')).toBeVisible();
      await newPage.waitForTimeout(1000);
    }
    
    await context.close();
    
    // Check access count in share management
    await page.click('[data-testid="manage-share-links-button"]');
    
    // Verify access count is tracked
    await expect(page.locator('text=접근 횟수: 3회')).toBeVisible();
  });

  test('should allow deleting share links', async ({ page }) => {
    // Create share link
    await page.click('[data-testid="share-snapshot-button"]');
    await page.click('[data-testid="create-share-link-button"]');
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    // Open share management
    await page.click('[data-testid="manage-share-links-button"]');
    
    // Find the share link and delete it
    await page.click('[data-testid="delete-share-link-button"]');
    await page.click('[data-testid="confirm-delete-button"]');
    
    // Verify deletion
    await expect(page.locator('text=공유 링크가 삭제되었습니다')).toBeVisible();
  });

  test('should show share link management interface', async ({ page }) => {
    // Create multiple share links
    await page.click('[data-testid="share-snapshot-button"]');
    await page.click('[data-testid="create-share-link-button"]');
    await expect(page.locator('text=공유 링크가 생성되었습니다')).toBeVisible();
    
    // Create another link with different settings
    await page.click('[data-testid="create-another-link-button"]');
    await page.selectOption('[data-testid="expires-select"]', '7');
    await page.check('[data-testid="is-public-checkbox"]');
    await page.click('[data-testid="create-share-link-button"]');
    
    // Open management interface
    await page.click('[data-testid="manage-share-links-button"]');
    
    // Verify management interface shows all links
    await expect(page.locator('[data-testid="share-links-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="share-link-item"]')).toHaveCount(2);
    
    // Verify link details are shown
    await expect(page.locator('text=E2E Share Test Snapshot')).toBeVisible();
    await expect(page.locator('text=MWF')).toBeVisible();
  });
});
