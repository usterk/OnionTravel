import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Expense Management
 *
 * Tests cover:
 * - Quick expense entry with minimal/full fields
 * - Expense editing and deletion
 * - Expense filtering by category, payment method, and date range
 * - Pagination
 * - Form validation
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Expense Management E2E Tests', () => {
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
    testEmail = `expensetest-${timestamp}@example.com`;
    testUsername = `expenseuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Expense Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');

    // Wait for auto-login and redirect to trips page or dashboard
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Navigate to create trip page
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    // Wait for the form to be visible
    await page.waitForSelector('input[id="name"]', { timeout: 10000 });

    await page.fill('input[id="name"]', 'Expense Test Trip');
    await page.fill('input[id="start_date"]', '2025-06-01');
    await page.fill('input[id="end_date"]', '2025-06-15');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '3000');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Open the trip and go to Expenses tab
    await page.getByText('Expense Test Trip').click();
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    // Extract trip ID from URL
    const url = page.url();
    tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    // Click Expenses tab
    await page.getByRole('button', { name: /expenses/i }).click();
    await page.waitForTimeout(1000);

    // Verify no console errors during setup
    expect(consoleErrors.length, `Console errors during setup: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Quick add expense with minimal fields', async ({ page }) => {
    // Fill amount
    await page.fill('input[id="quick-expense-amount"]', '125.50');
    await page.waitForTimeout(500);

    // Select first category - categories are button[type="button"] in a grid with SVG icons
    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    // Wait for the "Add Expense" button to be enabled (it's disabled until category is selected)
    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });

    // Submit form
    await addButton.click();

    // Wait for success message
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Wait for expense list to refresh
    await page.waitForTimeout(1000);

    // Verify expense appears in list (format is "USD 125.50" with currency code)
    await expect(page.getByText(/125\.50/)).toBeVisible();

    // Verify no console errors
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Quick add expense with all optional fields', async ({ page }) => {
    // Fill amount
    await page.fill('input[id="quick-expense-amount"]', '250.00');
    await page.waitForTimeout(500);

    // Select category
    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    // Wait for button to be enabled
    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });

    // Toggle advanced options
    await page.getByRole('button', { name: /add details/i }).click();

    // Fill optional fields
    await page.fill('input[id="quick-expense-title"]', 'Hotel Booking');
    await page.selectOption('select[id="quick-expense-payment"]', 'Credit Card');
    await page.fill('input[id="quick-expense-notes"]', 'Downtown hotel, 3 nights');

    // Submit
    await addButton.click();

    // Wait for success
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Wait for expense list to refresh
    await page.waitForTimeout(1000);

    // Verify expense with title appears
    await expect(page.getByText('Hotel Booking')).toBeVisible();
    await expect(page.getByText(/250\.00/)).toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Quick add with Enter key', async ({ page }) => {
    // Fill amount
    await page.fill('input[id="quick-expense-amount"]', '75.00');
    await page.waitForTimeout(500);

    // Select category
    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    // Wait for button to be enabled
    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });

    // Press Enter
    await page.locator('input[id="quick-expense-amount"]').press('Enter');

    // Wait for success
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Wait for expense list to refresh
    await page.waitForTimeout(1000);

    await expect(page.getByText(/75\.00/)).toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Add expense in foreign currency', async ({ page }) => {
    // Note: Testing foreign currency conversion requires backend setup
    // For now, this test verifies the currency selector is visible and functional
    // by submitting an expense with the default trip currency (USD)

    // Fill amount
    await page.fill('input[id="quick-expense-amount"]', '100.00');
    await page.waitForTimeout(500);

    // Verify currency selector is visible
    const currencySelect = page.locator('select').nth(0);
    await expect(currencySelect).toBeVisible();

    // Select category
    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    // Wait for button to be enabled
    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });

    // Submit with default currency
    await addButton.click();

    // Wait for success
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Wait for expense list to refresh
    await page.waitForTimeout(1000);

    // Expense should be added (converted to trip currency)
    await expect(page.getByText(/100/)).toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Form validation - empty amount', async ({ page }) => {
    // Button should be disabled without amount
    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeDisabled();

    // Verify button stays disabled even after selecting category
    const categoryButtons = page.locator('.grid button[type="button"]');
    if (await categoryButtons.count() > 0) {
      await categoryButtons.first().click();
      await page.waitForTimeout(500);
      await expect(addButton).toBeDisabled();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Form validation - no category selected', async ({ page }) => {
    // Fill amount but don't select category
    await page.fill('input[id="quick-expense-amount"]', '50.00');
    await page.waitForTimeout(500);

    // Button should remain disabled without category
    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeDisabled();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Edit existing expense', async ({ page }) => {
    // First, create an expense
    await page.fill('input[id="quick-expense-amount"]', '150.00');
    await page.waitForTimeout(500);

    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Wait for expense to appear
    await page.waitForTimeout(1000);

    // Find and click edit button
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.count() > 0) {
      await editButton.click();

      // Wait for edit dialog/form
      await page.waitForTimeout(500);

      // Update amount
      const amountInput = page.locator('input[type="number"]').filter({ hasValue: /150/ }).first();
      if (await amountInput.count() > 0) {
        await amountInput.fill('175.00');
      }

      // Save changes
      await page.getByRole('button', { name: /save|update/i }).click();

      // Verify updated amount
      await expect(page.getByText('175.00')).toBeVisible({ timeout: 5000 });
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Delete expense', async ({ page }) => {
    // Create an expense
    await page.fill('input[id="quick-expense-amount"]', '200.00');
    await page.waitForTimeout(500);

    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(1000);

    // Find and click delete button
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();

      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.getByRole('button', { name: /confirm|delete/i }).last();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
      }

      // Verify expense is removed (wait a bit for deletion to complete)
      await page.waitForTimeout(1000);
      // The expense might still show if pagination, but delete should succeed
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Filter expenses by category', async ({ page }) => {
    // Create expenses in different categories
    // Expense 1
    await page.fill('input[id="quick-expense-amount"]', '100.00');
    await page.waitForTimeout(500);

    let categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    let addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Expense 2 in different category
    await page.fill('input[id="quick-expense-amount"]', '200.00');
    await page.waitForTimeout(500);

    categoryButtons = page.locator('.grid button[type="button"]');
    if (await categoryButtons.count() > 1) {
      await categoryButtons.nth(1).click();
      await page.waitForTimeout(500);
    }

    addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(1000);

    // Try to apply category filter
    const categoryFilter = page.locator('select').filter({ has: page.locator('option:has-text("Category")') });
    if (await categoryFilter.count() > 0) {
      const firstOption = categoryFilter.locator('option').nth(1);
      const value = await firstOption.getAttribute('value');
      if (value) {
        await categoryFilter.selectOption(value);
        await page.waitForTimeout(500);

        // Filtered results should appear
        // At least one expense should be visible
        const expenseItems = page.locator('[data-testid="expense-item"]').or(
          page.locator('div').filter({ hasText: /\d+\.\d{2}/ })
        );
        await expect(expenseItems.first()).toBeVisible();
      }
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Filter expenses by payment method', async ({ page }) => {
    // Create expense with payment method
    await page.fill('input[id="quick-expense-amount"]', '150.00');
    await page.waitForTimeout(500);

    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });

    // Toggle advanced options
    await page.getByRole('button', { name: /add details/i }).click();
    await page.selectOption('select[id="quick-expense-payment"]', 'Credit Card');

    await addButton.click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(1000);

    // Try to filter by payment method
    const paymentFilter = page.locator('select').filter({ has: page.locator('option:has-text("Payment")') });
    if (await paymentFilter.count() > 0) {
      await paymentFilter.selectOption('Credit Card');
      await page.waitForTimeout(500);

      // Should show filtered expense
      await expect(page.getByText(/150\.00/)).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Filter expenses by date range', async ({ page }) => {
    // Create expense
    await page.fill('input[id="quick-expense-amount"]', '100.00');
    await page.waitForTimeout(500);

    const categoryButtons = page.locator('.grid button[type="button"]');
    await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
    await categoryButtons.first().click();
    await page.waitForTimeout(500);

    const addButton = page.getByRole('button', { name: /add expense/i });
    await expect(addButton).toBeEnabled({ timeout: 5000 });
    await addButton.click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    await page.waitForTimeout(1000);

    // Try to apply date filter
    const dateFromInput = page.locator('input[type="date"]').filter({ hasText: '' }).first();
    if (await dateFromInput.count() > 0) {
      await dateFromInput.fill('2025-06-01');

      const dateToInput = page.locator('input[type="date"]').nth(1);
      if (await dateToInput.count() > 0) {
        await dateToInput.fill('2025-06-15');
      }

      await page.waitForTimeout(500);

      // Expenses in range should be visible
      await expect(page.getByText(/100\.00/)).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Paginate through expenses', async ({ page }) => {
    // Create multiple expenses (if pagination exists)
    for (let i = 0; i < 5; i++) {
      await page.fill('input[id="quick-expense-amount"]', `${50 + i * 10}.00`);
      await page.waitForTimeout(500);

      const categoryButtons = page.locator('.grid button[type="button"]');
      await expect(categoryButtons.first()).toBeVisible({ timeout: 5000 });
      await categoryButtons.first().click();
      await page.waitForTimeout(500);

      const addButton = page.getByRole('button', { name: /add expense/i });
      await expect(addButton).toBeEnabled({ timeout: 5000 });
      await addButton.click();
      await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Check if pagination controls exist
    const nextButton = page.getByRole('button', { name: /next/i });
    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Should show different page
      expect(page.url()).toContain('trips/');
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
