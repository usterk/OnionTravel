import { formatNumber } from '@/lib/utils';
import { format } from 'date-fns';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';

/**
 * Format currency with amount and currency code
 */
export function formatCurrency(amount: number | string | undefined | null, currencyCode: string): string {
  const value = Number(amount ?? 0);
  return `${formatNumber(value)} ${currencyCode}`;
}

/**
 * Get progress bar color based on percentage and over-budget status
 */
export function getProgressColor(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Get status badge configuration based on statistics
 */
export interface StatusBadge {
  label: string;
  style: {
    backgroundColor: string;
    color: string;
  };
}

export function getStatusBadge(statistics: DailyBudgetStatistics): StatusBadge | null {
  const today = new Date().toISOString().split('T')[0];
  const isPastDay = statistics.date < today;
  const isFutureDay = statistics.date > today;

  // Future days
  if (isFutureDay) {
    // No expenses yet - show placeholder
    if (statistics.expense_count_today === 0) {
      return {
        label: 'Not Started',
        style: { backgroundColor: '#9ca3af', color: 'white' } // gray-400
      };
    }
    // Has expenses - show normal budget status
  }

  // Budget status (for today and past days with expenses, future days with expenses)
  if (statistics.is_over_budget) {
    return {
      label: 'Over Budget',
      style: { backgroundColor: '#dc2626', color: 'white' } // red-600
    };
  } else if (statistics.percentage_used_today >= 80) {
    return {
      label: 'Warning',
      style: { backgroundColor: '#f59e0b', color: 'white' } // amber-500
    };
  } else {
    // Past days that stayed within budget - show "Completed"
    // Today and future days - show "On Track"
    return {
      label: isPastDay ? 'Completed' : 'On Track',
      style: { backgroundColor: '#16a34a', color: 'white' } // green-600
    };
  }
}

/**
 * Format date string to human-readable format
 */
export function formatDate(dateString: string): string {
  try {
    return format(new Date(dateString), 'EEEE, MMM d, yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Get date title - "Today" or day of week
 */
export function getDateTitle(date: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (date === today) {
    return 'Today';
  }
  // Show only day of week (e.g., "Monday", "Friday")
  try {
    return format(new Date(date), 'EEEE');
  } catch {
    return date;
  }
}

/**
 * Calculate daily amount for multi-day expenses
 */
export function calculateDailyExpenseAmount(
  totalAmount: number,
  startDate: string | null,
  endDate: string | null
): number {
  if (!startDate || !endDate) {
    return totalAmount;
  }

  const daysDiff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return totalAmount / daysDiff;
}

/**
 * Determine if date is within trip range
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Get initial date for trip based on today and trip range
 */
export function getInitialTripDate(tripStartDate: string, tripEndDate: string): string {
  const today = new Date().toISOString().split('T')[0];

  if (today < tripStartDate) {
    // Trip hasn't started yet - show first day
    return tripStartDate;
  } else if (today > tripEndDate) {
    // Trip has ended - show last day
    return tripEndDate;
  } else {
    // Trip is ongoing - show today
    return today;
  }
}
