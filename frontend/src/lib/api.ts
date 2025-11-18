import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:7001/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from Zustand store persisted in localStorage
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      try {
        const { state } = JSON.parse(authStorage);
        if (state?.accessToken) {
          config.headers.Authorization = `Bearer ${state.accessToken}`;
        }
      } catch (error) {
        console.error('Failed to parse auth storage:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If token expired, try to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Get refresh token from storage
        const authStorage = localStorage.getItem('auth-storage');
        if (!authStorage) {
          throw new Error('No auth storage found');
        }

        const { state } = JSON.parse(authStorage);
        const refreshToken = state?.refreshToken;

        if (!refreshToken) {
          throw new Error('No refresh token found');
        }

        // Request new access token
        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = response.data;

        // Update auth storage with new tokens
        const updatedState = {
          ...state,
          accessToken: access_token,
          refreshToken: newRefreshToken,
        };
        localStorage.setItem('auth-storage', JSON.stringify({ state: updatedState, version: 0 }));

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear auth and redirect to login
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// Trip API functions
import type {
  TripCreate,
  TripUpdate,
  TripResponse,
  TripDetailResponse,
  TripListResponse,
  TripUserCreate,
  TripUserUpdate,
  TripMemberInfo,
} from '@/types/trip';
import type { UserResponse } from '@/types/user';

export const tripApi = {
  // Get all trips for the current user
  getTrips: async (): Promise<TripResponse[]> => {
    const response = await api.get<TripResponse[]>('/trips/');
    return response.data;
  },

  // Get trip by ID with full details (including members)
  getTrip: async (tripId: number): Promise<TripDetailResponse> => {
    const response = await api.get<TripDetailResponse>(`/trips/${tripId}`);
    return response.data;
  },

  // Create new trip
  createTrip: async (trip: TripCreate): Promise<TripResponse> => {
    const response = await api.post<TripResponse>('/trips/', trip);
    return response.data;
  },

  // Update trip
  updateTrip: async (tripId: number, trip: TripUpdate): Promise<TripResponse> => {
    const response = await api.put<TripResponse>(`/trips/${tripId}`, trip);
    return response.data;
  },

  // Delete trip
  deleteTrip: async (tripId: number): Promise<void> => {
    await api.delete(`/trips/${tripId}`);
  },

  // Get trip members
  getMembers: async (tripId: number): Promise<TripMemberInfo[]> => {
    const response = await api.get<TripMemberInfo[]>(`/trips/${tripId}/members`);
    return response.data;
  },

  // Add member to trip
  addMember: async (tripId: number, member: TripUserCreate): Promise<TripMemberInfo> => {
    const response = await api.post<TripMemberInfo>(`/trips/${tripId}/members`, member);
    return response.data;
  },

  // Update member role
  updateMember: async (
    tripId: number,
    userId: number,
    update: TripUserUpdate
  ): Promise<TripMemberInfo> => {
    const response = await api.put<TripMemberInfo>(
      `/trips/${tripId}/members/${userId}`,
      update
    );
    return response.data;
  },

  // Remove member from trip
  removeMember: async (tripId: number, userId: number): Promise<void> => {
    await api.delete(`/trips/${tripId}/members/${userId}`);
  },
};

// User API functions
export const userApi = {
  // Get current user
  getCurrentUser: async (): Promise<UserResponse> => {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  // Update current user profile
  updateProfile: async (data: {
    email?: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
  }): Promise<UserResponse> => {
    const response = await api.put<UserResponse>('/auth/me', data);
    return response.data;
  },

  // Search for users by email or username
  searchUsers: async (query: string): Promise<UserResponse[]> => {
    const response = await api.get<UserResponse[]>('/users/search', {
      params: { q: query },
    });
    return response.data;
  },
};

// API Key management functions
import type { ApiKeyCreate, ApiKeyResponse, ApiKeyWithSecret } from '@/types/apiKey';

export const apiKeyApi = {
  // Create a new API key
  createApiKey: async (data: ApiKeyCreate): Promise<ApiKeyWithSecret> => {
    const response = await api.post<ApiKeyWithSecret>('/api-keys', data);
    return response.data;
  },

  // List all API keys
  listApiKeys: async (): Promise<ApiKeyResponse[]> => {
    const response = await api.get<ApiKeyResponse[]>('/api-keys');
    return response.data;
  },

  // Delete an API key
  deleteApiKey: async (keyId: number): Promise<void> => {
    await api.delete(`/api-keys/${keyId}`);
  },
};
