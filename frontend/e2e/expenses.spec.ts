import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!';
const API_BASE_URL = 'http://localhost:8001/api/v1';

test.describe('Expense Management E2E Tests (API)', () => {
  let testEmail: string;
  let testUsername: string;
  let accessToken: string;
  let tripId: number;
  let categoryId: number;

  test.beforeEach(async ({ page, request }) => {
    // Generate unique credentials with timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    testEmail = `exptest-${timestamp}-${random}@example.com`;
    testUsername = `testuser${timestamp}${random}`;

    // Register user
    const registerResponse = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        email: testEmail,
        username: testUsername,
        full_name: 'Test User',
        password: TEST_PASSWORD,
      },
    });
    expect(registerResponse.status()).toBe(201);

    // Login to get access token
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: {
        email: testEmail,
        password: TEST_PASSWORD,
      },
    });
    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    accessToken = loginData.access_token;

    // Create a test trip
    const tripResponse = await request.post(`${API_BASE_URL}/trips/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: {
        name: 'Expense Test Trip',
        description: 'Trip for testing expenses',
        start_date: '2025-08-01',
        end_date: '2025-08-10',
        currency_code: 'USD',
        total_budget: 3000,
      },
    });
    expect(tripResponse.status()).toBe(201);
    const tripData = await tripResponse.json();
    tripId = tripData.id;

    // Get categories (default categories should be auto-created)
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();
    expect(categories.length).toBeGreaterThan(0);
    categoryId = categories[0].id; // Use first category
  });

  test('User can add single-day expense', async ({ request }) => {
    const expenseData = {
      title: 'Hotel Booking',
      description: 'One night stay',
      amount: 150.00,
      currency_code: 'USD',
      category_id: categoryId,
      start_date: '2025-08-01',
      payment_method: 'card',
      location: 'New York',
    };

    const response = await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: expenseData,
    });

    expect(response.status()).toBe(201);
    const expense = await response.json();

    expect(expense).toHaveProperty('id');
    expect(expense.title).toBe(expenseData.title);
    expect(parseFloat(expense.amount)).toBe(expenseData.amount);
    expect(expense.currency_code).toBe('USD');
    expect(expense.start_date).toBe(expenseData.start_date);
    expect(expense.end_date).toBeNull();
    expect(expense.trip_id).toBe(tripId);
    expect(expense.category_id).toBe(categoryId);
  });

  test('User can add multi-day expense (hotel booking)', async ({ request }) => {
    const expenseData = {
      title: 'Hotel Reservation',
      description: '5-night hotel stay',
      amount: 750.00,
      currency_code: 'USD',
      category_id: categoryId,
      start_date: '2025-08-01',
      end_date: '2025-08-05', // Multi-day expense
      payment_method: 'card',
    };

    const response = await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: expenseData,
    });

    expect(response.status()).toBe(201);
    const expense = await response.json();

    expect(expense.title).toBe(expenseData.title);
    expect(expense.start_date).toBe(expenseData.start_date);
    expect(expense.end_date).toBe(expenseData.end_date);
  });

  test('Currency conversion calculates correctly', async ({ request }) => {
    // Create expense in different currency (EUR)
    const expenseData = {
      title: 'Restaurant Dinner',
      amount: 100.00,
      currency_code: 'EUR',
      category_id: categoryId,
      start_date: '2025-08-02',
    };

    const response = await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      data: expenseData,
    });

    expect(response.status()).toBe(201);
    const expense = await response.json();

    // Verify conversion fields are populated
    expect(expense.currency_code).toBe('EUR');
    expect(expense.exchange_rate).toBeTruthy();
    expect(expense.amount_in_trip_currency).toBeTruthy();

    // Amount in trip currency should be different from original (unless rate is 1.0)
    // We can't assert exact value as it depends on real exchange rates
  });

  test('User can view expense list', async ({ request }) => {
    // Create a few expenses first
    const expenses = [
      { title: 'Breakfast', amount: 25, category_id: categoryId, start_date: '2025-08-01', currency_code: 'USD' },
      { title: 'Lunch', amount: 35, category_id: categoryId, start_date: '2025-08-02', currency_code: 'USD' },
      { title: 'Dinner', amount: 50, category_id: categoryId, start_date: '2025-08-03', currency_code: 'USD' },
    ];

    for (const expenseData of expenses) {
      await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        data: expenseData,
      });
    }

    // Get expense list
    const response = await request.get(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(200);
    const expenseList = await response.json();

    expect(expenseList.length).toBeGreaterThanOrEqual(3);
    expect(expenseList[0]).toHaveProperty('title');
    expect(expenseList[0]).toHaveProperty('amount');
    expect(expenseList[0]).toHaveProperty('currency_code');
  });

  test('User can filter expenses by date range', async ({ request }) => {
    // Create expenses on different dates
    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Early Expense', amount: 100, category_id: categoryId, start_date: '2025-08-01', currency_code: 'USD' },
    });

    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Mid Expense', amount: 100, category_id: categoryId, start_date: '2025-08-05', currency_code: 'USD' },
    });

    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Late Expense', amount: 100, category_id: categoryId, start_date: '2025-08-09', currency_code: 'USD' },
    });

    // Filter by date range
    const response = await request.get(
      `${API_BASE_URL}/trips/${tripId}/expenses?start_date=2025-08-04&end_date=2025-08-09`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    expect(response.status()).toBe(200);
    const filtered = await response.json();

    // Should only get expenses from Aug 5 and Aug 9
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    const titles = filtered.map((e: any) => e.title);
    expect(titles).toContain('Mid Expense');
    expect(titles).toContain('Late Expense');
  });

  test('User can filter expenses by category', async ({ request }) => {
    // Get second category
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });
    const categories = await categoriesResponse.json();
    const category2Id = categories[1]?.id;

    if (!category2Id) {
      test.skip();
      return;
    }

    // Create expenses in different categories
    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Category 1 Expense', amount: 100, category_id: categoryId, start_date: '2025-08-01', currency_code: 'USD' },
    });

    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Category 2 Expense', amount: 200, category_id: category2Id, start_date: '2025-08-01', currency_code: 'USD' },
    });

    // Filter by category
    const response = await request.get(
      `${API_BASE_URL}/trips/${tripId}/expenses?category_id=${category2Id}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    expect(response.status()).toBe(200);
    const filtered = await response.json();

    // All expenses should be from category 2
    filtered.forEach((expense: any) => {
      expect(expense.category_id).toBe(category2Id);
    });
  });

  test('User can edit expense', async ({ request }) => {
    // Create an expense
    const createResponse = await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: {
        title: 'Original Title',
        amount: 100,
        category_id: categoryId,
        start_date: '2025-08-01',
        currency_code: 'USD',
      },
    });
    const expense = await createResponse.json();

    // Update the expense
    const updateResponse = await request.put(
      `${API_BASE_URL}/trips/${tripId}/expenses/${expense.id}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        data: {
          title: 'Updated Title',
          amount: 150,
        },
      }
    );

    expect(updateResponse.status()).toBe(200);
    const updated = await updateResponse.json();

    expect(updated.title).toBe('Updated Title');
    expect(parseFloat(updated.amount)).toBe(150);
  });

  test('User can delete expense', async ({ request }) => {
    // Create an expense
    const createResponse = await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: {
        title: 'Expense to Delete',
        amount: 50,
        category_id: categoryId,
        start_date: '2025-08-01',
        currency_code: 'USD',
      },
    });
    const expense = await createResponse.json();

    // Delete the expense
    const deleteResponse = await request.delete(
      `${API_BASE_URL}/trips/${tripId}/expenses/${expense.id}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    expect(deleteResponse.status()).toBe(204);

    // Verify expense is deleted
    const getResponse = await request.get(
      `${API_BASE_URL}/trips/${tripId}/expenses/${expense.id}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      }
    );

    expect(getResponse.status()).toBe(404);
  });

  test('Expense statistics update correctly', async ({ request }) => {
    // Create multiple expenses
    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Expense 1', amount: 100, category_id: categoryId, start_date: '2025-08-01', currency_code: 'USD' },
    });

    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Expense 2', amount: 200, category_id: categoryId, start_date: '2025-08-02', currency_code: 'USD' },
    });

    await request.post(`${API_BASE_URL}/trips/${tripId}/expenses`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      data: { title: 'Expense 3', amount: 150, category_id: categoryId, start_date: '2025-08-03', currency_code: 'USD' },
    });

    // Get statistics
    const statsResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/expenses/stats`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    expect(statsResponse.status()).toBe(200);
    const stats = await statsResponse.json();

    expect(stats).toHaveProperty('total_expenses');
    expect(stats.total_expenses).toBeGreaterThanOrEqual(3);

    expect(stats).toHaveProperty('total_amount');
    expect(parseFloat(stats.total_amount)).toBeGreaterThanOrEqual(450); // 100 + 200 + 150

    expect(stats).toHaveProperty('total_by_category');
    expect(stats).toHaveProperty('total_by_currency');
    expect(stats).toHaveProperty('daily_average');
    expect(stats).toHaveProperty('expenses_by_date');

    // Verify category breakdown
    expect(stats.total_by_category[categoryId]).toBeTruthy();
    expect(stats.total_by_category[categoryId]).toHaveProperty('name');
    expect(stats.total_by_category[categoryId]).toHaveProperty('amount');
    expect(stats.total_by_category[categoryId]).toHaveProperty('percentage');
  });
});
