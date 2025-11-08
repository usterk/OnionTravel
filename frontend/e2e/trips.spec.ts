import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Trip Management E2E Tests', () => {
  let testEmail: string;
  let testUsername: string;

  test.beforeEach(async ({ page }) => {
    // Generate unique credentials for each test run
    const timestamp = Date.now();
    testEmail = `triptest-${timestamp}@example.com`;
    testUsername = `testuser${timestamp}`;

    // Register (auto-logs in and redirects to /trips)
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');

    // Wait for auto-login and redirect to trips page
    await page.waitForURL(/\/trips/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');
  });

  test('User can view list of trips', async ({ page }) => {
    // Should show trips page header
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible({ timeout: 10000 });

    // Should show either empty state or trip list
    const emptyState = page.getByText('No trips yet');
    const newTripButton = page.getByRole('button', { name: /new trip/i });

    await expect(newTripButton).toBeVisible();
  });

  test('User can create a new trip', async ({ page }) => {
    // Navigate to create trip page
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new', { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Fill trip form
    await page.fill('input[id="name"]', 'Summer Vacation 2025');
    await page.fill('input[id="start_date"]', '2025-07-01');
    await page.fill('input[id="end_date"]', '2025-07-15');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '5000');

    // Submit form
    await page.getByRole('button', { name: /create trip/i }).click();

    // Wait for redirect
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify trip appears in list
    await expect(page.getByText('Summer Vacation 2025')).toBeVisible({ timeout: 10000 });
  });

  test('User can view trip details', async ({ page }) => {
    // Create a trip first
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');
    await page.fill('input[id="name"]', 'Test Trip Details');
    await page.fill('input[id="start_date"]', '2025-08-01');
    await page.fill('input[id="end_date"]', '2025-08-10');
    await page.selectOption('select[id="currency_code"]', 'EUR');
    await page.fill('input[id="total_budget"]', '3000');
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips');
    await page.waitForLoadState('networkidle');

    // Click on the trip to view details
    await page.getByText('Test Trip Details').click();
    await page.waitForURL(/\/trips\/\d+/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify trip details are visible
    await expect(page.getByRole('heading', { name: 'Test Trip Details' })).toBeVisible();
    await expect(page.getByText('10 days')).toBeVisible();
    await expect(page.getByText(/EUR.*3000/)).toBeVisible();
  });

  test('User can update trip information', async ({ page }) => {
    // Create a trip
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');
    await page.fill('input[id="name"]', 'Original Trip Name');
    await page.fill('input[id="start_date"]', '2025-09-01');
    await page.fill('input[id="end_date"]', '2025-09-10');
    await page.selectOption('select[id="currency_code"]', 'GBP');
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips');
    await page.waitForLoadState('networkidle');

    // Open trip details
    await page.getByText('Original Trip Name').click();
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    // Go to settings tab
    await page.getByRole('button', { name: 'Settings' }).click();

    // Click edit button
    await page.getByRole('button', { name: /edit trip details/i }).click();

    // Wait for dialog to open (check for unique dialog text)
    await expect(page.getByText('Update your trip details')).toBeVisible();

    // Update trip name
    await page.fill('input[id="name"]', 'Updated Trip Name');

    // Save changes
    await page.getByRole('button', { name: /save changes/i }).click();

    // Verify updated name is visible
    await expect(page.getByRole('heading', { name: 'Updated Trip Name' })).toBeVisible({ timeout: 10000 });
  });

  test('User can delete a trip', async ({ page }) => {
    // Create a trip
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');
    await page.fill('input[id="name"]', 'Trip To Delete');
    await page.fill('input[id="start_date"]', '2025-10-01');
    await page.fill('input[id="end_date"]', '2025-10-10');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips');
    await page.waitForLoadState('networkidle');

    // Verify trip exists
    await expect(page.getByText('Trip To Delete')).toBeVisible();

    // Open trip details
    await page.getByText('Trip To Delete').click();
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    // Go to settings tab
    await page.getByRole('button', { name: 'Settings' }).click();

    // Click delete button
    await page.getByRole('button', { name: /delete trip/i }).first().click();

    // Confirm deletion
    await expect(page.getByRole('heading', { name: 'Delete Trip' })).toBeVisible();
    await page.getByRole('button', { name: /delete trip/i }).last().click();

    // Should redirect to trips list
    await page.waitForURL('/trips', { timeout: 10000 });

    // Trip should no longer exist
    await expect(page.getByText('Trip To Delete')).not.toBeVisible();
  });

  test('User can view trip members', async ({ page }) => {
    // Create a trip
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');
    await page.fill('input[id="name"]', 'Members Test Trip');
    await page.fill('input[id="start_date"]', '2025-11-01');
    await page.fill('input[id="end_date"]', '2025-11-10');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips');
    await page.waitForLoadState('networkidle');

    // Open trip details
    await page.getByText('Members Test Trip').click();
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    // Click Members tab
    await page.getByRole('button', { name: /members/i }).click();

    // Verify current user is listed as owner
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByText('owner')).toBeVisible();
  });

  test('Navigation works correctly', async ({ page }) => {
    // Should be on trips page
    await expect(page.url()).toContain('/trips');

    // Click new trip
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');

    // Click back button
    await page.getByRole('button', { name: /back to trips/i }).click();
    await page.waitForURL('/trips');

    // Verify we're back on trips page
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();
  });

  test('Budget calculator works correctly', async ({ page }) => {
    // Navigate to create trip
    await page.getByRole('button', { name: /new trip/i }).first().click();
    await page.waitForURL('/trips/new');

    // Fill basic info
    await page.fill('input[id="name"]', 'Budget Test Trip');
    await page.fill('input[id="start_date"]', '2025-06-01');
    await page.fill('input[id="end_date"]', '2025-06-15'); // 15 days

    // Enter total budget
    await page.fill('input[id="total_budget"]', '15000');

    // Verify daily budget is calculated (15000 / 15 days = 1000)
    await expect(page.getByText(/daily budget.*1000/i)).toBeVisible({ timeout: 5000 });

    // Switch to daily budget mode
    await page.getByRole('button', { name: /daily budget/i }).click();
    await page.fill('input[id="daily_budget"]', '2000');

    // Verify total budget is calculated (2000 * 15 days = 30000)
    await expect(page.getByText(/total budget.*30000/i)).toBeVisible({ timeout: 5000 });
  });
});
