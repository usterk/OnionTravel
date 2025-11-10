import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number with space as thousand separator
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with spaces as thousand separators
 * @example formatNumber(1234.56) => "1 234.56"
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) {
    return '0';
  }

  // Format with specified decimals
  const fixed = num.toFixed(decimals);

  // Split into integer and decimal parts
  const parts = fixed.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add space as thousand separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  // Return with decimal part if needed
  return decimals > 0 ? `${formattedInteger}.${decimalPart}` : formattedInteger;
}
