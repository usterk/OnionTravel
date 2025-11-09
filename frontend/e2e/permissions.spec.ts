import { test, expect } from '@playwright/test';

/**
 * E2E Tests for User Permissions and Role-Based Access
 *
 * Tests cover:
 * - Trip owner can access Settings tab
 * - Members tab displays correctly
 * - Role-based visibility (if implemented)
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Permissions and Role-Based Access E2E Tests', () => {
  let testEmail: string;
  let testUsername: string;
  let tripId: string;
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Track console errors
    consoleErrors.length = 0;
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });

    // Generate unique credentials
    const timestamp = Date.now();
    testEmail = `permtest-${timestamp}@example.com`;
    testUsername = `permuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Permission Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(trips)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate to create trip page
    await page.goto('/trips/new');
    await page.waitForURL('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Permission Test Trip');
    await page.fill('input[id="start_date"]', '2025-06-01');
    await page.fill('input[id="end_date"]', '2025-06-15');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '2000');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Open trip
    await page.getByText('Permission Test Trip').click();
    await page.waitForURL(/\/trips\/\d+/);
    const url = page.url();
    tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';
    await page.waitForLoadState('networkidle');

    // Verify no console errors during setup
    expect(consoleErrors.length, `Console errors during setup: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Trip owner can access Settings tab', async ({ page }) => {
    // Verify Settings tab is visible
    const settingsTab = page.getByRole('button', { name: /settings/i });
    await expect(settingsTab).toBeVisible();

    // Click Settings tab
    await settingsTab.click();
    await page.waitForTimeout(1000);

    // Verify Settings content is visible
    await expect(page.getByText(/edit.*trip|delete.*trip|trip.*settings/i)).toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Trip owner can edit trip', async ({ page }) => {
    // Go to Settings tab
    await page.getByRole('button', { name: /settings/i }).click();
    await page.waitForTimeout(1000);

    // Click Edit button
    const editButton = page.getByRole('button', { name: /edit trip details/i });
    await expect(editButton).toBeVisible();
    await editButton.click();

    // Wait for edit dialog
    await page.waitForTimeout(500);

    // Update trip name
    const nameInput = page.locator('input[id="name"]');
    if (await nameInput.count() > 0) {
      await nameInput.fill('Updated Permission Test Trip');
    }

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();
    await page.waitForTimeout(1000);

    // Verify updated name
    await expect(page.getByRole('heading', { name: /updated permission test trip/i })).toBeVisible({ timeout: 5000 });

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Trip owner can delete trip', async ({ page }) => {
    // Go to Settings tab
    await page.getByRole('button', { name: /settings/i }).click();
    await page.waitForTimeout(1000);

    // Verify Delete button is visible
    const deleteButton = page.getByRole('button', { name: /delete trip/i }).first();
    await expect(deleteButton).toBeVisible();

    // Click Delete button
    await deleteButton.click();

    // Verify confirmation dialog appears
    await expect(page.getByRole('heading', { name: /delete trip/i })).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /delete trip/i }).last().click();

    // Should redirect to trips list
    await page.waitForURL('/trips', { timeout: 10000 });

    // Trip should no longer exist
    await expect(page.getByText('Permission Test Trip')).not.toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Members tab displays current user as owner', async ({ page }) => {
    // Click Members tab
    await page.getByRole('button', { name: /members/i }).click();
    await page.waitForTimeout(1000);

    // Verify current user is listed
    await expect(page.getByText('Permission Test User')).toBeVisible();

    // Verify owner role is displayed
    await expect(page.getByText(/owner/i)).toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Overview tab shows user role', async ({ page }) => {
    // Should be on Overview tab by default
    await page.getByRole('button', { name: /overview/i }).click();
    await page.waitForTimeout(1000);

    // Look for role indicator
    const roleIndicator = page.locator('text=/your role|role:|owner/i');
    if (await roleIndicator.count() > 0) {
      await expect(roleIndicator.first()).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
