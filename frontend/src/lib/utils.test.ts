import { describe, it, expect } from 'vitest';
import { cn, formatNumber } from './utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
  });

  it('should handle undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });
});

describe('formatNumber', () => {
  describe('Basic formatting', () => {
    it('should format whole numbers without decimals', () => {
      expect(formatNumber(1234)).toBe('1 234');
    });

    it('should format numbers with decimals', () => {
      expect(formatNumber(1234.56)).toBe('1 234.56');
    });

    it('should add thousand separators', () => {
      expect(formatNumber(1234567.89)).toBe('1 234 567.89');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(123)).toBe('123');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('Null and undefined handling', () => {
    it('should return "0" for null', () => {
      expect(formatNumber(null)).toBe('0');
    });

    it('should return "0" for undefined', () => {
      expect(formatNumber(undefined)).toBe('0');
    });

    it('should return "0" for empty string', () => {
      expect(formatNumber('')).toBe('0');
    });
  });

  describe('String input', () => {
    it('should parse valid number strings', () => {
      expect(formatNumber('1234.56')).toBe('1 234.56');
    });

    it('should handle string whole numbers', () => {
      expect(formatNumber('1234')).toBe('1 234');
    });

    it('should return "0" for invalid strings', () => {
      expect(formatNumber('invalid')).toBe('0');
    });

    it('should return "0" for NaN', () => {
      expect(formatNumber('abc123')).toBe('0');
    });
  });

  describe('Decimal handling', () => {
    it('should use default 2 decimals', () => {
      expect(formatNumber(1234.5678)).toBe('1 234.57');
    });

    it('should respect custom decimal places', () => {
      expect(formatNumber(1234.5678, 3)).toBe('1 234.568');
    });

    it('should handle 0 decimals', () => {
      expect(formatNumber(1234.56, 0)).toBe('1 235');
    });

    it('should remove trailing zeros', () => {
      expect(formatNumber(1234.50)).toBe('1 234.5');
    });

    it('should remove all trailing zeros', () => {
      expect(formatNumber(1234.00)).toBe('1 234');
    });

    it('should handle numbers with many decimals', () => {
      expect(formatNumber(123.123456, 4)).toBe('123.1235');
    });
  });

  describe('Edge cases', () => {
    it('should handle negative numbers', () => {
      expect(formatNumber(-1234.56)).toBe('-1 234.56');
    });

    it('should handle very large numbers', () => {
      expect(formatNumber(1234567890.12)).toBe('1 234 567 890.12');
    });

    it('should handle very small decimals', () => {
      expect(formatNumber(0.123)).toBe('0.12');
    });

    it('should handle numbers close to zero', () => {
      expect(formatNumber(0.001)).toBe('0');
    });

    it('should handle 1 decimal place', () => {
      expect(formatNumber(1234.567, 1)).toBe('1 234.6');
    });
  });
});
