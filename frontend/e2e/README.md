# E2E Tests - OnionTravel Frontend

## Overview

This directory contains end-to-end tests using Playwright for the OnionTravel application.

## Test Coverage

### Test 1: User Registration and Authentication (`auth.spec.ts`)
**Test Name:** `should register new user and verify authentication`

**What it tests:**
1. ✅ User can register with valid credentials
2. ✅ User is automatically logged in after registration
3. ✅ User is redirected to dashboard (`/`)
4. ✅ Access token and refresh token are stored in localStorage
5. ✅ User data is accessible via `/api/v1/auth/me` endpoint
6. ✅ Response does not expose sensitive data (password, hashed_password)
7. ✅ Dashboard displays user email

**Test Flow:**
```
Register Page → Fill Form → Submit →
API: POST /api/v1/auth/register (201) →
Redirect to Dashboard →
Verify localStorage →
Call /api/v1/auth/me →
Verify User Data
```

### Test 2: Login with Existing User (`auth.spec.ts`)
**Test Name:** `should login existing user and verify /me endpoint`

**What it tests:**
1. ✅ User can login with existing credentials
2. ✅ JWT tokens (access & refresh) are returned
3. ✅ Tokens are properly stored in localStorage
4. ✅ User is redirected to dashboard after login
5. ✅ `/api/v1/auth/me` endpoint returns 200 with correct user data
6. ✅ Response structure is correct (id, email, username, full_name, timestamps)
7. ✅ Sensitive data is not exposed
8. ✅ UI displays user information
9. ✅ Logout functionality works correctly
10. ✅ Auth state is cleared after logout

**Test Flow:**
```
Create User (API) →
Login Page → Fill Form → Submit →
API: POST /api/v1/auth/login (200) →
Redirect to Dashboard →
Verify localStorage →
Call /api/v1/auth/me →
Verify User Data →
Logout →
Verify Cleanup
```

## Running Tests

### Prerequisites
- Backend must be running on `http://localhost:8001`
- Frontend dev server on `http://localhost:5174`

### Commands

```bash
# Run all e2e tests (headless)
npm run test:e2e

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in headed mode (see browser)
npm run test:e2e:headed
```

### Automatic Server Startup

The Playwright configuration automatically starts the frontend dev server before running tests. Make sure the backend is running separately.

## Test Reports

After running tests, you can view the HTML report:

```bash
npx playwright show-report
```

## Configuration

Tests are configured in `playwright.config.ts`:
- Base URL: `http://localhost:5174`
- Browser: Chromium
- Screenshots: On failure
- Trace: On first retry

## Notes

- Tests use unique timestamps to generate test user credentials
- Each test creates its own user to avoid conflicts
- Tests verify both UI behavior and API responses
- Authentication flow is tested end-to-end including token management
