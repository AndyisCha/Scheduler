# E2E Tests

This directory contains end-to-end tests for the Schedule Management System using Playwright.

## Test Coverage

### 🔐 Authentication (`auth_login.spec.ts`)
- Sign-in success/failure paths
- Session management
- Logout functionality
- Session expiration handling

### 📋 Slots Management (`slots_crud.spec.ts`)
- Create new slots
- Edit existing slots
- Delete slots with confirmation
- Validation error handling
- Navigation to slot editor

### ⚡ Schedule Generation (`schedule_generate.spec.ts`)
- MWF schedule generation
- TT schedule generation
- Schedule saving and snapshots
- Export functionality (CSV, PDF, Excel)
- Error handling and validation
- Metrics and warnings display

### 📊 History & Comparison (`history_compare.spec.ts`)
- Load schedule history
- Select schedules for comparison
- Side-by-side comparison view
- Export comparison reports
- Filter by date range and type
- Schedule restoration

### 🛡️ Role-Based Access Control (`rbac_guard.spec.ts`)
- ADMIN role permissions
- SUPER_ADMIN role permissions
- Unauthenticated user restrictions
- Role transition handling
- Navigation visibility based on roles

## Running Tests

### Prerequisites
1. Install dependencies: `npm install`
2. Install Playwright browsers: `npx playwright install`
3. Start the development server: `npm run dev`

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run tests with UI mode
npm run test:e2e:ui

# Run tests in headed mode (visible browser)
npm run test:e2e:headed

# Debug tests
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

### Running Specific Tests

```bash
# Run only authentication tests
npx playwright test auth_login.spec.ts

# Run tests matching a pattern
npx playwright test --grep "should login successfully"

# Run tests in specific browser
npx playwright test --project=chromium
```

## Test Data

Tests use mock data defined in `test-utils.ts`:
- **TestData.admin**: ADMIN role user
- **TestData.superAdmin**: SUPER_ADMIN role user  
- **TestData.sampleSlot**: Sample slot configuration
- **TestData.sampleSchedule**: Sample schedule data

## Test Utilities

The `TestUtils` class provides helper methods:
- `mockAuth()`: Mock user authentication
- `mockUnauthenticated()`: Mock unauthenticated state
- `mockApiError()`: Mock API error responses
- `waitForLoading()`: Wait for loading states
- `expectToast()`: Verify toast notifications
- `fillForm()`: Fill form fields
- `login()` / `logout()`: Authentication helpers

## CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests to `main`

The GitHub Actions workflow:
1. Installs dependencies
2. Builds the application
3. Installs Playwright browsers
4. Runs tests in headless mode
5. Uploads test reports and screenshots

## Test Reports

After running tests, reports are generated in:
- `playwright-report/`: HTML report with detailed results
- `test-results/`: JSON and XML test results
- Screenshots and videos on test failures

## Best Practices

### Test IDs
All interactive elements should have `data-testid` attributes:
```tsx
<button data-testid="login-button">Login</button>
<input data-testid="email-input" />
```

### Page Object Pattern
For complex pages, consider using the Page Object pattern:
```typescript
class LoginPage {
  constructor(private page: Page) {}
  
  async login(email: string, password: string) {
    await this.page.getByTestId('email-input').fill(email);
    await this.page.getByTestId('password-input').fill(password);
    await this.page.getByTestId('login-button').click();
  }
}
```

### Mocking
Use Playwright's `page.route()` for API mocking:
```typescript
await page.route('**/api/auth/login', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ user: mockUser })
  });
});
```

### Assertions
Use Playwright's built-in assertions:
```typescript
await expect(page.getByTestId('success-message')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
```

## Debugging

### Visual Debugging
```bash
# Run with UI mode for visual debugging
npm run test:e2e:ui
```

### Debug Mode
```bash
# Run in debug mode with browser dev tools
npm run test:e2e:debug
```

### Screenshots
Screenshots are automatically taken on test failures and saved to `test-results/`.

### Videos
Videos are recorded for failed tests and saved to `test-results/`.

## Maintenance

### Adding New Tests
1. Create new test file in `e2e/` directory
2. Follow naming convention: `feature_name.spec.ts`
3. Add test IDs to relevant UI components
4. Update this README with new test coverage

### Updating Test Data
Update mock data in `test-utils.ts` as the application evolves.

### CI Troubleshooting
- Check GitHub Actions logs for detailed error information
- Download test artifacts to view screenshots and videos
- Ensure all required test IDs are present in the UI
