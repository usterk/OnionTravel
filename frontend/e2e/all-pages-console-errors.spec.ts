import { test, expect } from '@playwright/test';

/**
 * Comprehensive E2E test to detect console errors across ALL pages.
 * This test navigates through every main page and checks for JavaScript errors.
 */

test.describe('All Pages Console Error Detection', () => {
  const consoleErrors: string[] = [];
  const consoleWarnings: string[] = [];
  const pageErrors: Map<string, string[]> = new Map();

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

  test('Navigate through all pages and detect console errors', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `allpages-test-${timestamp}@example.com`;
    const testUsername = `allpagesuser${timestamp}`;

    // Helper function to check and record errors for current page
    const checkPageErrors = (pageName: string) => {
      if (consoleErrors.length > 0) {
        pageErrors.set(pageName, [...consoleErrors]);
      }
      consoleErrors.length = 0; // Clear for next page
    };

    // 1. Login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    checkPageErrors('Login Page');

    // 2. Register page
    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    checkPageErrors('Register Page');

    // Register a new user
    await page.fill('input#email', testEmail);
    await page.fill('input#username', testUsername);
    await page.fill('input#full_name', 'All Pages Test User');
    await page.fill('input#password', 'TestPassword123!');
    await page.fill('input#confirmPassword', 'TestPassword123!');

    consoleErrors.length = 0; // Clear before submission
    await page.click('button[type="submit"]');

    // Wait for redirect (either to / or /trips)
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 3. Dashboard (root page)
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    checkPageErrors('Dashboard (/)');

    // 4. Trips list page
    await page.goto('/trips');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    checkPageErrors('Trips List (/trips)');

    // 5. Create trip page
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    checkPageErrors('Create Trip (/trips/new)');

    // Fill and submit trip form to create a trip
    await page.fill('input#name', 'Test Trip for All Pages');
    await page.fill('input#start_date', '2025-07-01');
    await page.fill('input#end_date', '2025-07-15');
    await page.selectOption('select#currency_code', 'USD');
    await page.fill('input#total_budget', '5000');

    consoleErrors.length = 0; // Clear before submission
    await page.click('button:has-text("Create Trip")');

    // Wait for redirect back to trips list
    await page.waitForURL('/trips', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 6. Trip detail page - click on the created trip
    const tripCards = page.locator('[data-testid="trip-card"], .cursor-pointer:has-text("Test Trip")');
    const tripCardCount = await tripCards.count();

    if (tripCardCount > 0) {
      consoleErrors.length = 0; // Clear before navigation
      await tripCards.first().click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      checkPageErrors('Trip Detail (/trips/:id)');
    } else {
      // If we can't find a clickable trip card, try navigating directly
      // Get the trip ID from the URL or try a different approach
      const trips = await page.locator('h3, h2').allTextContents();
      if (trips.length > 0) {
        // Try to navigate to trips/1 or extract ID from page
        consoleErrors.length = 0;
        await page.goto('/trips/1');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        checkPageErrors('Trip Detail (/trips/:id)');
      }
    }

    // Generate error report
    let errorReport = '';
    if (pageErrors.size > 0) {
      errorReport = '\n=== CONSOLE ERRORS DETECTED ===\n\n';
      pageErrors.forEach((errors, pageName) => {
        errorReport += `📍 ${pageName}:\n`;
        errors.forEach(err => {
          errorReport += `   ❌ ${err}\n`;
        });
        errorReport += '\n';
      });
      errorReport += '=================================\n';
    }

    // Print summary
    if (pageErrors.size > 0) {
      console.log(errorReport);
      console.log(`\n❌ FAILED: Console errors found on ${pageErrors.size} page(s)`);
    } else {
      console.log('\n✅ SUCCESS: No console errors found on any page!');
    }

    // Assert no errors
    expect(pageErrors.size, errorReport).toBe(0);

    // Print warnings summary if any
    if (consoleWarnings.length > 0) {
      console.log(`\n⚠️  Total warnings across all pages: ${consoleWarnings.length}`);
    }
  });
});
