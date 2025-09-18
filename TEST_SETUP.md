# E2E Test Setup Guide

This guide explains how to set up and run the Playwright E2E tests for the Schedule Management System.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Install Playwright Browsers
```bash
npx playwright install
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Tests (in another terminal)
```bash
npm run test:e2e
```

## 📁 Test Structure

```
e2e/
├── auth_login.spec.ts          # Authentication tests
├── slots_crud.spec.ts          # Slot management tests
├── schedule_generate.spec.ts   # Schedule generation tests
├── history_compare.spec.ts     # History & comparison tests
├── rbac_guard.spec.ts          # Role-based access control tests
├── example.spec.ts             # Basic app loading test
├── test-utils.ts               # Test utilities and helpers
├── global-setup.ts             # Global test setup
└── README.md                   # Detailed test documentation
```

## 🎯 Test Coverage

### Core Flows Covered
- ✅ **Authentication**: Login/logout, session management
- ✅ **Slots CRUD**: Create, read, update, delete slots
- ✅ **Schedule Generation**: MWF and TT schedule creation
- ✅ **History Management**: Schedule history and comparison
- ✅ **RBAC**: Role-based access control (ADMIN vs SUPER_ADMIN)

### Test Scenarios
- **Happy Path**: Successful user flows
- **Error Handling**: API errors, validation failures
- **Edge Cases**: Empty states, permission boundaries
- **Cross-Browser**: Chrome, Firefox, Safari compatibility

## 🛠️ Running Tests

### Basic Commands
```bash
# Run all tests
npm run test:e2e

# Run with UI (visual mode)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Debug mode (with dev tools)
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### Advanced Options
```bash
# Run specific test file
npx playwright test auth_login.spec.ts

# Run tests matching pattern
npx playwright test --grep "login"

# Run in specific browser
npx playwright test --project=chromium

# Run with custom timeout
npx playwright test --timeout=60000

# Run with retries
npx playwright test --retries=3
```

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)
- **Browsers**: Chrome, Firefox, Safari
- **Base URL**: `http://localhost:5173`
- **Retries**: 2 on CI, 0 locally
- **Reporter**: HTML, JSON, JUnit
- **Screenshots**: On failure only
- **Videos**: On failure only

### Environment Variables
```bash
# For CI environments
CI=true                    # Enables retries and different timeouts
PLAYWRIGHT_HEADLESS=true   # Force headless mode
```

## 📊 Test Reports

### HTML Report
After running tests, view the detailed HTML report:
```bash
npm run test:e2e:report
```

### CI Reports
- **GitHub Actions**: Automatic test execution on push/PR
- **Artifacts**: Test results, screenshots, videos uploaded
- **Multi-browser**: Tests run on Chrome, Firefox, Safari

## 🐛 Debugging

### Visual Debugging
1. Run with UI mode: `npm run test:e2e:ui`
2. Click on failed tests to see step-by-step execution
3. View screenshots and videos of failures

### Code Debugging
1. Use debug mode: `npm run test:e2e:debug`
2. Set breakpoints in VS Code
3. Step through test execution

### Common Issues

#### Test Timeouts
```typescript
// Increase timeout for slow operations
await page.waitForSelector('[data-testid="slow-element"]', { timeout: 10000 });
```

#### Flaky Tests
```typescript
// Wait for stable state
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500); // Allow animations to complete
```

#### Element Not Found
```typescript
// Use more specific selectors
await page.getByTestId('specific-button').click();
// Instead of
await page.locator('button').first().click();
```

## 🧪 Test Data

### Mock Data
Tests use mock data defined in `test-utils.ts`:
- User accounts (ADMIN, SUPER_ADMIN)
- Sample slots and schedules
- API response templates

### Test Isolation
Each test is isolated:
- Fresh page context
- Mocked API responses
- No shared state between tests

## 📝 Adding New Tests

### 1. Create Test File
```typescript
// e2e/new_feature.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New Feature', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    // Test implementation
  });
});
```

### 2. Add Test IDs to Components
```tsx
// Add data-testid to interactive elements
<button data-testid="new-feature-button">Click Me</button>
<input data-testid="new-feature-input" />
```

### 3. Update Documentation
- Add test coverage to this file
- Update `e2e/README.md` with new scenarios

## 🚀 CI/CD Integration

### GitHub Actions
Tests run automatically on:
- Push to `main` or `develop`
- Pull requests to `main`

### Local CI Simulation
```bash
# Run tests as they would in CI
CI=true npx playwright test
```

### Pre-commit Hooks (Optional)
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit hook
echo "npx playwright test" > .husky/pre-commit
chmod +x .husky/pre-commit
```

## 📈 Performance

### Test Execution Time
- **Local**: ~2-5 minutes for full suite
- **CI**: ~5-10 minutes (includes setup)
- **Individual tests**: ~5-30 seconds

### Optimization Tips
- Use `page.waitForLoadState('networkidle')` for stability
- Mock heavy API calls
- Run tests in parallel when possible
- Use `test.describe.serial()` for dependent tests

## 🔍 Monitoring

### Test Metrics
- **Pass Rate**: Target 95%+
- **Flakiness**: <5% of tests
- **Coverage**: All critical user flows

### Maintenance
- Review and update tests monthly
- Remove obsolete tests
- Update mock data as API evolves
- Monitor CI performance

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Guide](https://playwright.dev/docs/ci)
- [Debugging Guide](https://playwright.dev/docs/debug)

## 🆘 Support

For test-related issues:
1. Check the [E2E README](./e2e/README.md)
2. Review test logs and screenshots
3. Run tests locally to reproduce
4. Check CI artifacts for detailed error information
