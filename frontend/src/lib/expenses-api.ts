import { api } from './api';
import type { Expense } from '@/types/models';

export interface ExpenseCreate {
  title: string;
  description?: string;
  amount: number;
  currency_code: string;
  category_id: number;
  start_date: string;
  end_date?: string;
  payment_method?: string;
  location?: string;
  notes?: string;
}

export interface ExpenseUpdate {
  title?: string;
  description?: string;
  amount?: number;
  currency_code?: string;
  category_id?: number;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  location?: string;
  notes?: string;
}

export interface ExpenseFilters {
  category_id?: number;
  user_id?: number;
  start_date?: string;
  end_date?: string;
  payment_method?: string;
  skip?: number;
  limit?: number;
}

export interface ExpenseStatistics {
  total_expenses: number;
  total_spent: number;
  total_budget: number;
  remaining_budget: number;
  percentage_used: number;
  by_category: Array<{
    category_id: number;
    category_name: string;
    category_color: string;
    category_icon: string;
    total_spent: number;
  }>;
  by_payment_method: Array<{
    payment_method: string;
    total_spent: number;
  }>;
  daily_spending: Array<{
    date: string;
    total_spent: number;
  }>;
  average_daily_spending: number;
}

export interface DailyBudgetStatistics {
  date: string;
  daily_budget: number | null;
  total_spent_today: number;
  remaining_today: number;
  percentage_used_today: number;
  expense_count_today: number;
  by_category_today: Array<{
    category_id: number;
    category_name: string;
    category_color: string;
    category_icon: string;
    total_spent: number;
    category_daily_budget: number;
    remaining_budget: number;
  }>;
  is_over_budget: boolean;
  days_into_trip: number;
  total_days: number;
  // Cumulative statistics for past completed days only (before target_date)
  cumulative_budget_past?: number | null;
  cumulative_spent_past?: number | null;
  cumulative_savings_past?: number | null; // Positive = saved, Negative = overspent
  // Adjusted daily budget based on remaining budget and days
  adjusted_daily_budget?: number | null; // Recommended daily budget for remaining days
}

/**
 * Get all expenses for a trip with optional filters
 */
export const getExpenses = async (
  tripId: number,
  filters?: ExpenseFilters
): Promise<Expense[]> => {
  const params = new URLSearchParams();

  if (filters?.category_id) params.append('category_id', filters.category_id.toString());
  if (filters?.user_id) params.append('user_id', filters.user_id.toString());
  if (filters?.start_date) params.append('start_date', filters.start_date);
  if (filters?.end_date) params.append('end_date', filters.end_date);
  if (filters?.payment_method) params.append('payment_method', filters.payment_method);
  if (filters?.skip !== undefined) params.append('skip', filters.skip.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

  const queryString = params.toString();
  const url = `/trips/${tripId}/expenses${queryString ? `?${queryString}` : ''}`;

  const response = await api.get<Expense[]>(url);
  return response.data;
};

/**
 * Get a specific expense
 */
export const getExpense = async (tripId: number, expenseId: number): Promise<Expense> => {
  const response = await api.get<Expense>(`/trips/${tripId}/expenses/${expenseId}`);
  return response.data;
};

/**
 * Create a new expense
 */
export const createExpense = async (
  tripId: number,
  data: ExpenseCreate
): Promise<Expense> => {
  const response = await api.post<Expense>(`/trips/${tripId}/expenses`, data);
  return response.data;
};

/**
 * Update an expense
 */
export const updateExpense = async (
  tripId: number,
  expenseId: number,
  data: ExpenseUpdate
): Promise<Expense> => {
  const response = await api.put<Expense>(`/trips/${tripId}/expenses/${expenseId}`, data);
  return response.data;
};

/**
 * Delete an expense
 */
export const deleteExpense = async (tripId: number, expenseId: number): Promise<void> => {
  await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
};

/**
 * Get expense statistics for a trip
 */
export const getExpenseStatistics = async (tripId: number): Promise<ExpenseStatistics> => {
  const response = await api.get<ExpenseStatistics>(`/trips/${tripId}/expenses/stats`);
  return response.data;
};

/**
 * Get daily budget statistics for a specific date
 * @param tripId - Trip ID
 * @param targetDate - Optional date in YYYY-MM-DD format (defaults to today)
 */
export const getDailyBudgetStatistics = async (
  tripId: number,
  targetDate?: string
): Promise<DailyBudgetStatistics> => {
  const params = new URLSearchParams();
  if (targetDate) params.append('target_date', targetDate);

  const queryString = params.toString();
  const url = `/trips/${tripId}/expenses/daily-stats${queryString ? `?${queryString}` : ''}`;

  const response = await api.get<DailyBudgetStatistics>(url);
  return response.data;
};
