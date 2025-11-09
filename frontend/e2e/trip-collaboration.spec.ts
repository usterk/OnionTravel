import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Trip Collaboration - Adding Users to Trips
 *
 * Tests cover:
 * - Searching for users to add to trips
 * - Adding members to trips via API
 * - Different user roles (owner, admin, member, viewer)
 * - Member viewing shared trips
 * - Updating member roles
 * - Removing members from trips
 * - Permission checks and validation
 */

const TEST_PASSWORD = 'TestPassword123!';

test.describe('Trip Collaboration E2E Tests', () => {
  let owner: { email: string; username: string; token: string; id: number };
  let member: { email: string; username: string; token: string; id: number };
  let tripId: string;
  const consoleErrors: string[] = [];

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Track console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const timestamp = Date.now();

    // Create owner (User 1)
    owner = {
      email: `tripowner-${timestamp}@example.com`,
      username: `tripowner${timestamp}`,
      token: '',
      id: 0,
    };

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', owner.email);
    await page.fill('input[id="username"]', owner.username);
    await page.fill('input[id="full_name"]', 'Trip Owner');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get owner's token
    const ownerStorage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      return authStorage ? JSON.parse(authStorage) : null;
    });
    if (ownerStorage?.state?.token) {
      owner.token = ownerStorage.state.token;
      owner.id = ownerStorage.state.user?.id || 0;
    }

    // Create member (User 2)
    member = {
      email: `tripmember-${timestamp}@example.com`,
      username: `tripmember${timestamp}`,
      token: '',
      id: 0,
    };

    // Logout owner
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Register member
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', member.email);
    await page.fill('input[id="username"]', member.username);
    await page.fill('input[id="full_name"]', 'Trip Member');
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.fill('input[id="confirmPassword"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Get member's token
    const memberStorage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      return authStorage ? JSON.parse(authStorage) : null;
    });
    if (memberStorage?.state?.token) {
      member.token = memberStorage.state.token;
      member.id = memberStorage.state.user?.id || 0;
    }

    await context.close();
  });

  test('Owner creates a trip', async ({ page }) => {
    // Login as owner
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', owner.email);
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Create trip
    await page.goto('/trips/new');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="name"]', 'Shared Adventure Trip');
    await page.fill('input[id="start_date"]', '2025-10-01');
    await page.fill('input[id="end_date"]', '2025-10-10');
    await page.selectOption('select[id="currency_code"]', 'USD');
    await page.fill('input[id="total_budget"]', '2500');

    await page.getByRole('button', { name: /create trip/i }).click();
    await page.waitForURL('/trips', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Open the trip to get ID
    await page.getByText('Shared Adventure Trip').click();
    await page.waitForURL(/\/trips\/\d+/);

    const url = page.url();
    tripId = url.match(/\/trips\/(\d+)/)?.[1] || '';

    expect(tripId).toBeTruthy();
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });

  test('Owner can search for other users', async ({ request }) => {
    // Search for the member user
    const response = await request.get(
      `http://localhost:8001/api/v1/users/search?q=${member.username}`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const users = await response.json();

    expect(Array.isArray(users)).toBeTruthy();
    expect(users.length).toBeGreaterThanOrEqual(1);

    // Verify we found the member
    const foundMember = users.find((u: any) => u.username === member.username);
    expect(foundMember).toBeTruthy();
    expect(foundMember.email).toBe(member.email);
    expect(foundMember.full_name).toBe('Trip Member');
  });

  test('Owner adds member to trip via API', async ({ request }) => {
    // Add member to trip
    const response = await request.post(
      `http://localhost:8001/api/v1/trips/${tripId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          user_id: member.id,
          role: 'member',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const tripUser = await response.json();

    expect(tripUser.user_id).toBe(member.id);
    expect(tripUser.trip_id).toBe(parseInt(tripId));
    expect(tripUser.role).toBe('member');
  });

  test('Member can see shared trip in their trips list', async ({ request }) => {
    // Get member's trips
    const response = await request.get('http://localhost:8001/api/v1/trips', {
      headers: {
        'Authorization': `Bearer ${member.token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const trips = await response.json();

    expect(Array.isArray(trips)).toBeTruthy();

    // Find the shared trip
    const sharedTrip = trips.find((t: any) => t.id === parseInt(tripId));
    expect(sharedTrip).toBeTruthy();
    expect(sharedTrip.name).toBe('Shared Adventure Trip');
  });

  test('Member can view trip details', async ({ request }) => {
    // Member accesses trip details
    const response = await request.get(`http://localhost:8001/api/v1/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${member.token}`,
      },
    });

    expect(response.ok()).toBeTruthy();
    const trip = await response.json();

    expect(trip.id).toBe(parseInt(tripId));
    expect(trip.name).toBe('Shared Adventure Trip');
    expect(trip.members).toBeDefined();
    expect(Array.isArray(trip.members)).toBeTruthy();

    // Verify both owner and member are in members list
    const memberUsernames = trip.members.map((m: any) => m.username);
    expect(memberUsernames).toContain(owner.username);
    expect(memberUsernames).toContain(member.username);

    // Check roles
    const ownerMember = trip.members.find((m: any) => m.username === owner.username);
    const regularMember = trip.members.find((m: any) => m.username === member.username);

    expect(ownerMember.role).toBe('owner');
    expect(regularMember.role).toBe('member');
  });

  test('Member can add expenses to shared trip', async ({ request }) => {
    // Member creates an expense
    const response = await request.post(
      `http://localhost:8001/api/v1/trips/${tripId}/expenses`,
      {
        headers: {
          'Authorization': `Bearer ${member.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          title: 'Member Added Expense',
          amount: 50.00,
          currency_code: 'USD',
          category_id: 1,
          start_date: '2025-10-05',
          payment_method: 'Cash',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const expense = await response.json();

    expect(expense.title).toBe('Member Added Expense');
    expect(expense.user_id).toBe(member.id); // Created by member
  });

  test('Owner can see expenses created by member', async ({ request }) => {
    // Get trip expenses as owner
    const response = await request.get(
      `http://localhost:8001/api/v1/trips/${tripId}/expenses`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const expenses = await response.json();

    // Find the expense created by member
    const memberExpense = expenses.find((e: any) => e.title === 'Member Added Expense');
    expect(memberExpense).toBeTruthy();
    expect(memberExpense.user_id).toBe(member.id);
  });

  test('Owner can update member role to admin', async ({ request }) => {
    // Update member role to admin
    const response = await request.put(
      `http://localhost:8001/api/v1/trips/${tripId}/members/${member.id}`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          role: 'admin',
        },
      }
    );

    expect(response.ok()).toBeTruthy();
    const updatedTripUser = await response.json();

    expect(updatedTripUser.role).toBe('admin');
  });

  test('Admin member can now add other users', async ({ request }) => {
    // Create a third user
    const timestamp = Date.now();
    const thirdUser = {
      email: `thirduser-${timestamp}@example.com`,
      username: `thirduser${timestamp}`,
      password: TEST_PASSWORD,
    };

    // Register third user via API
    const registerResponse = await request.post('http://localhost:8001/api/v1/auth/register', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: thirdUser.email,
        username: thirdUser.username,
        full_name: 'Third User',
        password: thirdUser.password,
      },
    });

    expect(registerResponse.ok()).toBeTruthy();
    const thirdUserData = await registerResponse.json();

    // Admin (member with admin role) adds third user to trip
    const addResponse = await request.post(
      `http://localhost:8001/api/v1/trips/${tripId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${member.token}`, // Member is now admin
          'Content-Type': 'application/json',
        },
        data: {
          user_id: thirdUserData.id,
          role: 'viewer',
        },
      }
    );

    expect(addResponse.ok()).toBeTruthy();
    const addedUser = await addResponse.json();

    expect(addedUser.user_id).toBe(thirdUserData.id);
    expect(addedUser.role).toBe('viewer');
  });

  test('Cannot add same user twice to trip', async ({ request }) => {
    // Try to add member again (already in trip)
    const response = await request.post(
      `http://localhost:8001/api/v1/trips/${tripId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          user_id: member.id,
          role: 'member',
        },
      }
    );

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.detail).toContain('already a member');
  });

  test('Non-admin member cannot add users', async ({ request }) => {
    // Change member role back to 'member'
    await request.put(
      `http://localhost:8001/api/v1/trips/${tripId}/members/${member.id}`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          role: 'member',
        },
      }
    );

    // Create another user
    const timestamp = Date.now();
    const fourthUser = {
      email: `fourthuser-${timestamp}@example.com`,
      username: `fourthuser${timestamp}`,
    };

    const registerResponse = await request.post('http://localhost:8001/api/v1/auth/register', {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        email: fourthUser.email,
        username: fourthUser.username,
        full_name: 'Fourth User',
        password: TEST_PASSWORD,
      },
    });

    const fourthUserData = await registerResponse.json();

    // Regular member tries to add user (should fail)
    const addResponse = await request.post(
      `http://localhost:8001/api/v1/trips/${tripId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${member.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          user_id: fourthUserData.id,
          role: 'viewer',
        },
      }
    );

    expect(addResponse.status()).toBe(403);
  });

  test('Owner can remove member from trip', async ({ request }) => {
    // Owner removes member
    const response = await request.delete(
      `http://localhost:8001/api/v1/trips/${tripId}/members/${member.id}`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
        },
      }
    );

    expect(response.status()).toBe(204);

    // Verify member is removed
    const tripResponse = await request.get(`http://localhost:8001/api/v1/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${owner.token}`,
      },
    });

    const trip = await tripResponse.json();
    const memberUsernames = trip.members.map((m: any) => m.username);
    expect(memberUsernames).not.toContain(member.username);
  });

  test('Removed member cannot access trip anymore', async ({ request }) => {
    // Member tries to access trip
    const response = await request.get(`http://localhost:8001/api/v1/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${member.token}`,
      },
    });

    expect(response.status()).toBe(403);
    const error = await response.json();
    expect(error.detail).toContain("don't have access");
  });

  test('Cannot remove trip owner', async ({ request }) => {
    // Try to remove owner (should fail)
    const response = await request.delete(
      `http://localhost:8001/api/v1/trips/${tripId}/members/${owner.id}`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
        },
      }
    );

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.detail).toContain('Cannot remove trip owner');
  });

  test('Viewer role has read-only access', async ({ request }) => {
    // Find a viewer user from previous tests
    const tripResponse = await request.get(`http://localhost:8001/api/v1/trips/${tripId}`, {
      headers: {
        'Authorization': `Bearer ${owner.token}`,
      },
    });

    const trip = await tripResponse.json();
    const viewer = trip.members.find((m: any) => m.role === 'viewer');

    if (viewer) {
      // Get viewer's token (need to login as that user)
      const loginResponse = await request.post('http://localhost:8001/api/v1/auth/login', {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: viewer.email,
          password: TEST_PASSWORD,
        },
      });

      const loginData = await loginResponse.json();
      const viewerToken = loginData.access_token;

      // Viewer can view trip
      const viewResponse = await request.get(`http://localhost:8001/api/v1/trips/${tripId}`, {
        headers: {
          'Authorization': `Bearer ${viewerToken}`,
        },
      });
      expect(viewResponse.ok()).toBeTruthy();

      // Viewer cannot update trip
      const updateResponse = await request.put(
        `http://localhost:8001/api/v1/trips/${tripId}`,
        {
          headers: {
            'Authorization': `Bearer ${viewerToken}`,
            'Content-Type': 'application/json',
          },
          data: {
            name: 'Updated Name',
          },
        }
      );
      expect(updateResponse.status()).toBe(403);
    }
  });

  test('UI: Member can see shared trip in trips list', async ({ page }) => {
    // Add member back to trip first
    await page.request.post(
      `http://localhost:8001/api/v1/trips/${tripId}/members`,
      {
        headers: {
          'Authorization': `Bearer ${owner.token}`,
          'Content-Type': 'application/json',
        },
        data: {
          user_id: member.id,
          role: 'member',
        },
      }
    );

    // Login as member
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[id="email"]', member.email);
    await page.fill('input[id="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');

    // Navigate to trips page
    await page.goto('/trips');
    await page.waitForLoadState('networkidle');

    // Verify shared trip appears
    await expect(page.getByText('Shared Adventure Trip')).toBeVisible();
  });

  test('No console errors throughout collaboration tests', async () => {
    expect(consoleErrors.length, `Console errors: ${consoleErrors.join(', ')}`).toBe(0);
  });
});
