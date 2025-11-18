import { describe, it, expect } from 'vitest';
import {
  getProgressColor,
  getStatusBadge,
  isDateInRange,
  getInitialDate,
} from './budgetCalculations';

describe('budgetCalculations', () => {
  describe('getProgressColor', () => {
    it('should return red for over budget', () => {
      expect(getProgressColor(120, true)).toBe('bg-red-500');
    });

    it('should return yellow for 80%+ usage', () => {
      expect(getProgressColor(85, false)).toBe('bg-yellow-500');
      expect(getProgressColor(100, false)).toBe('bg-yellow-500');
    });

    it('should return green for under 80% usage', () => {
      expect(getProgressColor(50, false)).toBe('bg-green-500');
      expect(getProgressColor(79, false)).toBe('bg-green-500');
    });
  });

  describe('getStatusBadge', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    it('should return "Not Started" for future days with no expenses', () => {
      const badge = getStatusBadge(tomorrow, false, 0, 0);
      expect(badge?.label).toBe('Not Started');
      expect(badge?.style.backgroundColor).toBe('#9ca3af');
    });

    it('should return "Over Budget" when over budget', () => {
      const badge = getStatusBadge(today, true, 120, 5);
      expect(badge?.label).toBe('Over Budget');
      expect(badge?.style.backgroundColor).toBe('#dc2626');
    });

    it('should return "Warning" for 80%+ usage', () => {
      const badge = getStatusBadge(today, false, 85, 3);
      expect(badge?.label).toBe('Warning');
      expect(badge?.style.backgroundColor).toBe('#f59e0b');
    });

    it('should return "On Track" for today under 80%', () => {
      const badge = getStatusBadge(today, false, 50, 2);
      expect(badge?.label).toBe('On Track');
      expect(badge?.style.backgroundColor).toBe('#16a34a');
    });

    it('should return "Completed" for past days within budget', () => {
      const badge = getStatusBadge(yesterday, false, 60, 3);
      expect(badge?.label).toBe('Completed');
      expect(badge?.style.backgroundColor).toBe('#16a34a');
    });

    it('should return "On Track" for future days with expenses', () => {
      const badge = getStatusBadge(tomorrow, false, 30, 2);
      expect(badge?.label).toBe('On Track');
    });
  });

  describe('isDateInRange', () => {
    it('should return true for date within range', () => {
      expect(isDateInRange('2025-11-15', '2025-11-10', '2025-11-20')).toBe(true);
    });

    it('should return true for date at start boundary', () => {
      expect(isDateInRange('2025-11-10', '2025-11-10', '2025-11-20')).toBe(true);
    });

    it('should return true for date at end boundary', () => {
      expect(isDateInRange('2025-11-20', '2025-11-10', '2025-11-20')).toBe(true);
    });

    it('should return false for date before range', () => {
      expect(isDateInRange('2025-11-09', '2025-11-10', '2025-11-20')).toBe(false);
    });

    it('should return false for date after range', () => {
      expect(isDateInRange('2025-11-21', '2025-11-10', '2025-11-20')).toBe(false);
    });
  });

  describe('getInitialDate', () => {
    it('should return today if within trip range', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];

      expect(getInitialDate(yesterday, tomorrow)).toBe(today);
    });

    it('should return trip start if today is before trip', () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const futureEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      expect(getInitialDate(futureStart, futureEnd)).toBe(futureStart);
    });

    it('should return trip end if today is after trip', () => {
      const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      expect(getInitialDate(pastStart, pastEnd)).toBe(pastEnd);
    });
  });
});
