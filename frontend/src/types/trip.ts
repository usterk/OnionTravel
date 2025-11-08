export type TripRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TripBase {
  name: string;
  description?: string | null;
  start_date: string; // ISO date string
  end_date: string; // ISO date string
  currency_code: string; // ISO 4217 (e.g., USD, EUR, PLN)
  total_budget?: number | null;
  daily_budget?: number | null;
}

export interface TripCreate extends TripBase {}

export interface TripUpdate {
  name?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string;
  currency_code?: string;
  total_budget?: number | null;
  daily_budget?: number | null;
}

export interface TripResponse extends TripBase {
  id: number;
  owner_id: number;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export interface TripMemberInfo {
  id: number;
  user_id: number;
  username: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  role: TripRole;
  joined_at: string; // ISO datetime string
}

export interface TripDetailResponse extends TripResponse {
  members: TripMemberInfo[];
}

export interface TripListResponse {
  trips: TripResponse[];
  total: number;
}

export interface TripUserCreate {
  user_id: number;
}

export interface TripUserUpdate {
  role: TripRole;
}

export interface TripUserResponse {
  id: number;
  trip_id: number;
  user_id: number;
  role: TripRole;
  joined_at: string;
}
