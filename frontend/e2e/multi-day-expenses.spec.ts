import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Multi-Day Expense Functionality
 *
 * Tests cover:
 * - Creating multi-day expenses (e.g., hotel bookings)
 * - Date range validation
 * - Single-day vs multi-day expense handling
 * - Budget allocation across multiple days
 * - Filtering expenses by date range
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Multi-Day Expense E2E Tests', () => {
  let testEmail: string;
  let testUsername: string;
  let tripId: string;
  let authToken: string;
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
    testEmail = `multidaytest-${timestamp}@example.com`;
    testUsername = `multidayuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'MultiDay Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Extract auth token
    const storage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      return authStorage ? JSON.parse(authStorage) : null;
    });

    if (storage && storage.state && storage.state.token) {
      authToken = storage.state.token;
    }

    // Create a trip
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.waitForSelector('input[id="name"]', { timeout: 10000 });
    await page.fill('input[id="name"]', 'Multi-Day Expense Trip');
    await page.fill('input[id="start_date"]', '2025-07-01');
    await page.fill('input[id="end_date"]', '2025-07-14');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '2800');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Open the trip and go to Expenses tab
    await page.getByText('Multi-Day Expense Trip').click();
    await page.waitForURL(/\/trips\/\d+/);
    await page.waitForLoadState('networkidle');

    const url = page.url();
    tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    await page.getByRole('button', { name: /expenses/i }).click();
    await page.waitForTimeout(1000);

    expect(consoleErrors.length, `Console errors during setup: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Create multi-day expense via API', async ({ request }) => {
    // Create a 3-night hotel booking
    const response = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Hotel Downtown',
        amount: 450.00,
        currency_code: 'USD',
        category_id: 1, // Assume first category (Accommodation)
        start_date: '2025-07-05',
        end_date: '2025-07-07', // 3 nights: July 5, 6, 7
        payment_method: 'Credit Card',
        notes: 'Deluxe room with breakfast',
      },
    });

    expect(response.ok()).toBeTruthy();
    const expense = await response.json();

    expect(expense.title).toBe('Hotel Downtown');
    expect(expense.amount).toBe(450.00);
    expect(expense.start_date).toBe('2025-07-05');
    expect(expense.end_date).toBe('2025-07-07');
    expect(expense.notes).toBe('Deluxe room with breakfast');
  });

  test('Create single-day expense (end_date is null)', async ({ request }) => {
    // Single-day expenses should have end_date as null
    const response = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Lunch at Restaurant',
        amount: 45.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-08',
        // No end_date - single-day expense
        payment_method: 'Cash',
      },
    });

    expect(response.ok()).toBeTruthy();
    const expense = await response.json();

    expect(expense.title).toBe('Lunch at Restaurant');
    expect(expense.start_date).toBe('2025-07-08');
    expect(expense.end_date).toBeNull();
  });

  test('Multi-day expense with same start and end date', async ({ request }) => {
    // If start_date == end_date, it's effectively a single-day expense
    const response = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Day Pass Spa',
        amount: 120.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-10',
        end_date: '2025-07-10', // Same day
        payment_method: 'Credit Card',
      },
    });

    expect(response.ok()).toBeTruthy();
    const expense = await response.json();

    expect(expense.start_date).toBe('2025-07-10');
    expect(expense.end_date).toBe('2025-07-10');
  });

  test('Validate end_date cannot be before start_date', async ({ request }) => {
    // This should fail validation
    const response = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Invalid Date Range',
        amount: 100.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-10',
        end_date: '2025-07-08', // Before start_date
        payment_method: 'Cash',
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.detail).toContain('end_date cannot be before start_date');
  });

  test('Filter expenses by date range includes multi-day expenses', async ({ request }) => {
    // Create a multi-day expense
    await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Hotel Booking',
        amount: 600.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-05',
        end_date: '2025-07-08',
        payment_method: 'Credit Card',
      },
    });

    // Create a single-day expense outside the range
    await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Dinner',
        amount: 50.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-12',
        payment_method: 'Cash',
      },
    });

    // Filter for July 5-8
    const response = await request.get(
      `http://localhost:8001/api/v1/trips/${tripId}/expenses?start_date=2025-07-05&end_date=2025-07-08`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const expenses = await response.json();

    // Should include the hotel but not the dinner
    const titles = expenses.map((e: any) => e.title);
    expect(titles).toContain('Hotel Booking');
    expect(titles).not.toContain('Dinner');
  });

  test('Multi-day expense spanning entire trip duration', async ({ request }) => {
    // Create an expense that spans the entire trip (e.g., car rental)
    const response = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Car Rental - Full Trip',
        amount: 840.00,
        currency_code: 'USD',
        category_id: 2, // Transportation
        start_date: '2025-07-01',
        end_date: '2025-07-14',
        payment_method: 'Credit Card',
        notes: 'Full-size sedan for 14 days',
      },
    });

    expect(response.ok()).toBeTruthy();
    const expense = await response.json();

    expect(expense.title).toBe('Car Rental - Full Trip');
    expect(expense.start_date).toBe('2025-07-01');
    expect(expense.end_date).toBe('2025-07-14');

    // Calculate days: from July 1 to July 14 is 14 days
    const startDate = new Date(expense.start_date);
    const endDate = new Date(expense.end_date);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end

    expect(diffDays).toBe(14);
  });

  test('Update expense from single-day to multi-day', async ({ request }) => {
    // Create a single-day expense
    const createResponse = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Museum Ticket',
        amount: 25.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-09',
        payment_method: 'Cash',
      },
    });

    const expense = await createResponse.json();
    expect(expense.end_date).toBeNull();

    // Update to multi-day (e.g., museum pass for 3 days)
    const updateResponse = await request.put(
      `http://localhost:8001/api/v1/trips/${tripId}/expenses/${expense.id}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Museum 3-Day Pass',
          amount: 65.00,
          end_date: '2025-07-11', // Now spans 3 days
        },
      }
    );

    expect(updateResponse.ok()).toBeTruthy();
    const updatedExpense = await updateResponse.json();

    expect(updatedExpense.title).toBe('Museum 3-Day Pass');
    expect(updatedExpense.amount).toBe(65.00);
    expect(updatedExpense.start_date).toBe('2025-07-09');
    expect(updatedExpense.end_date).toBe('2025-07-11');
  });

  test('Update expense from multi-day to single-day', async ({ request }) => {
    // Create a multi-day expense
    const createResponse = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Hostel Booking',
        amount: 150.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-03',
        end_date: '2025-07-05',
        payment_method: 'Credit Card',
      },
    });

    const expense = await createResponse.json();
    expect(expense.end_date).toBe('2025-07-05');

    // Update to single-day by removing end_date
    const updateResponse = await request.put(
      `http://localhost:8001/api/v1/trips/${tripId}/expenses/${expense.id}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          title: 'One Night Stay',
          amount: 80.00,
          end_date: null, // Remove end_date
        },
      }
    );

    expect(updateResponse.ok()).toBeTruthy();
    const updatedExpense = await updateResponse.json();

    expect(updatedExpense.title).toBe('One Night Stay');
    expect(updatedExpense.amount).toBe(80.00);
    expect(updatedExpense.end_date).toBeNull();
  });

  test('Statistics include multi-day expenses correctly', async ({ request }) => {
    // Create a mix of single-day and multi-day expenses
    await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Hotel',
        amount: 400.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-01',
        end_date: '2025-07-04',
        payment_method: 'Credit Card',
      },
    });

    await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Lunch',
        amount: 30.00,
        currency_code: 'USD',
        category_id: 1,
        start_date: '2025-07-02',
        payment_method: 'Cash',
      },
    });

    // Get statistics
    const statsResponse = await request.get(`http://localhost:8001/api/v1/trips/${tripId}/expenses/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(statsResponse.ok()).toBeTruthy();
    const stats = await statsResponse.json();

    // Total spent should be 430.00 (400 + 30)
    expect(stats.total_spent).toBe(430.00);
    expect(stats.trip_budget).toBe(2800.00);
    expect(stats.remaining_budget).toBe(2370.00);
  });

  test('No console errors throughout multi-day tests', async () => {
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
