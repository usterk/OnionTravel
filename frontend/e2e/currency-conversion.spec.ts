import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Currency Conversion
 *
 * Tests cover:
 * - Getting exchange rates between currencies
 * - Converting amounts between currencies
 * - Supported currencies list
 * - Expense creation with foreign currency auto-conversion
 * - Historical exchange rate caching
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Currency Conversion E2E Tests', () => {
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
    const testEmail = `currencytest-${timestamp}@example.com`;
    const testUsername = `currencyuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Currency Test User');
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

    expect(consoleErrors.length, `Console errors during setup: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Get list of supported currencies', async ({ request }) => {
    const response = await request.get('http://localhost:8001/api/v1/currency/supported', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const currencies = await response.json();

    expect(Array.isArray(currencies)).toBeTruthy();
    expect(currencies.length).toBeGreaterThan(0);

    // Verify expected currencies are present
    expect(currencies).toContain('USD');
    expect(currencies).toContain('EUR');
    expect(currencies).toContain('GBP');
    expect(currencies).toContain('JPY');
    expect(currencies).toContain('THB');
    expect(currencies).toContain('PLN');
    expect(currencies).toContain('AUD');
    expect(currencies).toContain('CAD');
    expect(currencies).toContain('CHF');
  });

  test('Get exchange rate between two currencies', async ({ request }) => {
    const response = await request.get('http://localhost:8001/api/v1/currency/rates?from=USD&to=EUR', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const rateData = await response.json();

    expect(rateData).toHaveProperty('from_currency', 'USD');
    expect(rateData).toHaveProperty('to_currency', 'EUR');
    expect(rateData).toHaveProperty('rate');
    expect(rateData).toHaveProperty('date');
    expect(typeof rateData.rate).toBe('number');
    expect(rateData.rate).toBeGreaterThan(0);
  });

  test('Get exchange rate for same currency returns 1.0', async ({ request }) => {
    const response = await request.get('http://localhost:8001/api/v1/currency/rates?from=USD&to=USD', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const rateData = await response.json();

    expect(rateData.from_currency).toBe('USD');
    expect(rateData.to_currency).toBe('USD');
    expect(rateData.rate).toBe(1.0);
  });

  test('Convert amount between currencies', async ({ request }) => {
    const response = await request.get(
      'http://localhost:8001/api/v1/currency/convert?amount=100&from=USD&to=EUR',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const conversionData = await response.json();

    expect(conversionData).toHaveProperty('from_currency', 'USD');
    expect(conversionData).toHaveProperty('to_currency', 'EUR');
    expect(conversionData).toHaveProperty('from_amount', 100);
    expect(conversionData).toHaveProperty('to_amount');
    expect(conversionData).toHaveProperty('rate');
    expect(typeof conversionData.to_amount).toBe('number');
    expect(conversionData.to_amount).toBeGreaterThan(0);
  });

  test('Convert large amount maintains precision', async ({ request }) => {
    const response = await request.get(
      'http://localhost:8001/api/v1/currency/convert?amount=123456.78&from=USD&to=JPY',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const conversionData = await response.json();

    expect(conversionData.from_amount).toBe(123456.78);
    expect(conversionData.to_amount).toBeGreaterThan(0);
    // JPY typically has much higher values than USD
    expect(conversionData.to_amount).toBeGreaterThan(conversionData.from_amount);
  });

  test('Expense with foreign currency auto-converts to trip currency', async ({ request, page }) => {
    // Create a trip with USD as currency
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Currency Test Trip');
    await page.fill('input[id="start_date"]', '2025-08-01');
    await page.fill('input[id="end_date"]', '2025-08-10');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '2000');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.getByText('Currency Test Trip').click();
    await page.waitForURL(/\/trips\/\d+/);

    const url = page.url();
    const tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    // Create an expense in EUR (foreign currency)
    const expenseResponse = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'Paris Hotel',
        amount: 150.00,
        currency_code: 'EUR', // Foreign currency
        category_id: 1,
        start_date: '2025-08-05',
        payment_method: 'Credit Card',
      },
    });

    expect(expenseResponse.ok()).toBeTruthy();
    const expense = await expenseResponse.json();

    // Verify expense has both original amount and converted amount
    expect(expense.amount).toBe(150.00);
    expect(expense.currency_code).toBe('EUR');
    expect(expense).toHaveProperty('amount_in_trip_currency');
    expect(expense).toHaveProperty('exchange_rate');
    expect(expense.amount_in_trip_currency).toBeGreaterThan(0);
    expect(expense.exchange_rate).toBeGreaterThan(0);

    // The converted amount should be different from original (unless rate is exactly 1.0)
    // For EUR to USD, typically the amount should be similar or slightly higher
    expect(typeof expense.amount_in_trip_currency).toBe('number');
  });

  test('Expense in same currency as trip does not need conversion', async ({ request, page }) => {
    // Create a trip with USD
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Same Currency Trip');
    await page.fill('input[id="start_date"]', '2025-08-15');
    await page.fill('input[id="end_date"]', '2025-08-20');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '1500');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.getByText('Same Currency Trip').click();
    await page.waitForURL(/\/trips\/\d+/);

    const url = page.url();
    const tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    // Create an expense in USD (same currency)
    const expenseResponse = await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'NYC Hotel',
        amount: 200.00,
        currency_code: 'USD', // Same currency
        category_id: 1,
        start_date: '2025-08-16',
        payment_method: 'Credit Card',
      },
    });

    expect(expenseResponse.ok()).toBeTruthy();
    const expense = await expenseResponse.json();

    // For same currency, amount_in_trip_currency should equal amount
    expect(expense.amount).toBe(200.00);
    expect(expense.currency_code).toBe('USD');
    expect(expense.amount_in_trip_currency).toBe(200.00);
    expect(expense.exchange_rate).toBe(1.0);
  });

  test('Invalid currency code returns error', async ({ request }) => {
    const response = await request.get('http://localhost:8001/api/v1/currency/rates?from=INVALID&to=USD', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    // Should return error for invalid currency
    expect(response.ok()).toBeFalsy();
  });

  test('Missing required parameters returns validation error', async ({ request }) => {
    // Missing 'to' parameter
    const response = await request.get('http://localhost:8001/api/v1/currency/rates?from=USD', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(422); // Validation error
  });

  test('Unauthenticated requests fail', async ({ request }) => {
    const response = await request.get('http://localhost:8001/api/v1/currency/rates?from=USD&to=EUR');

    expect(response.status()).toBe(401);
  });

  test('Convert zero amount', async ({ request }) => {
    const response = await request.get(
      'http://localhost:8001/api/v1/currency/convert?amount=0&from=USD&to=EUR',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const conversionData = await response.json();

    expect(conversionData.from_amount).toBe(0);
    expect(conversionData.to_amount).toBe(0);
  });

  test('Convert negative amount (should handle gracefully)', async ({ request }) => {
    const response = await request.get(
      'http://localhost:8001/api/v1/currency/convert?amount=-50&from=USD&to=EUR',
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    // Should either accept it or return validation error
    // The actual behavior depends on backend validation
    if (response.ok()) {
      const conversionData = await response.json();
      expect(conversionData.from_amount).toBe(-50);
      expect(conversionData.to_amount).toBeLessThan(0);
    } else {
      expect(response.status()).toBe(422);
    }
  });

  test('Multiple expenses in different currencies sum correctly', async ({ request, page }) => {
    // Create a trip with USD
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Multi-Currency Trip');
    await page.fill('input[id="start_date"]', '2025-09-01');
    await page.fill('input[id="end_date"]', '2025-09-10');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '3000');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    await page.getByText('Multi-Currency Trip').click();
    await page.waitForURL(/\/trips\/\d+/);

    const url = page.url();
    const tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    // Create expenses in different currencies
    const expenses = [
      { title: 'USD Expense', amount: 100, currency: 'USD' },
      { title: 'EUR Expense', amount: 100, currency: 'EUR' },
      { title: 'GBP Expense', amount: 100, currency: 'GBP' },
    ];

    for (const exp of expenses) {
      await request.post(`http://localhost:8001/api/v1/trips/${tripId}/expenses`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          title: exp.title,
          amount: exp.amount,
          currency_code: exp.currency,
          category_id: 1,
          start_date: '2025-09-05',
          payment_method: 'Credit Card',
        },
      });
    }

    // Get statistics
    const statsResponse = await request.get(`http://localhost:8001/api/v1/trips/${tripId}/expenses/stats`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(statsResponse.ok()).toBeTruthy();
    const stats = await statsResponse.json();

    // Total spent should be sum of all converted amounts
    expect(stats.total_spent).toBeGreaterThan(0);
    // Should be approximately 100 + (100 EUR in USD) + (100 GBP in USD)
    // The exact value depends on exchange rates but should be reasonable
    expect(stats.total_spent).toBeGreaterThan(100); // At least the USD expense
    expect(stats.total_spent).toBeLessThan(3000); // Less than total budget
  });

  test('No console errors throughout currency tests', async () => {
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
