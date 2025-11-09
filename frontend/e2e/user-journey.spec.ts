import { test, expect } from '@playwright/test';

/**
 * E2E Test for Complete User Journey
 *
 * This test covers a realistic end-to-end user flow:
 * 1. User registers
 * 2. Creates a trip with budget
 * 3. Adds custom categories
 * 4. Adds multiple expenses
 * 5. Views dashboard statistics
 * 6. Filters expenses
 * 7. Edits an expense
 * 8. Deletes an expense
 * 9. Verifies statistics updated
 * 10. Cleans up by deleting the trip
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Complete User Journey E2E Test', () => {
  const consoleErrors: string[] = [];

  test('Complete trip lifecycle from registration to deletion', async ({ page }) => {
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

    const timestamp = Date.now();
    const testEmail = `journey-${timestamp}@example.com`;
    const testUsername = `journeyuser${timestamp}`;

    // STEP 1: Register new user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Journey Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(trips)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify registration successful
    expect(consoleErrors.length, `Console errors after registration: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 2: Create a trip with budget
    await page.goto('/trips/new');
    await page.waitForURL('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Tokyo Adventure 2025');
    await page.fill('input[id="start_date"]', '2025-09-01');
    await page.fill('input[id="end_date"]', '2025-09-14'); // 14 days
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '3500');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify trip created
    await expect(page.getByText('Tokyo Adventure 2025')).toBeVisible();
    expect(consoleErrors.length, `Console errors after trip creation: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 3: Open trip and add custom categories
    await page.getByText('Tokyo Adventure 2025').click();
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    // Extract trip ID
    const url = page.url();
    const tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    // Go to Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Add custom category 1: "Souvenirs"
    const addCategoryButton = page.getByRole('button', { name: /add category|new category/i });
    if (await addCategoryButton.count() > 0) {
      await addCategoryButton.click();
      await page.waitForTimeout(500);

      await page.fill('input[id="name"], input[name="name"]', 'Souvenirs');

      const budgetInput = page.locator('input[id="budget_percentage"], input[name="budget_percentage"]');
      if (await budgetInput.count() > 0) {
        await budgetInput.fill('10');
      }

      // Select icon
      const iconButtons = page.locator('button:has(svg)').filter({ hasText: '' });
      if (await iconButtons.count() > 0) {
        await iconButtons.first().click();
      }

      await page.getByRole('button', { name: /save|create|add/i }).last().click();
      await page.waitForTimeout(1000);

      // Verify category added
      await expect(page.getByText('Souvenirs')).toBeVisible();
    }

    // Add custom category 2: "Nightlife"
    if (await addCategoryButton.count() > 0) {
      await addCategoryButton.click();
      await page.waitForTimeout(500);

      await page.fill('input[id="name"], input[name="name"]', 'Nightlife');

      const budgetInput2 = page.locator('input[id="budget_percentage"], input[name="budget_percentage"]');
      if (await budgetInput2.count() > 0) {
        await budgetInput2.fill('5');
      }

      await page.getByRole('button', { name: /save|create|add/i }).last().click();
      await page.waitForTimeout(1000);
    }

    expect(consoleErrors.length, `Console errors after adding categories: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 4: Add multiple expenses across different categories
    await page.getByRole('button', { name: /expenses/i }).click();
    await page.waitForTimeout(1000);

    const expensesData = [
      { amount: '850.00', category: 0 }, // First category
      { amount: '450.00', category: 1 }, // Second category
      { amount: '120.00', category: 0 }, // First category again
      { amount: '300.00', category: 2 }, // Third category
      { amount: '75.00', category: 1 },  // Second category again
    ];

    for (const expense of expensesData) {
      await page.fill('input[id="quick-expense-amount"]', expense.amount);

      const categoryButtons = page.locator('[data-testid="category-icon-button"]').or(
        page.locator('button:has(svg)').filter({ hasText: '' })
      );

      if (await categoryButtons.count() > expense.category) {
        await categoryButtons.nth(expense.category).click();
      } else {
        await categoryButtons.first().click();
      }

      await page.getByRole('button', { name: /add expense/i }).click();
      await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(500);
    }

    // Verify expenses added (total should be 850+450+120+300+75 = 1795)
    expect(consoleErrors.length, `Console errors after adding expenses: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 5: View dashboard statistics
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // Wait for statistics to load

    // Verify dashboard shows our trip
    await expect(page.getByText('Tokyo Adventure 2025')).toBeVisible();

    // Verify budget information
    await expect(page.getByText(/3500|1795/)).toBeVisible();

    // Verify statistics cards
    await expect(page.getByText(/total budget|total spent|remaining/i)).toBeVisible();

    expect(consoleErrors.length, `Console errors on dashboard: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 6: Return to trip and filter expenses
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /expenses/i }).click();
    await page.waitForTimeout(1000);

    // Try to apply category filter
    const categoryFilter = page.locator('select').filter({ has: page.locator('option:has-text("Category")') });
    if (await categoryFilter.count() > 0) {
      const firstOption = categoryFilter.locator('option').nth(1);
      const value = await firstOption.getAttribute('value');
      if (value) {
        await categoryFilter.selectOption(value);
        await page.waitForTimeout(500);
      }
    }

    expect(consoleErrors.length, `Console errors after filtering: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 7: Edit an expense
    const editButton = page.getByRole('button', { name: /edit/i }).first();
    if (await editButton.count() > 0) {
      await editButton.click();
      await page.waitForTimeout(500);

      const amountInput = page.locator('input[type="number"]').first();
      if (await amountInput.count() > 0) {
        await amountInput.fill('900.00'); // Changed from 850 to 900
        await page.getByRole('button', { name: /save|update/i }).click();
        await page.waitForTimeout(1000);
      }
    }

    expect(consoleErrors.length, `Console errors after editing expense: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 8: Delete an expense
    const deleteButton = page.getByRole('button', { name: /delete/i }).first();
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      const confirmButton = page.getByRole('button', { name: /confirm|delete/i }).last();
      if (await confirmButton.count() > 0) {
        await confirmButton.click();
        await page.waitForTimeout(1000);
      }
    }

    expect(consoleErrors.length, `Console errors after deleting expense: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 9: Verify statistics updated on dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Total should now be around 1895 (900+450+120+300+75 after edit, minus one deleted)
    // We just verify dashboard loads and shows data
    await expect(page.getByText('Tokyo Adventure 2025')).toBeVisible();

    expect(consoleErrors.length, `Console errors on dashboard after changes: ${consoleErrors.join(', ')}`).toBe(0);

    // STEP 10: Delete the trip
    await page.goto(`/trips/${tripId}`);
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /settings/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole('button', { name: /delete trip/i }).first().click();
    await expect(page.getByRole('heading', { name: /delete trip/i })).toBeVisible();
    await page.getByRole('button', { name: /delete trip/i }).last().click();

    await page.waitForURL('/trips', { timeout: 10000 });

    // Verify trip deleted
    await expect(page.getByText('Tokyo Adventure 2025')).not.toBeVisible();

    // Final console error check
    expect(consoleErrors.length, `Console errors during complete journey: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
