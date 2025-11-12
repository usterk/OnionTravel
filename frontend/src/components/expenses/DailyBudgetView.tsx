import { useEffect, useState } from 'react';
import { getDailyBudgetStatistics } from '@/lib/expenses-api';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { formatNumber } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Calendar, TrendingUp, TrendingDown, AlertTriangle, Tag, ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { getIconComponent } from '@/components/ui/icon-picker';

interface DailyBudgetViewProps {
  tripId: number;
  currencyCode: string;
  tripStartDate: string;
  tripEndDate: string;
}

export function DailyBudgetView({ tripId, currencyCode, tripStartDate, tripEndDate }: DailyBudgetViewProps) {
  const [statistics, setStatistics] = useState<DailyBudgetStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  useEffect(() => {
    // Set initial date based on trip range
    const today = new Date().toISOString().split('T')[0];

    if (today < tripStartDate) {
      // Trip hasn't started yet - show first day
      setSelectedDate(tripStartDate);
    } else if (today > tripEndDate) {
      // Trip has ended - show last day
      setSelectedDate(tripEndDate);
    } else {
      // Trip is ongoing - show today
      setSelectedDate(today);
    }
  }, [tripStartDate, tripEndDate]);

  useEffect(() => {
    if (selectedDate) {
      loadStatistics();
    }
  }, [tripId, selectedDate]);

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

  const formatCurrency = (amount: number | string | undefined | null) => {
    const value = Number(amount ?? 0);
    return `${formatNumber(value)} ${currencyCode}`;
  };

  const getProgressColor = (percentage: number, isOverBudget: boolean) => {
    if (isOverBudget) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = () => {
    if (!statistics) return null;

    const today = new Date().toISOString().split('T')[0];
    const isPastDay = selectedDate < today;
    const isFutureDay = selectedDate > today;

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
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'EEEE, MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const changeDay = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split('T')[0];

    // Check if new date is within trip range
    if (newDate >= tripStartDate && newDate <= tripEndDate) {
      setSelectedDate(newDate);
    }
  };

  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];

    // Only go to today if it's within trip range
    if (today >= tripStartDate && today <= tripEndDate) {
      setSelectedDate(today);
    } else if (today < tripStartDate) {
      // If today is before trip, go to trip start
      setSelectedDate(tripStartDate);
    } else {
      // If today is after trip, go to trip end
      setSelectedDate(tripEndDate);
    }
  };

  const goToStart = () => {
    setSelectedDate(tripStartDate);
  };

  const goToEnd = () => {
    setSelectedDate(tripEndDate);
  };

  const isAtTripStart = selectedDate <= tripStartDate;
  const isAtTripEnd = selectedDate >= tripEndDate;

  // Check if today is within trip range
  const today = new Date().toISOString().split('T')[0];
  const isTodayInTripRange = today >= tripStartDate && today <= tripEndDate;

  const getDateTitle = () => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) {
      return 'Today';
    }
    // Show only day of week (e.g., "Monday", "Friday")
    try {
      return format(new Date(selectedDate), 'EEEE');
    } catch {
      return selectedDate;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-gray-600">Loading daily budget...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!statistics) {
    return null;
  }

  // If no daily budget is set
  if (!statistics.daily_budget) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg md:text-2xl">
              <Calendar className="h-5 w-5 mr-2" />
              Daily Budget
            </CardTitle>
            <Badge variant="secondary">
              Day {statistics.days_into_trip} of {statistics.total_days}
            </Badge>
          </div>
          <CardDescription>{formatDate(statistics.date)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No daily budget set for this trip</p>
            <p className="text-sm text-gray-500">
              Spent today: {formatCurrency(statistics.total_spent_today)} ({statistics.expense_count_today} expenses)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const status = getStatusBadge();

  return (
    <div className={`space-y-4 transition-opacity duration-200 ${isRefreshing ? 'opacity-60' : 'opacity-100'}`}>
      {/* Header with Date Navigation */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            {/* Compact Navigation Panel */}
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => changeDay(-1)}
                disabled={isAtTripStart || isRefreshing}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden md:inline ml-1">Previous</span>
              </Button>

              <div className="flex flex-col items-center gap-1 flex-1">
                {status && (
                  <Badge style={status.style} className="mb-1">
                    {status.label}
                  </Badge>
                )}
                <CardTitle className="flex items-center text-lg md:text-2xl">
                  {selectedDate !== new Date().toISOString().split('T')[0] ? (
                    <div className="relative group mr-2">
                      <Calendar
                        className="h-5 w-5 text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
                        onClick={goToToday}
                      />
                      <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Jump to Today
                      </div>
                    </div>
                  ) : (
                    <Calendar className="h-5 w-5 mr-2" />
                  )}
                  {getDateTitle()}
                </CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Day {statistics.days_into_trip} of {statistics.total_days}
                </CardDescription>
                <div className="mt-2">
                  <DatePicker
                    value={new Date(selectedDate)}
                    onChange={(date) => setSelectedDate(date.toISOString().split('T')[0])}
                    min={new Date(tripStartDate)}
                    max={new Date(tripEndDate)}
                    onStartClick={goToStart}
                    onTodayClick={goToToday}
                    onEndClick={goToEnd}
                    todayDisabled={!isTodayInTripRange}
                  />
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => changeDay(1)}
                disabled={isAtTripEnd || isRefreshing}
                className="shrink-0"
              >
                <span className="hidden md:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Metrics - Single Row */}
      <Card className="border-2 border-green-500">
        <CardContent className="py-6">
          <div className="flex flex-col gap-4">
            {/* YOU CAN STILL SPEND - Main focus */}
            <div className="text-center pb-4 border-b border-gray-200">
              <p className="text-sm md:text-base text-gray-600 mb-2">💰 Remaining Today</p>
              <p className={`text-4xl md:text-5xl font-bold ${statistics.remaining_today < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {statistics.remaining_today < 0 ? '-' : ''}{formatCurrency(Math.abs(statistics.remaining_today))}
              </p>
              <div className="flex items-center justify-center mt-2 text-xs md:text-sm">
                {statistics.is_over_budget ? (
                  <>
                    <TrendingDown className="h-4 w-4 mr-1 text-red-500" />
                    <span className="text-red-600">Over budget</span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                    <span className="text-gray-600">Available to spend</span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Daily budget: {formatCurrency(statistics.daily_budget)}
              </p>
            </div>

            {/* Already Spent / Budget Used - Combined */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-6 h-6 rounded" style={{
                    backgroundColor: statistics.is_over_budget ? '#ef444420' :
                                   statistics.percentage_used_today >= 80 ? '#f59e0b20' : '#10b98120'
                  }}>
                    {statistics.is_over_budget ? (
                      <TrendingDown className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                    ) : (
                      <TrendingUp className="h-3.5 w-3.5" style={{ color: statistics.percentage_used_today >= 80 ? '#f59e0b' : '#10b981' }} />
                    )}
                  </div>
                  <span className="text-sm font-medium">Already Spent</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(statistics.total_spent_today)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatNumber(statistics.percentage_used_today, 1)}% of budget
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: statistics.is_over_budget ? '#ef4444' :
                                   statistics.percentage_used_today >= 80 ? '#f59e0b' : '#10b981',
                    width: `${Math.min(statistics.percentage_used_today, 100)}%`
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {statistics.expense_count_today} expense{statistics.expense_count_today !== 1 ? 's' : ''} • {formatNumber(100 - statistics.percentage_used_today, 1)}% available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown - Remaining Budget */}
      {statistics.by_category_today && statistics.by_category_today.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg md:text-xl">
              <Tag className="h-5 w-5 mr-2" />
              Remaining by Category
            </CardTitle>
            <CardDescription>
              Remaining budget by category for {formatDate(statistics.date)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {statistics.by_category_today
                .filter(cat => cat.category_daily_budget > 0 || cat.total_spent > 0)  // Show categories with budget OR spending
                .sort((a, b) => b.remaining_budget - a.remaining_budget)  // Sort by remaining budget (highest first)
                .map((category) => {
                  // Progress bar shows how much was spent (visual intuition)
                  const spentPercentage = category.category_daily_budget > 0
                    ? (category.total_spent / category.category_daily_budget) * 100
                    : 0;
                  const CategoryIcon = getIconComponent(category.category_icon);
                  const isOverBudget = category.remaining_budget < 0;

                  return (
                    <div key={category.category_id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center justify-center w-6 h-6 rounded"
                            style={{ backgroundColor: category.category_color + '20' }}
                          >
                            {CategoryIcon && <CategoryIcon className="h-3.5 w-3.5" style={{ color: category.category_color }} />}
                          </div>
                          <span className="text-sm font-medium">{category.category_name}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            {isOverBudget ? '-' : ''}{formatCurrency(Math.abs(category.remaining_budget))}
                          </span>
                          <span className="text-xs text-gray-500">
                            of {formatCurrency(category.category_daily_budget)}
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            backgroundColor: category.category_color,
                            width: `${Math.min(Math.max(spentPercentage, 0), 100)}%`
                          }}
                        />
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Spent: {formatCurrency(category.total_spent)}
                      </div>
                    </div>
                  );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Expenses Today */}
      {statistics.expense_count_today === 0 && (
        <Card>
          <CardContent className="py-6">
            <p className="text-center text-gray-600">
              No expenses recorded for {formatDate(statistics.date)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
