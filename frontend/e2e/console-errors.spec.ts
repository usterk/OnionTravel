import { test, expect } from '@playwright/test';

/**
 * E2E tests to detect console errors and warnings in the browser.
 * These tests navigate to various pages and check for JavaScript errors.
 */

test.describe('Console Error Detection', () => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Clear previous errors
    consoleErrors.length = 0;
    consoleWarnings.length = 0;

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });

    // Listen for page errors (uncaught exceptions)
    page.on('pageerror', (error) => {
      consoleErrors.push(`Uncaught exception: ${error.message}`);
    });
  });

  test('Login page should load without console errors', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Give time for any async errors
    await page.waitForTimeout(2000);

    // Check for console errors
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    // Optionally check for excessive warnings
    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings on login page (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });

  test('Register page should load without console errors', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings on register page (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });

  test('Root page redirect should not produce console errors', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings on root page (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });

  test('Protected routes (when not logged in) should not produce console errors', async ({ page }) => {
    await page.goto('/trips');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should redirect to login without errors
    expect(page.url()).toContain('/login');
    expect(consoleErrors, `Console errors found:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings on protected route redirect (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });

  test('After login, trips page should load without console errors', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `console-test-${timestamp}@example.com`;
    const testUsername = `consoleuser${timestamp}`;

    // Register a new user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input#email', testEmail);
    await page.fill('input#username', testUsername);
    await page.fill('input#full_name', 'Console Test User');
    await page.fill('input#password', 'TestPassword123!');
    await page.fill('input#confirmPassword', 'TestPassword123!');

    // Clear errors from registration page
    consoleErrors.length = 0;

    await page.click('button[type="submit"]');

    // Wait for redirect to trips page
    await page.waitForURL(/\/trips/, { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for errors after login
    expect(consoleErrors, `Console errors found after login:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings on trips page after login (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });

  test('Creating a trip should not produce console errors', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `trip-test-${timestamp}@example.com`;
    const testUsername = `tripuser${timestamp}`;

    // Register and login
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input#email', testEmail);
    await page.fill('input#username', testUsername);
    await page.fill('input#full_name', 'Trip Test User');
    await page.fill('input#password', 'TestPassword123!');
    await page.fill('input#confirmPassword', 'TestPassword123!');

    await page.click('button[type="submit"]');
    await page.waitForURL(/\/trips/);
    await page.waitForLoadState('networkidle');

    // Clear errors from previous steps
    consoleErrors.length = 0;

    // Navigate to create trip
    await page.click('button:has-text("New Trip")');
    await page.waitForURL('/trips/new');
    await page.waitForLoadState('networkidle');

    // Fill trip form
    await page.fill('input#name', 'Test Trip');
    await page.fill('input#start_date', '2025-07-01');
    await page.fill('input#end_date', '2025-07-15');
    await page.selectOption('select#currency_code', 'USD');
    await page.fill('input#total_budget', '5000');

    // Clear errors before submission
    consoleErrors.length = 0;

    // Submit
    await page.click('button:has-text("Create Trip")');
    await page.waitForURL('/trips', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check for errors
    expect(consoleErrors, `Console errors found during trip creation:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings during trip creation (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });

  test('404 page should not produce console errors', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz123');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    expect(consoleErrors, `Console errors found on 404 page:\n${consoleErrors.join('\n')}`).toHaveLength(0);

    if (consoleWarnings.length > 0) {
      console.log(`⚠️ Warnings on 404 page (${consoleWarnings.length}):`);
      consoleWarnings.forEach((w) => console.log(`  - ${w}`));
    }
  });
});

/**
 * Additional test to check for specific module import errors
 */
test.describe('Module Import Errors', () => {
  test('Should not have module import errors', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('does not provide an export') ||
            text.includes('SyntaxError') ||
            text.includes('import') ||
            text.includes('module')) {
          errors.push(text);
        }
      }
    });

    page.on('pageerror', (error) => {
      const message = error.message;
      if (message.includes('does not provide an export') ||
          message.includes('SyntaxError') ||
          message.includes('import') ||
          message.includes('module')) {
        errors.push(message);
      }
    });

    // Try to navigate to main pages and check for module errors
    const pagesToCheck = ['/login', '/register', '/'];

    for (const pagePath of pagesToCheck) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      if (errors.length > 0) {
        break;
      }
    }

    expect(errors, `Module import errors found:\n${errors.join('\n')}`).toHaveLength(0);
  });
});
