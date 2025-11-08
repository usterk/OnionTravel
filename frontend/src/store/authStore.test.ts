import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAuthStore.getState().logout();
  });

  it('should have initial state', () => {
    const { user, accessToken, refreshToken, isAuthenticated, isLoading } =
      useAuthStore.getState();

    expect(user).toBeNull();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(false);
  });

  it('should set auth when setAuth is called', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };
    const mockAccessToken = 'access_token_123';
    const mockRefreshToken = 'refresh_token_456';

    useAuthStore.getState().setAuth(mockUser, mockAccessToken, mockRefreshToken);

    const { user, accessToken, refreshToken, isAuthenticated, isLoading } =
      useAuthStore.getState();

    expect(user).toEqual(mockUser);
    expect(accessToken).toBe(mockAccessToken);
    expect(refreshToken).toBe(mockRefreshToken);
    expect(isAuthenticated).toBe(true);
    expect(isLoading).toBe(false);
  });

  it('should clear auth when logout is called', () => {
    // Set auth first
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };
    useAuthStore.getState().setAuth(mockUser, 'token1', 'token2');

    // Then logout
    useAuthStore.getState().logout();

    const { user, accessToken, refreshToken, isAuthenticated } =
      useAuthStore.getState();

    expect(user).toBeNull();
    expect(accessToken).toBeNull();
    expect(refreshToken).toBeNull();
    expect(isAuthenticated).toBe(false);
  });

  it('should set user when setUser is called', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      username: 'testuser',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    };

    useAuthStore.getState().setUser(mockUser);

    expect(useAuthStore.getState().user).toEqual(mockUser);
  });

  it('should set loading state', () => {
    useAuthStore.getState().setLoading(true);
    expect(useAuthStore.getState().isLoading).toBe(true);

    useAuthStore.getState().setLoading(false);
    expect(useAuthStore.getState().isLoading).toBe(false);
  });
});
