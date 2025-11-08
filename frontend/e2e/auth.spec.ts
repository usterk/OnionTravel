import { test, expect } from '@playwright/test';

/**
 * E2E Test 1: User Registration and Authentication Check
 *
 * This test verifies:
 * 1. User can register with valid credentials
 * 2. User is automatically logged in after registration
 * 3. User is redirected to dashboard
 * 4. User data is accessible via /me endpoint
 */
test.describe('User Registration', () => {
  test('should register new user and verify authentication', async ({ page }) => {
    // Generate unique user credentials for this test run
    const timestamp = Date.now();
    const testUser = {
      email: `test.user.${timestamp}@example.com`,
      username: `testuser${timestamp}`,
      password: 'SecurePassword123!',
      fullName: `Test User ${timestamp}`,
    };

    // Navigate to registration page
    await page.goto('/register');

    // Verify we're on the registration page
    await expect(page.locator('h3')).toContainText('Create an account');

    // Fill in registration form
    await page.fill('input#email', testUser.email);
    await page.fill('input#username', testUser.username);
    await page.fill('input#password', testUser.password);
    await page.fill('input#confirmPassword', testUser.password); // Confirm password
    await page.fill('input#full_name', testUser.fullName);

    // Setup request interceptor to capture API responses
    const authResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/auth/register') && response.status() === 201
    );

    // Submit registration form
    await page.click('button[type="submit"]');

    // Wait for successful registration response
    const authResponse = await authResponsePromise;
    const userData = await authResponse.json();

    // Verify user data from registration response
    expect(userData).toHaveProperty('id');
    expect(userData.email).toBe(testUser.email);
    expect(userData.username).toBe(testUser.username);
    expect(userData.full_name).toBe(testUser.fullName);
    expect(userData).not.toHaveProperty('password');
    expect(userData).not.toHaveProperty('hashed_password');

    // Wait for redirect to dashboard after successful registration
    await page.waitForURL('/');

    // Verify we're on the dashboard (authenticated route)
    await expect(page).toHaveURL('/');

    // Verify localStorage contains auth tokens
    const authStorage = await page.evaluate(() => {
      const storage = localStorage.getItem('auth-storage');
      return storage ? JSON.parse(storage) : null;
    });

    expect(authStorage).toBeTruthy();
    expect(authStorage.state).toHaveProperty('accessToken');
    expect(authStorage.state).toHaveProperty('refreshToken');
    expect(authStorage.state.isAuthenticated).toBe(true);
    expect(authStorage.state.user).toHaveProperty('email', testUser.email);

    // Make a request to /me endpoint to verify authentication
    const meResponse = await page.evaluate(async () => {
      const storage = localStorage.getItem('auth-storage');
      const { state } = storage ? JSON.parse(storage) : { state: {} };

      const response = await fetch('http://localhost:8001/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${state.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    // Verify /me endpoint returns correct user data
    expect(meResponse.status).toBe(200);
    expect(meResponse.data).toHaveProperty('id', userData.id);
    expect(meResponse.data).toHaveProperty('email', testUser.email);
    expect(meResponse.data).toHaveProperty('username', testUser.username);
    expect(meResponse.data).toHaveProperty('full_name', testUser.fullName);

    // Verify dashboard displays user information
    await expect(page.locator('text=' + testUser.email)).toBeVisible();
  });
});

/**
 * E2E Test 2: Login with Existing User and /me Endpoint Verification
 *
 * This test verifies:
 * 1. User can login with existing credentials
 * 2. Tokens are properly stored
 * 3. /me endpoint returns correct user data
 * 4. User is redirected to dashboard after login
 */
test.describe('User Login', () => {
  // Setup: Create a test user before running login tests
  test.beforeEach(async ({ request }) => {
    const timestamp = Date.now();
    const testUser = {
      email: `existing.user.${timestamp}@example.com`,
      username: `existing${timestamp}`,
      password: 'ExistingPassword123!',
      full_name: `Existing User ${timestamp}`,
    };

    // Create user via API
    const response = await request.post('http://localhost:8001/api/v1/auth/register', {
      data: testUser,
    });

    expect(response.status()).toBe(201);

    // Store test user credentials in the test context
    test.info().annotations.push({
      type: 'testUser',
      description: JSON.stringify(testUser),
    });
  });

  test('should login existing user and verify /me endpoint', async ({ page }) => {
    // Get test user from annotations
    const testUserAnnotation = test.info().annotations.find(a => a.type === 'testUser');
    const testUser = JSON.parse(testUserAnnotation!.description);

    // Navigate to login page
    await page.goto('/login');

    // Verify we're on the login page
    await expect(page.locator('h3')).toContainText('Welcome back');

    // Fill in login form
    await page.fill('input#email', testUser.email);
    await page.fill('input#password', testUser.password);

    // Setup request interceptor to capture login response
    const loginResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/v1/auth/login') && response.status() === 200
    );

    // Submit login form
    await page.click('button[type="submit"]');

    // Wait for successful login response
    const loginResponse = await loginResponsePromise;
    const tokenData = await loginResponse.json();

    // Verify token response structure
    expect(tokenData).toHaveProperty('access_token');
    expect(tokenData).toHaveProperty('refresh_token');
    expect(tokenData).toHaveProperty('token_type', 'bearer');

    // Wait for redirect to dashboard
    await page.waitForURL('/');

    // Verify we're on the dashboard
    await expect(page).toHaveURL('/');

    // Wait a bit for state to settle
    await page.waitForTimeout(500);

    // Verify localStorage contains auth data
    const authStorage = await page.evaluate(() => {
      const storage = localStorage.getItem('auth-storage');
      return storage ? JSON.parse(storage) : null;
    });

    expect(authStorage).toBeTruthy();
    expect(authStorage.state.accessToken).toBeTruthy();
    expect(authStorage.state.refreshToken).toBeTruthy();
    expect(authStorage.state.isAuthenticated).toBe(true);
    expect(authStorage.state.user.email).toBe(testUser.email);

    // Call /me endpoint directly to verify authentication
    const meResponse = await page.evaluate(async () => {
      const storage = localStorage.getItem('auth-storage');
      const { state } = storage ? JSON.parse(storage) : { state: {} };

      const response = await fetch('http://localhost:8001/api/v1/auth/me', {
        headers: {
          'Authorization': `Bearer ${state.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        status: response.status,
        data: await response.json(),
      };
    });

    // Verify /me endpoint returns 200 and correct user data
    expect(meResponse.status).toBe(200);
    expect(meResponse.data).toHaveProperty('id');
    expect(meResponse.data.email).toBe(testUser.email);
    expect(meResponse.data.username).toBe(testUser.username);
    expect(meResponse.data.full_name).toBe(testUser.full_name);
    expect(meResponse.data).toHaveProperty('created_at');
    expect(meResponse.data).toHaveProperty('updated_at');

    // Verify user data is NOT exposing sensitive information
    expect(meResponse.data).not.toHaveProperty('password');
    expect(meResponse.data).not.toHaveProperty('hashed_password');

    // Verify UI displays user information
    await expect(page.locator('text=' + testUser.email)).toBeVisible();

    // Test logout functionality
    await page.click('button:has-text("Logout")');

    // Verify we're redirected to login page after logout
    await page.waitForURL('/login');
    await expect(page).toHaveURL('/login');

    // Verify localStorage is cleared after logout
    const authStorageAfterLogout = await page.evaluate(() => {
      const storage = localStorage.getItem('auth-storage');
      return storage ? JSON.parse(storage) : null;
    });

    // After logout, auth state should be cleared
    if (authStorageAfterLogout) {
      expect(authStorageAfterLogout.state.isAuthenticated).toBe(false);
      expect(authStorageAfterLogout.state.accessToken).toBeNull();
    }
  });
});
