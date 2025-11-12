export interface UserResponse {
  id: number;
  email: string;
  username: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at: string; // ISO datetime string
  updated_at: string; // ISO datetime string
}

export interface UserCreate {
  email: string;
  username: string;
  full_name?: string | null;
  password: string;
}

export interface UserUpdate {
  email?: string;
  username?: string;
  full_name?: string | null;
  avatar_url?: string | null;
}
