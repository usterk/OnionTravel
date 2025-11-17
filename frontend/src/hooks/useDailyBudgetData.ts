import { useState, useEffect } from 'react';
import { getDailyBudgetStatistics, getExpenses, getExpenseStatistics } from '@/lib/expenses-api';
import type { DailyBudgetStatistics, ExpenseStatistics } from '@/lib/expenses-api';
import { getCategories } from '@/lib/categories-api';
import type { Expense, Category } from '@/types/models';

export interface UseDailyBudgetDataOptions {
  tripId: number;
  selectedDate: string;
}

export interface UseDailyBudgetDataReturn {
  statistics: DailyBudgetStatistics | null;
  tripStatistics: ExpenseStatistics | null;
  dayExpenses: Expense[];
  categories: Category[];
  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingExpenses: boolean;
  error: string | null;
  refreshAll: () => Promise<void>;
  refreshStatistics: () => Promise<void>;
  refreshExpenses: () => Promise<void>;
}

/**
 * Custom hook for managing daily budget data fetching and state
 * Handles API calls for statistics, expenses, and categories
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

  /**
   * Load trip-level statistics
   */
  const loadTripStatistics = async () => {
    try {
      const stats = await getExpenseStatistics(tripId);
      setTripStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load trip statistics:', err);
    }
  };

  /**
   * Load categories for the trip
   */
  const loadCategories = async () => {
    try {
      const cats = await getCategories(tripId);
      setCategories(cats);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  };

  /**
   * Load daily statistics for selected date
   */
  const loadStatistics = async () => {
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
  };

  /**
   * Load expenses for selected date
   */
  const loadDayExpenses = async () => {
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
  };

  /**
   * Refresh statistics only
   */
  const refreshStatistics = async () => {
    await loadStatistics();
  };

  /**
   * Refresh expenses only
   */
  const refreshExpenses = async () => {
    await loadDayExpenses();
  };

  /**
   * Refresh all data (statistics, expenses, trip statistics)
   */
  const refreshAll = async () => {
    await Promise.all([
      loadStatistics(),
      loadDayExpenses(),
      loadTripStatistics(),
    ]);
  };

  // Load trip-level data once on mount
  useEffect(() => {
    loadTripStatistics();
    loadCategories();
  }, [tripId]);

  // Load date-specific data when selected date changes
  useEffect(() => {
    if (selectedDate) {
      loadStatistics();
      loadDayExpenses();
    }
  }, [tripId, selectedDate]);

  return {
    statistics,
    tripStatistics,
    dayExpenses,
    categories,
    isLoading,
    isRefreshing,
    isLoadingExpenses,
    error,
    refreshAll,
    refreshStatistics,
    refreshExpenses,
  };
}
