import { test, expect } from '@playwright/test';

test.describe('Role-Based Access Control (RBAC)', () => {
  test.describe('ADMIN Role', () => {
    test.beforeEach(async ({ page }) => {
      // Mock ADMIN authentication
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '1',
              email: 'admin@example.com',
              role: 'ADMIN',
              display_name: 'Admin User'
            }
          })
        });
      });

      await page.goto('/');
    });

    test('should access admin routes', async ({ page }) => {
      // Should be able to access dashboard
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
      
      // Should be able to access slots management
      await page.goto('/slots');
      await expect(page.getByTestId('slots-management')).toBeVisible();
      
      // Should be able to access schedule generation
      await page.goto('/mwf-scheduler');
      await expect(page.getByTestId('mwf-scheduler')).toBeVisible();
      
      // Should be able to access schedule history
      await page.goto('/schedule-history');
      await expect(page.getByTestId('schedule-history')).toBeVisible();
    });

    test('should NOT access super admin routes', async ({ page }) => {
      // Should NOT be able to access super admin routes
      await page.goto('/super-admin');
      await expect(page.getByTestId('access-denied')).toBeVisible();
      await expect(page.getByText('접근 권한이 없습니다')).toBeVisible();
      
      // Should NOT be able to access user management
      await page.goto('/admin/users');
      await expect(page.getByTestId('access-denied')).toBeVisible();
      
      // Should NOT be able to access system settings
      await page.goto('/admin/settings');
      await expect(page.getByTestId('access-denied')).toBeVisible();
    });

    test('should see admin-specific navigation', async ({ page }) => {
      // Should see admin navigation items
      await expect(page.getByTestId('nav-slots')).toBeVisible();
      await expect(page.getByTestId('nav-scheduler')).toBeVisible();
      await expect(page.getByTestId('nav-history')).toBeVisible();
      
      // Should NOT see super admin navigation items
      await expect(page.getByTestId('nav-super-admin')).not.toBeVisible();
      await expect(page.getByTestId('nav-user-management')).not.toBeVisible();
      await expect(page.getByTestId('nav-system-settings')).not.toBeVisible();
    });

    test('should manage own slots only', async ({ page }) => {
      // Mock slots API for ADMIN
      await page.route('**/api/slots', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'slot-1',
              name: 'Admin Slot',
              description: 'Admin created slot',
              dayGroup: 'MWF',
              createdBy: '1', // Same as current user
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            }
          ])
        });
      });

      await page.goto('/slots');
      
      // Should see own slots
      await expect(page.getByTestId('slot-item-slot-1')).toBeVisible();
      await expect(page.getByText('Admin Slot')).toBeVisible();
      
      // Should be able to edit own slots
      await expect(page.getByTestId('edit-slot-button-slot-1')).toBeVisible();
      await expect(page.getByTestId('delete-slot-button-slot-1')).toBeVisible();
    });
  });

  test.describe('SUPER_ADMIN Role', () => {
    test.beforeEach(async ({ page }) => {
      // Mock SUPER_ADMIN authentication
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '2',
              email: 'superadmin@example.com',
              role: 'SUPER_ADMIN',
              display_name: 'Super Admin User'
            }
          })
        });
      });

      await page.goto('/');
    });

    test('should access all routes including super admin', async ({ page }) => {
      // Should be able to access all admin routes
      await page.goto('/slots');
      await expect(page.getByTestId('slots-management')).toBeVisible();
      
      await page.goto('/mwf-scheduler');
      await expect(page.getByTestId('mwf-scheduler')).toBeVisible();
      
      // Should be able to access super admin routes
      await page.goto('/super-admin');
      await expect(page.getByTestId('super-admin-dashboard')).toBeVisible();
      
      await page.goto('/admin/users');
      await expect(page.getByTestId('user-management')).toBeVisible();
      
      await page.goto('/admin/settings');
      await expect(page.getByTestId('system-settings')).toBeVisible();
    });

    test('should see all navigation items', async ({ page }) => {
      // Should see all navigation items
      await expect(page.getByTestId('nav-slots')).toBeVisible();
      await expect(page.getByTestId('nav-scheduler')).toBeVisible();
      await expect(page.getByTestId('nav-history')).toBeVisible();
      await expect(page.getByTestId('nav-super-admin')).toBeVisible();
      await expect(page.getByTestId('nav-user-management')).toBeVisible();
      await expect(page.getByTestId('nav-system-settings')).toBeVisible();
    });

    test('should manage all users slots', async ({ page }) => {
      // Mock slots API for SUPER_ADMIN (shows all slots)
      await page.route('**/api/slots', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'slot-1',
              name: 'Admin Slot',
              description: 'Admin created slot',
              dayGroup: 'MWF',
              createdBy: '1',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z'
            },
            {
              id: 'slot-2',
              name: 'Super Admin Slot',
              description: 'Super admin created slot',
              dayGroup: 'TT',
              createdBy: '2',
              createdAt: '2024-01-02T00:00:00Z',
              updatedAt: '2024-01-02T00:00:00Z'
            }
          ])
        });
      });

      await page.goto('/slots');
      
      // Should see all slots
      await expect(page.getByTestId('slot-item-slot-1')).toBeVisible();
      await expect(page.getByTestId('slot-item-slot-2')).toBeVisible();
      
      // Should be able to edit/delete any slot
      await expect(page.getByTestId('edit-slot-button-slot-1')).toBeVisible();
      await expect(page.getByTestId('delete-slot-button-slot-1')).toBeVisible();
      await expect(page.getByTestId('edit-slot-button-slot-2')).toBeVisible();
      await expect(page.getByTestId('delete-slot-button-slot-2')).toBeVisible();
    });

    test('should manage users', async ({ page }) => {
      // Mock users API
      await page.route('**/api/users', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              email: 'admin@example.com',
              role: 'ADMIN',
              display_name: 'Admin User',
              createdAt: '2024-01-01T00:00:00Z',
              lastLogin: '2024-01-01T10:00:00Z'
            },
            {
              id: '3',
              email: 'user@example.com',
              role: 'USER',
              display_name: 'Regular User',
              createdAt: '2024-01-02T00:00:00Z',
              lastLogin: '2024-01-02T10:00:00Z'
            }
          ])
        });
      });

      await page.goto('/admin/users');
      
      // Should see user management interface
      await expect(page.getByTestId('users-table')).toBeVisible();
      await expect(page.getByTestId('create-user-button')).toBeVisible();
      
      // Should see all users
      await expect(page.getByText('Admin User')).toBeVisible();
      await expect(page.getByText('Regular User')).toBeVisible();
      
      // Should be able to edit user roles
      await expect(page.getByTestId('edit-user-button-1')).toBeVisible();
      await expect(page.getByTestId('edit-user-button-3')).toBeVisible();
    });

    test('should manage system settings', async ({ page }) => {
      // Mock system settings API
      await page.route('**/api/admin/settings', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            systemName: 'Schedule System',
            maxSlotsPerUser: 10,
            allowPublicSlots: false,
            maintenanceMode: false
          })
        });
      });

      await page.goto('/admin/settings');
      
      // Should see system settings interface
      await expect(page.getByTestId('system-settings-form')).toBeVisible();
      await expect(page.getByTestId('system-name-input')).toBeVisible();
      await expect(page.getByTestId('max-slots-input')).toBeVisible();
      await expect(page.getByTestId('public-slots-toggle')).toBeVisible();
      await expect(page.getByTestId('maintenance-toggle')).toBeVisible();
      
      // Should be able to update settings
      await page.getByTestId('system-name-input').fill('Updated System Name');
      await page.getByTestId('save-settings-button').click();
      
      await expect(page.getByText('설정이 저장되었습니다')).toBeVisible();
    });
  });

  test.describe('Unauthenticated User', () => {
    test.beforeEach(async ({ page }) => {
      // Mock unauthenticated state
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Unauthorized'
          })
        });
      });

      await page.goto('/');
    });

    test('should redirect to login for all protected routes', async ({ page }) => {
      const protectedRoutes = [
        '/dashboard',
        '/slots',
        '/mwf-scheduler',
        '/tt-scheduler',
        '/schedule-history',
        '/super-admin',
        '/admin/users',
        '/admin/settings'
      ];

      for (const route of protectedRoutes) {
        await page.goto(route);
        await expect(page).toHaveURL(/.*login/);
        await expect(page.getByTestId('login-form')).toBeVisible();
      }
    });

    test('should not access any admin functionality', async ({ page }) => {
      await page.goto('/login');
      
      // Should not see admin navigation
      await expect(page.getByTestId('nav-slots')).not.toBeVisible();
      await expect(page.getByTestId('nav-scheduler')).not.toBeVisible();
      await expect(page.getByTestId('nav-history')).not.toBeVisible();
    });
  });

  test.describe('Role Transition', () => {
    test('should update UI when role changes', async ({ page }) => {
      // Start as ADMIN
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '1',
              email: 'admin@example.com',
              role: 'ADMIN',
              display_name: 'Admin User'
            }
          })
        });
      });

      await page.goto('/dashboard');
      await expect(page.getByTestId('admin-dashboard')).toBeVisible();
      
      // Role changed to SUPER_ADMIN
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '1',
              email: 'admin@example.com',
              role: 'SUPER_ADMIN',
              display_name: 'Super Admin User'
            }
          })
        });
      });

      await page.reload();
      
      // Should now see super admin navigation
      await expect(page.getByTestId('nav-super-admin')).toBeVisible();
      await expect(page.getByTestId('nav-user-management')).toBeVisible();
    });

    test('should handle role downgrade gracefully', async ({ page }) => {
      // Start as SUPER_ADMIN
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '2',
              email: 'superadmin@example.com',
              role: 'SUPER_ADMIN',
              display_name: 'Super Admin User'
            }
          })
        });
      });

      await page.goto('/super-admin');
      await expect(page.getByTestId('super-admin-dashboard')).toBeVisible();
      
      // Role downgraded to ADMIN
      await page.route('**/auth/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: '2',
              email: 'superadmin@example.com',
              role: 'ADMIN',
              display_name: 'Admin User'
            }
          })
        });
      });

      await page.reload();
      
      // Should redirect away from super admin routes
      await expect(page.getByTestId('access-denied')).toBeVisible();
    });
  });
});
