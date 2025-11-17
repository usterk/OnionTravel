import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  getProgressColor,
  getStatusBadge,
  formatDate,
  getDateTitle,
  calculateDailyExpenseAmount,
  isDateInRange,
  getInitialTripDate,
} from './daily-budget-utils';
import type { DailyBudgetStatistics } from './expenses-api';

describe('daily-budget-utils', () => {
  describe('formatCurrency', () => {
    it('should format amount with currency code', () => {
      expect(formatCurrency(100, 'USD')).toBe('100 USD');
      expect(formatCurrency(123.456, 'EUR')).toBe('123.46 EUR');
    });

    it('should handle null and undefined', () => {
      expect(formatCurrency(null, 'USD')).toBe('0 USD');
      expect(formatCurrency(undefined, 'USD')).toBe('0 USD');
    });

    it('should handle string input', () => {
      expect(formatCurrency('100', 'USD')).toBe('100 USD');
      expect(formatCurrency('123.456', 'EUR')).toBe('123.46 EUR');
    });
  });

  describe('getProgressColor', () => {
    it('should return red color when over budget', () => {
      expect(getProgressColor(120, true)).toBe('bg-red-500');
      expect(getProgressColor(80, true)).toBe('bg-red-500');
    });

    it('should return yellow color when at or above 80%', () => {
      expect(getProgressColor(80, false)).toBe('bg-yellow-500');
      expect(getProgressColor(85, false)).toBe('bg-yellow-500');
      expect(getProgressColor(99, false)).toBe('bg-yellow-500');
    });

    it('should return green color when below 80%', () => {
      expect(getProgressColor(0, false)).toBe('bg-green-500');
      expect(getProgressColor(50, false)).toBe('bg-green-500');
      expect(getProgressColor(79, false)).toBe('bg-green-500');
    });
  });

  describe('getStatusBadge', () => {
    const createMockStats = (overrides?: Partial<DailyBudgetStatistics>): DailyBudgetStatistics => ({
      date: '2025-11-10',
      daily_budget: 100,
      adjusted_daily_budget: null,
      total_spent_today: 50,
      remaining_today: 50,
      percentage_used_today: 50,
      expense_count_today: 2,
      by_category_today: [],
      is_over_budget: false,
      days_into_trip: 3,
      total_days: 8,
      cumulative_savings_past: null,
      ...overrides,
    });

    it('should return "Not Started" for future days with no expenses', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const stats = createMockStats({
        date: tomorrowDate,
        expense_count_today: 0,
      });

      const badge = getStatusBadge(stats);
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Not Started');
      expect(badge?.style.backgroundColor).toBe('#9ca3af');
    });

    it('should return "Over Budget" when over budget', () => {
      const today = new Date().toISOString().split('T')[0];
      const stats = createMockStats({
        date: today,
        is_over_budget: true,
      });

      const badge = getStatusBadge(stats);
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Over Budget');
      expect(badge?.style.backgroundColor).toBe('#dc2626');
    });

    it('should return "Warning" when at or above 80%', () => {
      const today = new Date().toISOString().split('T')[0];
      const stats = createMockStats({
        date: today,
        percentage_used_today: 85,
      });

      const badge = getStatusBadge(stats);
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Warning');
      expect(badge?.style.backgroundColor).toBe('#f59e0b');
    });

    it('should return "On Track" for today when below 80%', () => {
      const today = new Date().toISOString().split('T')[0];
      const stats = createMockStats({
        date: today,
        percentage_used_today: 60,
      });

      const badge = getStatusBadge(stats);
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('On Track');
      expect(badge?.style.backgroundColor).toBe('#16a34a');
    });

    it('should return "Completed" for past days within budget', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const stats = createMockStats({
        date: yesterdayDate,
        percentage_used_today: 60,
      });

      const badge = getStatusBadge(stats);
      expect(badge).not.toBeNull();
      expect(badge?.label).toBe('Completed');
      expect(badge?.style.backgroundColor).toBe('#16a34a');
    });
  });

  describe('formatDate', () => {
    it('should format valid date string', () => {
      const result = formatDate('2025-11-10');
      expect(result).toContain('2025');
      expect(result).toContain('Nov');
    });

    it('should return original string for invalid date', () => {
      expect(formatDate('invalid-date')).toBe('invalid-date');
    });
  });

  describe('getDateTitle', () => {
    it('should return "Today" for current date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getDateTitle(today)).toBe('Today');
    });

    it('should return day of week for other dates', () => {
      const result = getDateTitle('2025-11-10'); // Monday
      expect(result).toBe('Monday');
    });

    it('should return original string for invalid date', () => {
      expect(getDateTitle('invalid-date')).toBe('invalid-date');
    });
  });

  describe('calculateDailyExpenseAmount', () => {
    it('should return total amount for single-day expense', () => {
      expect(calculateDailyExpenseAmount(100, null, null)).toBe(100);
      expect(calculateDailyExpenseAmount(100, '2025-11-10', null)).toBe(100);
    });

    it('should calculate daily amount for multi-day expense', () => {
      // 3 days: Nov 10, 11, 12
      const result = calculateDailyExpenseAmount(300, '2025-11-10', '2025-11-12');
      expect(result).toBe(100);
    });

    it('should handle single day range', () => {
      const result = calculateDailyExpenseAmount(100, '2025-11-10', '2025-11-10');
      expect(result).toBe(100);
    });
  });

  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      expect(isDateInRange('2025-11-10', '2025-11-01', '2025-11-30')).toBe(true);
      expect(isDateInRange('2025-11-01', '2025-11-01', '2025-11-30')).toBe(true);
      expect(isDateInRange('2025-11-30', '2025-11-01', '2025-11-30')).toBe(true);
    });

    it('should return false for date outside range', () => {
      expect(isDateInRange('2025-10-31', '2025-11-01', '2025-11-30')).toBe(false);
      expect(isDateInRange('2025-12-01', '2025-11-01', '2025-11-30')).toBe(false);
    });
  });

  describe('getInitialTripDate', () => {
    it('should return today if trip is ongoing', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const result = getInitialTripDate(
        yesterday.toISOString().split('T')[0],
        tomorrow.toISOString().split('T')[0]
      );

      expect(result).toBe(today);
    });

    it('should return trip start if trip hasnt started', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const tripStart = tomorrow.toISOString().split('T')[0];
      const tripEnd = nextWeek.toISOString().split('T')[0];

      const result = getInitialTripDate(tripStart, tripEnd);
      expect(result).toBe(tripStart);
    });

    it('should return trip end if trip has ended', () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tripStart = lastWeek.toISOString().split('T')[0];
      const tripEnd = yesterday.toISOString().split('T')[0];

      const result = getInitialTripDate(tripStart, tripEnd);
      expect(result).toBe(tripEnd);
    });
  });
});
