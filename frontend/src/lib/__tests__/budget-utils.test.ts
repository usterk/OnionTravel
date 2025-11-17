import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  getProgressColor,
  getBudgetColor,
  getStatusBadge,
  formatDate,
  getDateTitle,
  calculateDailyAmount,
} from '../budget-utils';
import type { DailyBudgetStatistics } from '../expenses-api';

describe('budget-utils', () => {
  describe('formatCurrency', () => {
    it('should format number with currency code', () => {
      expect(formatCurrency(123.45, 'USD')).toBe('123.45 USD');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0, 'EUR')).toBe('0 EUR');
    });

    it('should handle null/undefined as zero', () => {
      expect(formatCurrency(null, 'USD')).toBe('0 USD');
      expect(formatCurrency(undefined, 'USD')).toBe('0 USD');
    });

    it('should handle string numbers', () => {
      expect(formatCurrency('100.50', 'GBP')).toBe('100.5 GBP');
    });
  });

  describe('getProgressColor', () => {
    it('should return red for over budget', () => {
      expect(getProgressColor(120, true)).toBe('bg-red-500');
    });

    it('should return yellow for 80%+ usage', () => {
      expect(getProgressColor(85, false)).toBe('bg-yellow-500');
    });

    it('should return green for under 80%', () => {
      expect(getProgressColor(50, false)).toBe('bg-green-500');
    });
  });

  describe('getBudgetColor', () => {
    it('should return red hex for over budget', () => {
      expect(getBudgetColor(120, true)).toBe('#ef4444');
    });

    it('should return amber hex for 80%+ usage', () => {
      expect(getBudgetColor(90, false)).toBe('#f59e0b');
    });

    it('should return green hex for under 80%', () => {
      expect(getBudgetColor(60, false)).toBe('#10b981');
    });
  });

  describe('getStatusBadge', () => {
    const createMockStats = (overrides: Partial<DailyBudgetStatistics> = {}): DailyBudgetStatistics => ({
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
      const stats = createMockStats({
        date: tomorrow.toISOString().split('T')[0],
        expense_count_today: 0,
      });

      const badge = getStatusBadge(stats);
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
      expect(badge?.label).toBe('Over Budget');
      expect(badge?.style.backgroundColor).toBe('#dc2626');
    });

    it('should return "Warning" for 80%+ usage', () => {
      const today = new Date().toISOString().split('T')[0];
      const stats = createMockStats({
        date: today,
        percentage_used_today: 85,
      });

      const badge = getStatusBadge(stats);
      expect(badge?.label).toBe('Warning');
      expect(badge?.style.backgroundColor).toBe('#f59e0b');
    });

    it('should return "On Track" for today under 80%', () => {
      const today = new Date().toISOString().split('T')[0];
      const stats = createMockStats({
        date: today,
        percentage_used_today: 60,
      });

      const badge = getStatusBadge(stats);
      expect(badge?.label).toBe('On Track');
      expect(badge?.style.backgroundColor).toBe('#16a34a');
    });

    it('should return "Completed" for past days within budget', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const stats = createMockStats({
        date: yesterday.toISOString().split('T')[0],
        percentage_used_today: 70,
      });

      const badge = getStatusBadge(stats);
      expect(badge?.label).toBe('Completed');
      expect(badge?.style.backgroundColor).toBe('#16a34a');
    });
  });

  describe('formatDate', () => {
    it('should format date to readable format', () => {
      const result = formatDate('2025-11-10');
      expect(result).toMatch(/Sunday, Nov 10, 2025/);
    });

    it('should return original string on error', () => {
      const invalidDate = 'invalid-date';
      expect(formatDate(invalidDate)).toBe(invalidDate);
    });
  });

  describe('getDateTitle', () => {
    it('should return "Today" for current date', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(getDateTitle(today)).toBe('Today');
    });

    it('should return day of week for other dates', () => {
      const result = getDateTitle('2025-11-10');
      expect(result).toBe('Sunday');
    });

    it('should return original string on invalid date', () => {
      const invalidDate = 'invalid-date';
      expect(getDateTitle(invalidDate)).toBe(invalidDate);
    });
  });

  describe('calculateDailyAmount', () => {
    it('should return total for single-day expense', () => {
      expect(calculateDailyAmount(300, '2025-11-10', null)).toBe(300);
    });

    it('should calculate daily amount for multi-day expense', () => {
      // 3 days: Nov 10, 11, 12
      const result = calculateDailyAmount(300, '2025-11-10', '2025-11-12');
      expect(result).toBe(100);
    });

    it('should handle 1-day span correctly', () => {
      const result = calculateDailyAmount(100, '2025-11-10', '2025-11-10');
      expect(result).toBe(100);
    });

    it('should handle 2-day span', () => {
      const result = calculateDailyAmount(200, '2025-11-10', '2025-11-11');
      expect(result).toBe(100);
    });
  });
});
