import api from './api';
import type { User } from '../types/models';

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/**
 * Register a new user
 */
export const register = async (data: RegisterData): Promise<User> => {
  const response = await api.post<User>('/auth/register', data);
  return response.data;
};

/**
 * Login user and get JWT tokens
 */
export const login = async (data: LoginData): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>('/auth/login', data);
  return response.data;
};

/**
 * Refresh access token using refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>('/auth/refresh', {
    refresh_token: refreshToken,
  });
  return response.data;
};

/**
 * Get current user info
 */
export const getCurrentUser = async (): Promise<User> => {
  const response = await api.get<User>('/auth/me');
  return response.data;
};
