import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the app to be ready
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Check if the app is running by looking for login form or main content
    const loginForm = page.locator('input[name="email"]');
    const mainContent = page.locator('[data-testid="main-content"]');
    
    const hasLoginForm = await loginForm.isVisible();
    const hasMainContent = await mainContent.isVisible();
    
    if (!hasLoginForm && !hasMainContent) {
      throw new Error('App not ready - neither login form nor main content found');
    }

    console.log('✅ App is ready for testing');
  } catch (error) {
    console.error('❌ App setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;