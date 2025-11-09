import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Category Management E2E Tests', () => {
  let testEmail: string;
  let testUsername: string;
  let tripId: string;

  test.beforeEach(async ({ page }) => {
    // Generate unique credentials for each test run
    const timestamp = Date.now();
    testEmail = `cattest-${timestamp}@example.com`;
    testUsername = `testuser${timestamp}`;

    // Register and login
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/trips/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Create a trip for category testing
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');
    await page.fill('input[id="name"]', 'Category Test Trip');
    await page.fill('input[id="start_date"]', '2025-07-01');
    await page.fill('input[id="end_date"]', '2025-07-15');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '5000');
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Open trip details
    await page.getByText('Category Test Trip').click();
    await page.waitForURL(/\/trips\/(\d+)/, { timeout: 10000 });

    // Extract trip ID from URL
    const url = page.url();
    const match = url.match(/\/trips\/(\d+)/);
    tripId = match ? match[1] : '';

    await page.waitForLoadState('networkidle');
  });

  test('Default categories are created when trip is created', async ({ page }) => {
    // Click on Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000); // Wait for categories to load

    // Verify default categories exist
    const expectedCategories = [
      'Accommodation',
      'Transportation',
      'Food & Dining',
      'Activities',
      'Shopping',
      'Health & Medical',
      'Entertainment',
      'Other'
    ];

    for (const categoryName of expectedCategories) {
      await expect(page.getByText(categoryName)).toBeVisible({ timeout: 5000 });
    }

    // Verify total budget percentage is 100%
    await expect(page.getByText(/Total:.*100/)).toBeVisible();
  });

  test('User can view category list for a trip', async ({ page }) => {
    // Navigate to Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Verify category list is displayed
    await expect(page.getByText('Budget Categories')).toBeVisible();

    // Verify at least one category is visible
    await expect(page.getByText('Accommodation')).toBeVisible();

    // Verify budget percentages are displayed
    await expect(page.getByText('35.0%')).toBeVisible(); // Accommodation default
    await expect(page.getByText('20.0%')).toBeVisible(); // Transportation default
  });

  test('Category colors display correctly', async ({ page }) => {
    // Navigate to Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Check that color indicators are present (div with background-color style)
    const colorIndicators = page.locator('div[style*="background-color"]');
    const count = await colorIndicators.count();

    // Should have at least 8 color indicators (one for each default category)
    expect(count).toBeGreaterThanOrEqual(8);

    // Verify specific colors for default categories
    const accommodationColor = page.locator('div[style*="rgb(59, 130, 246)"]'); // #3B82F6
    await expect(accommodationColor).toBeVisible();
  });

  test('Budget percentages sum validation works', async ({ page }) => {
    // Navigate to Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Verify total shows 100%
    const totalText = await page.getByText(/Total:/).textContent();
    expect(totalText).toContain('100');
  });

  test('Default category markers are visible', async ({ page }) => {
    // Navigate to Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Verify "Default" badges are visible
    const defaultBadges = page.getByText('Default');
    const count = await defaultBadges.count();

    // All 8 default categories should have "Default" badge
    expect(count).toBe(8);
  });
});
