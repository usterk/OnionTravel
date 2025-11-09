import { test, expect } from '@playwright/test';

/**
 * E2E Tests for User Profile Management
 *
 * Tests cover:
 * - Getting current user profile via API
 * - Updating user profile information
 * - User search functionality for adding to trips
 * - Email/username uniqueness validation
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('User Profile Management E2E Tests', () => {
  let testEmail: string;
  let testUsername: string;
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
    testEmail = `profiletest-${timestamp}@example.com`;
    testUsername = `profileuser${timestamp}`;

    // Register user
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail);
    await page.fill('input[id="username"]', testUsername);
    await page.fill('input[id="full_name"]', 'Profile Test User');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);

    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Extract auth token from localStorage
    const storage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      return authStorage ? JSON.parse(authStorage) : null;
    });

    if (storage && storage.state && storage.state.token) {
      authToken = storage.state.token;
    }

    expect(consoleErrors.length, `Console errors during setup: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Get current user profile via API', async ({ request }) => {
    // Test GET /api/v1/users/me endpoint
    const response = await request.get('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const userData = await response.json();

    expect(userData.email).toBe(testEmail);
    expect(userData.username).toBe(testUsername);
    expect(userData.full_name).toBe('Profile Test User');
    expect(userData).toHaveProperty('id');
    expect(userData).toHaveProperty('created_at');
    expect(userData).not.toHaveProperty('hashed_password');
  });

  test('Update user profile - full name', async ({ request }) => {
    // Test PUT /api/v1/users/me endpoint
    const response = await request.put('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        full_name: 'Updated Full Name',
      },
    });

    expect(response.ok()).toBeTruthy();
    const userData = await response.json();

    expect(userData.full_name).toBe('Updated Full Name');
    expect(userData.email).toBe(testEmail);
    expect(userData.username).toBe(testUsername);

    // Verify the change persists
    const getResponse = await request.get('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const updatedUserData = await getResponse.json();
    expect(updatedUserData.full_name).toBe('Updated Full Name');
  });

  test('Update user profile - avatar URL', async ({ request }) => {
    const response = await request.put('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        avatar_url: 'https://example.com/avatar.jpg',
      },
    });

    expect(response.ok()).toBeTruthy();
    const userData = await response.json();

    expect(userData.avatar_url).toBe('https://example.com/avatar.jpg');
  });

  test('Update user profile - username', async ({ request }) => {
    const newUsername = `${testUsername}_updated`;

    const response = await request.put('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        username: newUsername,
      },
    });

    expect(response.ok()).toBeTruthy();
    const userData = await response.json();

    expect(userData.username).toBe(newUsername);
  });

  test('Update user profile - email', async ({ request }) => {
    const timestamp = Date.now();
    const newEmail = `updated-${timestamp}@example.com`;

    const response = await request.put('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: newEmail,
      },
    });

    expect(response.ok()).toBeTruthy();
    const userData = await response.json();

    expect(userData.email).toBe(newEmail);
  });

  test('Update profile - duplicate username should fail', async ({ request, page }) => {
    // Create another user
    const timestamp2 = Date.now();
    const testEmail2 = `profiletest2-${timestamp2}@example.com`;
    const testUsername2 = `profileuser2${timestamp2}`;

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail2);
    await page.fill('input[id="username"]', testUsername2);
    await page.fill('input[id="full_name"]', 'Profile Test User 2');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Try to update first user's username to the second user's username
    const response = await request.put('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        username: testUsername2,
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.detail).toContain('Username already taken');
  });

  test('Update profile - duplicate email should fail', async ({ request, page }) => {
    // Create another user
    const timestamp2 = Date.now();
    const testEmail2 = `profiletest2-${timestamp2}@example.com`;
    const testUsername2 = `profileuser2${timestamp2}`;

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', testEmail2);
    await page.fill('input[id="username"]', testUsername2);
    await page.fill('input[id="full_name"]', 'Profile Test User 2');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Try to update first user's email to the second user's email
    const response = await request.put('http://localhost:8001/api/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        email: testEmail2,
      },
    });

    expect(response.status()).toBe(400);
    const errorData = await response.json();
    expect(errorData.detail).toContain('Email already registered');
  });

  test('Search users by username', async ({ request, page }) => {
    // Create multiple users for searching
    const users = [
      { email: 'searchuser1@example.com', username: 'searchable_user_1', name: 'Search User One' },
      { email: 'searchuser2@example.com', username: 'searchable_user_2', name: 'Search User Two' },
      { email: 'searchuser3@example.com', username: 'different_name_3', name: 'Search User Three' },
    ];

    for (const user of users) {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      await page.fill('input[id="email"]', user.email);
      await page.fill('input[id="username"]', user.username);
      await page.fill('input[id="full_name"]', user.name);
      await page.fill('input[id="password"]', TEST_PASSWORD);
      await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      // Logout
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
    }

    // Search for users with "searchable" in username
    const response = await request.get('http://localhost:8001/api/v1/users/search?q=searchable', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const results = await response.json();

    expect(Array.isArray(results)).toBeTruthy();
    expect(results.length).toBeGreaterThanOrEqual(2);

    // Verify search results contain the expected users
    const usernames = results.map((u: any) => u.username);
    expect(usernames).toContain('searchable_user_1');
    expect(usernames).toContain('searchable_user_2');
  });

  test('Search users by email', async ({ request }) => {
    // Search by email pattern
    const response = await request.get(`http://localhost:8001/api/v1/users/search?q=${testEmail.split('@')[0]}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const results = await response.json();

    expect(Array.isArray(results)).toBeTruthy();
    expect(results.length).toBeGreaterThanOrEqual(1);

    // Should find the current user
    const emails = results.map((u: any) => u.email);
    expect(emails).toContain(testEmail);
  });

  test('Search users by full name', async ({ request }) => {
    // Search by name
    const response = await request.get('http://localhost:8001/api/v1/users/search?q=Profile Test', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const results = await response.json();

    expect(Array.isArray(results)).toBeTruthy();
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  test('Search requires minimum 2 characters', async ({ request }) => {
    // Search with only 1 character should fail validation
    const response = await request.get('http://localhost:8001/api/v1/users/search?q=a', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.status()).toBe(422);
  });

  test('Search respects limit parameter', async ({ request }) => {
    // Search with limit of 2
    const response = await request.get('http://localhost:8001/api/v1/users/search?q=user&limit=2', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const results = await response.json();

    expect(Array.isArray(results)).toBeTruthy();
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('Unauthenticated requests should fail', async ({ request }) => {
    // Try to get profile without auth token
    const response = await request.get('http://localhost:8001/api/v1/users/me');

    expect(response.status()).toBe(401);
  });
});
