import { test, expect } from '@playwright/test';

const TEST_PASSWORD = 'TestPassword123!';
const API_BASE_URL = 'http://localhost:8001/api/v1';

test.describe('Category Management E2E Tests (API)', () => {
  let testEmail: string;
  let testUsername: string;
  let accessToken: string;
  let tripId: number;

  test.beforeEach(async ({ request }) => {
    // Generate unique credentials with timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    testEmail = `cattest-${timestamp}-${random}@example.com`;
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
        name: 'Category Test Trip',
        description: 'Trip for testing categories',
        start_date: '2025-07-01',
        end_date: '2025-07-15',
        currency_code: 'USD',
        total_budget: 5000,
      },
    });
    expect(tripResponse.status()).toBe(201);
    const tripData = await tripResponse.json();
    tripId = tripData.id;
  });

  test('Default categories are created when trip is created', async ({ request }) => {
    // Get categories
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();

    // Verify default categories exist
    expect(categories.length).toBe(8);

    const expectedCategories = [
      'Accommodation',
      'Transportation',
      'Food & Dining',
      'Activities',
      'Shopping',
      'Health & Medical',
      'Entertainment',
      'Other'
    ];

    const categoryNames = categories.map((cat: any) => cat.name);
    for (const expectedName of expectedCategories) {
      expect(categoryNames).toContain(expectedName);
    }

    // Verify all are marked as default
    categories.forEach((cat: any) => {
      expect(cat.is_default).toBe(true);
    });
  });

  test('User can view category list for a trip', async ({ request }) => {
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();

    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty('id');
    expect(categories[0]).toHaveProperty('name');
    expect(categories[0]).toHaveProperty('color');
    expect(categories[0]).toHaveProperty('budget_percentage');
  });

  test('Category colors are assigned correctly', async ({ request }) => {
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();

    // Verify each category has a valid hex color
    categories.forEach((cat: any) => {
      expect(cat.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    // Verify specific default colors
    const accommodation = categories.find((cat: any) => cat.name === 'Accommodation');
    expect(accommodation).toBeTruthy();
    expect(accommodation.color).toBe('#3B82F6');
  });

  test('Budget percentages sum to 100%', async ({ request }) => {
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();

    // Calculate sum of budget percentages
    const totalPercentage = categories.reduce((sum: number, cat: any) => {
      return sum + (cat.budget_percentage || 0);
    }, 0);

    expect(totalPercentage).toBe(100);
  });

  test('Default category markers are visible in data', async ({ request }) => {
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();

    // Count default categories
    const defaultCategories = categories.filter((cat: any) => cat.is_default === true);
    expect(defaultCategories.length).toBe(8);

    // Verify all default categories have correct properties
    defaultCategories.forEach((cat: any) => {
      expect(cat).toHaveProperty('is_default', true);
      expect(cat).toHaveProperty('name');
      expect(cat).toHaveProperty('color');
      expect(cat).toHaveProperty('budget_percentage');
    });
  });

  test('Default budget allocations are correct', async ({ request }) => {
    const categoriesResponse = await request.get(`${API_BASE_URL}/trips/${tripId}/categories`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(categoriesResponse.status()).toBe(200);
    const categories = await categoriesResponse.json();

    // Verify specific budget allocations
    const accommodation = categories.find((cat: any) => cat.name === 'Accommodation');
    expect(accommodation.budget_percentage).toBe(35);

    const transportation = categories.find((cat: any) => cat.name === 'Transportation');
    expect(transportation.budget_percentage).toBe(20);

    const food = categories.find((cat: any) => cat.name === 'Food & Dining');
    expect(food.budget_percentage).toBe(25);

    const activities = categories.find((cat: any) => cat.name === 'Activities');
    expect(activities.budget_percentage).toBe(15);

    const shopping = categories.find((cat: any) => cat.name === 'Shopping');
    expect(shopping.budget_percentage).toBe(5);
  });
});
