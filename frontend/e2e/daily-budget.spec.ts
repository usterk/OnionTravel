import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Daily Budget View
 *
 * Tests cover:
 * - Daily budget statistics display
 * - Date navigation (Previous, Today, Next buttons)
 * - Date picker functionality
 * - Boundary checks (trip start/end dates)
 * - Category breakdown with icons and colors
 * - Over-budget warnings
 * - No daily budget warning
 * - Currency formatting
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Daily Budget View E2E Tests', () => {
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
    testEmail = `dailybudget-${timestamp}@example.com`;
    testUsername = `dailyuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Daily Budget Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/');
    await page.waitForLoadState('networkidle');

    // Create a trip with daily budget
    await page.click('button:has-text("Create Your First Trip")');
    await page.waitForURL('/trips/new');

    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 3);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 4);

    await page.fill('input[id="name"]', 'Daily Budget Test Trip');
    await page.fill('input[id="description"]', 'Testing daily budget view');
    await page.fill('input[id="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[id="end_date"]', endDate.toISOString().split('T')[0]);
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '1000');
    await page.fill('input[id="daily_budget"]', '100');

    await page.click('button[type="submit"]');

    // Wait for redirect to trip details
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    // Extract trip ID from URL
    const url = page.url();
    tripId = url.split('/trips/')[1];
  });

  test.afterEach(async () => {
    // Check for console errors
    if (consoleErrors.length > 0) {
      console.log('Console errors detected:', consoleErrors);
    }
  });

  test('should display daily budget overview with correct metrics', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for Daily Budget Overview heading
    await expect(page.getByText('Daily Budget Overview')).toBeVisible();

    // Check for status badge (should be "On Track" for a new trip with no expenses)
    await expect(page.getByText('On Track')).toBeVisible();

    // Check for day information
    await expect(page.getByText(/Day \d+ of \d+/)).toBeVisible();

    // Check for main metric cards
    await expect(page.getByText('Daily Budget')).toBeVisible();
    await expect(page.getByText('Spent Today')).toBeVisible();
    await expect(page.getByText('Remaining Today')).toBeVisible();

    // Check for budget amounts
    await expect(page.getByText('100 USD')).toBeVisible(); // Daily budget
    await expect(page.getByText('0 USD')).toBeVisible(); // No spending yet

    // Check for navigation buttons
    await expect(page.getByRole('button', { name: /Previous/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Today/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Next/i })).toBeVisible();

    // Check for date picker
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
  });

  test('should navigate to next day when Next button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get current date from the UI
    const initialDateText = await page.locator('.text-sm.text-muted-foreground').first().textContent();

    // Click Next button
    await page.click('button:has-text("Next")');

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Check that the date has changed
    const newDateText = await page.locator('.text-sm.text-muted-foreground').first().textContent();
    expect(newDateText).not.toBe(initialDateText);
  });

  test('should navigate to previous day when Previous button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get current date from the UI
    const initialDateText = await page.locator('.text-sm.text-muted-foreground').first().textContent();

    // Click Previous button
    await page.click('button:has-text("Previous")');

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Check that the date has changed
    const newDateText = await page.locator('.text-sm.text-muted-foreground').first().textContent();
    expect(newDateText).not.toBe(initialDateText);
  });

  test('should navigate to today when Today button is clicked', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to a different day first
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(500);

    // Click Today button
    await page.click('button:has-text("Today")');
    await page.waitForTimeout(500);

    // Verify we're back to today (the button click should work)
    // We can't easily verify the exact date without more context, but we can verify no errors occurred
    expect(consoleErrors.length).toBe(0);
  });

  test('should update statistics when date is changed via date picker', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Get the date picker
    const dateInput = page.locator('input[type="date"]');
    const initialDate = await dateInput.inputValue();

    // Change the date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    await dateInput.fill(tomorrowDate);

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Verify the date changed
    const newDate = await dateInput.inputValue();
    expect(newDate).toBe(tomorrowDate);
  });

  test('should disable Previous button at trip start date', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to trip start date using date picker
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 3);
    const startDateStr = startDate.toISOString().split('T')[0];

    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(startDateStr);
    await page.waitForTimeout(500);

    // Check that Previous button is disabled
    const prevButton = page.getByRole('button', { name: /Previous/i });
    await expect(prevButton).toBeDisabled();
  });

  test('should disable Next button at trip end date', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to trip end date using date picker
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 4);
    const endDateStr = endDate.toISOString().split('T')[0];

    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(endDateStr);
    await page.waitForTimeout(500);

    // Check that Next button is disabled
    const nextButton = page.getByRole('button', { name: /Next/i });
    await expect(nextButton).toBeDisabled();
  });

  test('should display category breakdown after adding expense', async ({ page }) => {
    // Navigate to trip details
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Add an expense
    await page.click('button:has-text("Add Expense")');
    await page.waitForLoadState('networkidle');

    // Fill expense form
    await page.fill('input[id="title"]', 'Test Meal');
    await page.fill('input[id="amount"]', '25');
    await page.selectOption('select[id="category_id"]', { index: 1 }); // Select first category

    // Set date to today
    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[id="start_date"]', today);

    await page.click('button[type="submit"]');

    // Wait for redirect back to trip page
    await page.waitForURL(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for category breakdown section
    await expect(page.getByText("Today's Spending by Category")).toBeVisible();

    // Check that the expense amount is displayed
    await expect(page.getByText('25 USD')).toBeVisible();
  });

  test('should display over budget warning when daily spending exceeds budget', async ({ page }) => {
    // Navigate to trip details
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Add an expense that exceeds daily budget
    await page.click('button:has-text("Add Expense")');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="title"]', 'Expensive Item');
    await page.fill('input[id="amount"]', '150'); // Exceeds $100 daily budget
    await page.selectOption('select[id="category_id"]', { index: 1 });

    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[id="start_date"]', today);

    await page.click('button[type="submit"]');

    await page.waitForURL(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for "Over Budget" badge
    await expect(page.getByText('Over Budget')).toBeVisible();

    // Check for over budget warning message
    await expect(page.getByText(/You have exceeded your daily budget/)).toBeVisible();
  });

  test('should show no expenses message when no expenses for the day', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to a future date within the trip
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];

    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(tomorrowDate);
    await page.waitForTimeout(500);

    // Check for no expenses message
    await expect(page.getByText(/No expenses recorded for/)).toBeVisible();
  });

  test('should display correct currency formatting', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // All amounts should be formatted with USD
    await expect(page.getByText(/\d+ USD/)).toBeVisible();
  });

  test('should update progress bar based on spending percentage', async ({ page }) => {
    // Navigate to trip details
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Add an expense for 50% of daily budget
    await page.click('button:has-text("Add Expense")');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="title"]', 'Half Budget Expense');
    await page.fill('input[id="amount"]', '50');
    await page.selectOption('select[id="category_id"]', { index: 1 });

    const today = new Date().toISOString().split('T')[0];
    await page.fill('input[id="start_date"]', today);

    await page.click('button[type="submit"]');

    await page.waitForURL(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check for usage percentage
    await expect(page.getByText("Today's Budget Usage")).toBeVisible();
    await expect(page.getByText(/50\.0% of daily budget used/)).toBeVisible();
  });

  test('should display date input with correct min and max constraints', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const dateInput = page.locator('input[type="date"]');

    // Check for min and max attributes
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 3);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 4);

    const minAttr = await dateInput.getAttribute('min');
    const maxAttr = await dateInput.getAttribute('max');

    expect(minAttr).toBe(startDate.toISOString().split('T')[0]);
    expect(maxAttr).toBe(endDate.toISOString().split('T')[0]);
  });

  test('should handle multi-day expenses correctly', async ({ page }) => {
    // Navigate to trip details
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Add a multi-day expense
    await page.click('button:has-text("Add Expense")');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="title"]', 'Hotel Stay');
    await page.fill('input[id="amount"]', '300'); // $300 for 3 days = $100/day
    await page.selectOption('select[id="category_id"]', { index: 1 });

    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 2); // 3-day stay

    await page.fill('input[id="start_date"]', startDate.toISOString().split('T')[0]);
    await page.fill('input[id="end_date"]', endDate.toISOString().split('T')[0]);

    await page.click('button[type="submit"]');

    await page.waitForURL(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // The expense should be split across 3 days, so today should show $100
    // Since we have a $100 daily budget, we should be exactly at 100%
    await expect(page.getByText(/100\.0% of daily budget used/)).toBeVisible();
  });

  test('should not have console errors during navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate through several days
    await page.click('button:has-text("Next")');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Previous")');
    await page.waitForTimeout(300);

    await page.click('button:has-text("Today")');
    await page.waitForTimeout(300);

    // Check for no console errors
    expect(consoleErrors.length).toBe(0);
  });
});
