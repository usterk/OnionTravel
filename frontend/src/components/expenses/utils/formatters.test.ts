import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDateString,
  getDateTitle,
  calculateDailyAmount,
} from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    it('should format amount with currency code', () => {
      expect(formatCurrency(100, 'USD')).toBe('100 USD');
      // formatNumber may use space or comma as thousands separator depending on locale
      const result = formatCurrency(1234.56, 'EUR');
      expect(result).toMatch(/^1[, ]234\.56 EUR$/);
    });

    it('should handle null/undefined amounts as zero', () => {
      expect(formatCurrency(null, 'USD')).toBe('0 USD');
      expect(formatCurrency(undefined, 'USD')).toBe('0 USD');
    });

    it('should handle string amounts', () => {
      expect(formatCurrency('100', 'USD')).toBe('100 USD');
      // formatNumber may use space or comma as thousands separator depending on locale
      const result = formatCurrency('1234.56', 'EUR');
      expect(result).toMatch(/^1[, ]234\.56 EUR$/);
    });
  });

  describe('formatDateString', () => {
    it('should format valid date string', () => {
      const result = formatDateString('2025-11-10');
      // Monday, Nov 10, 2025
      expect(result).toMatch(/Monday/);
      expect(result).toMatch(/Nov/);
      expect(result).toMatch(/10/);
      expect(result).toMatch(/2025/);
    });

    it('should return original string for invalid date', () => {
      expect(formatDateString('invalid-date')).toBe('invalid-date');
    });
  });

  describe('getDateTitle', () => {
    it('should return "Today" for today\'s date', () => {
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

  describe('calculateDailyAmount', () => {
    it('should calculate daily amount for single day', () => {
      const result = calculateDailyAmount(100, '2025-11-10', '2025-11-10');
      expect(result).toBe(100);
    });

    it('should calculate daily amount for 3 days', () => {
      const result = calculateDailyAmount(300, '2025-11-10', '2025-11-12');
      expect(result).toBe(100);
    });

    it('should calculate daily amount for 7 days', () => {
      const result = calculateDailyAmount(700, '2025-11-10', '2025-11-16');
      expect(result).toBe(100);
    });

    it('should handle decimal results', () => {
      const result = calculateDailyAmount(100, '2025-11-10', '2025-11-12');
      expect(result).toBeCloseTo(33.33, 2);
    });
  });
});
