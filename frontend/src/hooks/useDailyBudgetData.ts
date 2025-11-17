import { useState, useEffect, useCallback } from 'react';
import { getDailyBudgetStatistics, getExpenses, getExpenseStatistics } from '@/lib/expenses-api';
import { getCategories } from '@/lib/categories-api';
import type { DailyBudgetStatistics, ExpenseStatistics } from '@/lib/expenses-api';
import type { Expense, Category } from '@/types/models';

export interface UseDailyBudgetDataOptions {
  tripId: number;
  selectedDate: string;
}

export interface UseDailyBudgetDataReturn {
  // Data
  statistics: DailyBudgetStatistics | null;
  tripStatistics: ExpenseStatistics | null;
  dayExpenses: Expense[];
  categories: Category[];

  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingExpenses: boolean;
  error: string | null;

  // Reload functions
  loadStatistics: () => Promise<void>;
  loadDayExpenses: () => Promise<void>;
  loadTripStatistics: () => Promise<void>;
  loadCategories: () => Promise<void>;
  reloadAll: () => Promise<void>;
}

/**
 * Custom hook for managing daily budget data fetching and state
 *
 * Handles:
 * - Fetching daily statistics for selected date
 * - Fetching trip-level statistics
 * - Fetching expenses for selected day
 * - Fetching categories
 * - Loading states and error handling
 * - Data refresh functions
 */
export function useDailyBudgetData({
  tripId,
  selectedDate,
}: UseDailyBudgetDataOptions): UseDailyBudgetDataReturn {
  const [statistics, setStatistics] = useState<DailyBudgetStatistics | null>(null);
  const [tripStatistics, setTripStatistics] = useState<ExpenseStatistics | null>(null);
  const [dayExpenses, setDayExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatistics = useCallback(async () => {
    // Only show loading state if we don't have any statistics yet (initial load)
    // For subsequent loads (day changes), use isRefreshing to show smooth transition
    if (!statistics) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const stats = await getDailyBudgetStatistics(tripId, selectedDate);
      setStatistics(stats);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load daily statistics');
      console.error('Failed to load daily statistics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [tripId, selectedDate, statistics]);

  const loadDayExpenses = useCallback(async () => {
    setIsLoadingExpenses(true);
    try {
      const expenses = await getExpenses(tripId, {
        start_date: selectedDate,
        end_date: selectedDate,
      });
      setDayExpenses(expenses);
    } catch (err: any) {
      console.error('Failed to load day expenses:', err);
      setDayExpenses([]);
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [tripId, selectedDate]);

  const loadTripStatistics = useCallback(async () => {
    try {
      const stats = await getExpenseStatistics(tripId);
      setTripStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load trip statistics:', err);
    }
  }, [tripId]);

  const loadCategories = useCallback(async () => {
    try {
      const cats = await getCategories(tripId);
      setCategories(cats);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  }, [tripId]);

  const reloadAll = useCallback(async () => {
    await Promise.all([
      loadStatistics(),
      loadDayExpenses(),
      loadTripStatistics(),
    ]);
  }, [loadStatistics, loadDayExpenses, loadTripStatistics]);

  // Load trip-level statistics and categories once on mount
  useEffect(() => {
    loadTripStatistics();
    loadCategories();
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load daily statistics and expenses when date changes
  useEffect(() => {
    if (selectedDate) {
      loadStatistics();
      loadDayExpenses();
    }
  }, [tripId, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    statistics,
    tripStatistics,
    dayExpenses,
    categories,
    isLoading,
    isRefreshing,
    isLoadingExpenses,
    error,
    loadStatistics,
    loadDayExpenses,
    loadTripStatistics,
    loadCategories,
    reloadAll,
  };
}
