export interface User {
  id: number;
  email: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  currency_code: string;
  total_budget?: number;
  daily_budget?: number;
  sort_categories_by_usage: boolean;
  owner_id: number;
  created_at: string;
  updated_at: string;
  owner?: User;
  members?: TripUser[];
  categories?: Category[];
}

export interface TripUser {
  id: number;
  trip_id: number;
  user_id: number;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
  user?: User;
}

export interface Category {
  id: number;
  trip_id: number;
  name: string;
  color: string;
  icon?: string;
  budget_percentage?: number;
  is_default: boolean;
  display_order: number;
  created_at: string;
}

export interface CategoryWithStats extends Category {
  total_spent: number;
  allocated_budget: number;
  remaining_budget: number;
  percentage_used: number;
}

export interface Expense {
  id: number;
  trip_id: number;
  category_id: number;
  user_id: number;
  title: string;
  description?: string;
  amount: number;
  currency_code: string;
  exchange_rate?: number;
  amount_in_trip_currency?: number;
  start_date: string;
  end_date?: string;
  payment_method?: string;
  location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  category?: Category;
  user?: User;
  attachments?: Attachment[];
}

export interface Attachment {
  id: number;
  expense_id: number;
  filename: string;
  filepath: string;
  mime_type?: string;
  file_size?: number;
  uploaded_at: string;
}

export interface ExchangeRate {
  id: number;
  from_currency: string;
  to_currency: string;
  rate: number;
  date: string;
  fetched_at: string;
}
