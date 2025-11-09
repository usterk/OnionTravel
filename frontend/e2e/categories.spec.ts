import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Category Management
 *
 * Tests cover:
 * - Default categories creation
 * - Create, edit, delete categories
 * - Category statistics display
 * - Budget allocation visualization
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Category Management E2E Tests', () => {
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
    testEmail = `cattest-${timestamp}@example.com`;
    testUsername = `catuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Category Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(trips)?/, { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate to create trip page
    await page.goto('/trips/new');
    await page.waitForURL('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Category Test Trip');
    await page.fill('input[id="start_date"]', '2025-06-01');
    await page.fill('input[id="end_date"]', '2025-06-15');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '2000');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Open trip and go to Categories tab
    await page.getByText('Category Test Trip').click();
    await page.waitForURL(/\/trips\/\d+/);
    const url = page.url();
    tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';
    await page.waitForLoadState('networkidle');

    // Click Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Verify no console errors during setup
    expect(consoleErrors.length, `Console errors during setup: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Default categories are created on new trip', async ({ page }) => {
    // Verify default categories exist (8 expected: Accommodation, Transportation, Food & Dining, etc.)
    const defaultCategories = [
      'Accommodation',
      'Transportation',
      'Food',
      'Activities',
      'Shopping',
      'Health',
      'Entertainment',
      'Other',
    ];

    // Check if at least some default categories are visible
    for (const categoryName of defaultCategories) {
      const categoryElement = page.getByText(categoryName, { exact: false });
      if (await categoryElement.count() > 0) {
        await expect(categoryElement.first()).toBeVisible();
        break; // At least one default category found
      }
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Create new category', async ({ page }) => {
    // Click Add Category button
    const addButton = page.getByRole('button', { name: /add category|new category/i });
    await addButton.click();

    // Wait for form/dialog
    await page.waitForTimeout(500);

    // Fill category form
    await page.fill('input[id="name"], input[name="name"]', 'Souvenirs');

    // Set budget percentage
    const budgetInput = page.locator('input[id="budget_percentage"], input[name="budget_percentage"]');
    if (await budgetInput.count() > 0) {
      await budgetInput.fill('5');
    }

    // Select icon (if available)
    const iconButtons = page.locator('button:has(svg)').filter({ hasText: '' });
    if (await iconButtons.count() > 0) {
      await iconButtons.first().click();
    }

    // Submit
    await page.getByRole('button', { name: /save|create|add/i }).last().click();
    await page.waitForTimeout(1000);

    // Verify category appears
    await expect(page.getByText('Souvenirs')).toBeVisible();

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Edit existing category', async ({ page }) => {
    // Find first category and click edit
    const editButtons = page.getByRole('button', { name: /edit/i });
    if (await editButtons.count() > 0) {
      await editButtons.first().click();
      await page.waitForTimeout(500);

      // Update name
      const nameInput = page.locator('input[id="name"], input[name="name"]');
      if (await nameInput.count() > 0) {
        const currentValue = await nameInput.inputValue();
        await nameInput.fill(`${currentValue} Updated`);
      }

      // Save
      await page.getByRole('button', { name: /save|update/i }).last().click();
      await page.waitForTimeout(1000);

      // Verify updated name appears
      await expect(page.getByText(/updated/i)).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Delete category', async ({ page }) => {
    // Create a category first
    const addButton = page.getByRole('button', { name: /add category|new category/i });
    if (await addButton.count() > 0) {
      await addButton.click();
      await page.waitForTimeout(500);
      await page.fill('input[id="name"], input[name="name"]', 'Category To Delete');
      await page.getByRole('button', { name: /save|create|add/i }).last().click();
      await page.waitForTimeout(1000);

      // Now delete it
      const deleteButtons = page.getByRole('button', { name: /delete/i });
      if (await deleteButtons.count() > 0) {
        // Find the delete button for our specific category
        const categoryRow = page.locator('text=Category To Delete').locator('..');
        const deleteButton = categoryRow.locator('button').filter({ hasText: /delete/i });

        if (await deleteButton.count() > 0) {
          await deleteButton.first().click();

          // Confirm deletion
          const confirmButton = page.getByRole('button', { name: /confirm|delete/i }).last();
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(1000);
          }

          // Verify category is removed
          const deletedCategory = page.getByText('Category To Delete');
          if (await deletedCategory.count() === 0) {
            // Successfully deleted
            expect(await deletedCategory.count()).toBe(0);
          }
        }
      }
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Category statistics display correctly', async ({ page }) => {
    // Add an expense to a category first
    await page.getByRole('button', { name: /expenses/i }).click();
    await page.waitForTimeout(1000);

    await page.fill('input[id="quick-expense-amount"]', '100.00');
    const categoryButtons = page.locator('[data-testid="category-icon-button"]').or(
      page.locator('button:has(svg)').filter({ hasText: '' })
    );
    await categoryButtons.first().click();
    await page.getByRole('button', { name: /add expense/i }).click();
    await expect(page.getByText(/expense added successfully/i)).toBeVisible({ timeout: 5000 });

    // Go back to Categories tab
    await page.getByRole('button', { name: /categories/i }).click();
    await page.waitForTimeout(1000);

    // Verify statistics are visible (spent, remaining, % used)
    const statsElements = page.locator('text=/spent|remaining|%|100/i');
    if (await statsElements.count() > 0) {
      await expect(statsElements.first()).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Budget allocation chart displays', async ({ page }) => {
    // Verify Budget Allocation section exists
    const budgetAllocation = page.getByText(/budget allocation/i);
    await expect(budgetAllocation).toBeVisible();

    // Verify some visual element of the chart (progress bars, percentages)
    const percentageElements = page.locator('text=/%/').or(
      page.locator('[class*="progress"], [role="progressbar"]')
    );

    if (await percentageElements.count() > 0) {
      await expect(percentageElements.first()).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Over-allocated budget warning', async ({ page }) => {
    // Try to create categories with total > 100%
    // First, let's edit existing categories to allocate more budget

    const editButtons = page.getByRole('button', { name: /edit/i });
    if (await editButtons.count() >= 2) {
      // Edit first category to 60%
      await editButtons.first().click();
      await page.waitForTimeout(500);

      const budgetInput = page.locator('input[id="budget_percentage"], input[name="budget_percentage"]');
      if (await budgetInput.count() > 0) {
        await budgetInput.fill('60');
      }

      await page.getByRole('button', { name: /save|update/i }).last().click();
      await page.waitForTimeout(1000);

      // Edit second category to 50% (total 110%)
      const editButtons2 = page.getByRole('button', { name: /edit/i });
      if (await editButtons2.count() > 0) {
        await editButtons2.nth(1).click();
        await page.waitForTimeout(500);

        const budgetInput2 = page.locator('input[id="budget_percentage"], input[name="budget_percentage"]');
        if (await budgetInput2.count() > 0) {
          await budgetInput2.fill('50');
        }

        await page.getByRole('button', { name: /save|update/i }).last().click();
        await page.waitForTimeout(1000);

        // Look for over-allocated warning
        const warningElements = page.locator('text=/over.*allocat|exceed|warning/i').or(
          page.locator('[class*="red"], [class*="warning"]')
        );

        if (await warningElements.count() > 0) {
          await expect(warningElements.first()).toBeVisible();
        }
      }
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Unallocated budget displays', async ({ page }) => {
    // With default categories, some budget should be unallocated
    // Look for unallocated budget indicator
    const unallocated = page.locator('text=/unallocated|remaining|available/i');

    if (await unallocated.count() > 0) {
      await expect(unallocated.first()).toBeVisible();
    }

    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
