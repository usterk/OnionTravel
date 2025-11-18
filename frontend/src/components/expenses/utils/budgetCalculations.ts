/**
 * Get progress bar color based on percentage and budget status
 */
export function getProgressColor(percentage: number, isOverBudget: boolean): string {
  if (isOverBudget) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  return 'bg-green-500';
}

/**
 * Get status badge configuration based on budget statistics
 */
export interface StatusBadge {
  label: string;
  style: {
    backgroundColor: string;
    color: string;
  };
}

export function getStatusBadge(
  date: string,
  isOverBudget: boolean,
  percentageUsed: number,
  expenseCount: number
): StatusBadge | null {
  const today = new Date().toISOString().split('T')[0];
  const isPastDay = date < today;
  const isFutureDay = date > today;

  // Future days
  if (isFutureDay) {
    // No expenses yet - show placeholder
    if (expenseCount === 0) {
      return {
        label: 'Not Started',
        style: { backgroundColor: '#9ca3af', color: 'white' }, // gray-400
      };
    }
    // Has expenses - show normal budget status
  }

  // Budget status (for today and past days with expenses, future days with expenses)
  if (isOverBudget) {
    return {
      label: 'Over Budget',
      style: { backgroundColor: '#dc2626', color: 'white' }, // red-600
    };
  } else if (percentageUsed >= 80) {
    return {
      label: 'Warning',
      style: { backgroundColor: '#f59e0b', color: 'white' }, // amber-500
    };
  } else {
    // Past days that stayed within budget - show "Completed"
    // Today and future days - show "On Track"
    return {
      label: isPastDay ? 'Completed' : 'On Track',
      style: { backgroundColor: '#16a34a', color: 'white' }, // green-600
    };
  }
}

/**
 * Check if date is within trip range
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Get initial date for trip based on today and trip range
 */
export function getInitialDate(tripStartDate: string, tripEndDate: string): string {
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
