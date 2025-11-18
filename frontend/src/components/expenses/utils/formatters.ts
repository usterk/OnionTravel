import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';

/**
 * Format amount with currency code
 */
export function formatCurrency(amount: number | string | undefined | null, currencyCode: string): string {
  const value = Number(amount ?? 0);
  return `${formatNumber(value)} ${currencyCode}`;
}

/**
 * Format date string to human-readable format
 */
export function formatDateString(dateString: string): string {
  try {
    return format(new Date(dateString), 'EEEE, MMM d, yyyy');
  } catch {
    return dateString;
  }
}

/**
 * Get day title for display ("Today" or day of week)
 */
export function getDateTitle(date: string): string {
  const today = new Date().toISOString().split('T')[0];
  if (date === today) {
    return 'Today';
  }
  try {
    return format(new Date(date), 'EEEE');
  } catch {
    return date;
  }
}

/**
 * Calculate daily amount for multi-day expenses
 */
export function calculateDailyAmount(
  totalAmount: number,
  startDate: string,
  endDate: string
): number {
  const daysDiff = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;
  return totalAmount / daysDiff;
}
