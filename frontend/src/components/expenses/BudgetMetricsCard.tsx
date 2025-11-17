import { forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { formatCurrency } from '@/lib/daily-budget-utils';
import { formatNumber } from '@/lib/utils';

export interface BudgetMetricsCardProps {
  statistics: DailyBudgetStatistics;
  currencyCode: string;
  selectedDate: string;
}

/**
 * Component for displaying main budget metrics
 * Shows remaining budget, cumulative savings, and spending progress
 */
export const BudgetMetricsCard = forwardRef<HTMLDivElement, BudgetMetricsCardProps>(
  ({ statistics, currencyCode, selectedDate }, ref) => {
    const today = new Date().toISOString().split('T')[0];
    const showCumulativeSavings =
      statistics.cumulative_savings_past !== null &&
      statistics.cumulative_savings_past !== undefined &&
      selectedDate <= today;

    return (
      <Card className="border-2 border-green-500" ref={ref}>
        <CardContent className="py-6">
          <div className="flex flex-col gap-4">
            {/* YOU CAN STILL SPEND - Main focus */}
            <div className="text-center pb-4 border-b border-gray-200">
              <p className="text-sm md:text-base text-gray-600 mb-2">💰 Remaining Today</p>

              {/* Mobile: column layout */}
              <div className="flex flex-col md:hidden items-center gap-2">
                <p
                  className={`text-4xl font-bold ${
                    statistics.remaining_today < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {statistics.remaining_today < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(statistics.remaining_today), currencyCode)}
                </p>
                {showCumulativeSavings && (
                  <p
                    className={`text-xs font-medium ${
                      statistics.cumulative_savings_past! >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {statistics.cumulative_savings_past! >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(statistics.cumulative_savings_past!), currencyCode)}{' '}
                    {statistics.cumulative_savings_past! >= 0 ? 'saved' : 'overspent'}
                  </p>
                )}
              </div>

              {/* Desktop: centered layout with savings below */}
              <div className="hidden md:flex flex-col items-center gap-2">
                {/* Main amount - centered */}
                <p
                  className={`text-5xl font-bold ${
                    statistics.remaining_today < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {statistics.remaining_today < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(statistics.remaining_today), currencyCode)}
                </p>

                {/* Savings text below main amount */}
                {showCumulativeSavings && (
                  <p
                    className={`text-sm font-medium ${
                      statistics.cumulative_savings_past! >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {statistics.cumulative_savings_past! >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(statistics.cumulative_savings_past!), currencyCode)}{' '}
                    {statistics.cumulative_savings_past! >= 0 ? 'saved' : 'overspent'}
                  </p>
                )}
              </div>
            </div>

            {/* Already Spent / Budget Used - Combined */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded"
                    style={{
                      backgroundColor: statistics.is_over_budget
                        ? '#ef444420'
                        : statistics.percentage_used_today >= 80
                        ? '#f59e0b20'
                        : '#10b98120',
                    }}
                  >
                    {statistics.is_over_budget ? (
                      <TrendingDown className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
                    ) : (
                      <TrendingUp
                        className="h-3.5 w-3.5"
                        style={{ color: statistics.percentage_used_today >= 80 ? '#f59e0b' : '#10b981' }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">Already Spent</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(statistics.total_spent_today, currencyCode)}
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
                    backgroundColor: statistics.is_over_budget
                      ? '#ef4444'
                      : statistics.percentage_used_today >= 80
                      ? '#f59e0b'
                      : '#10b981',
                    width: `${Math.min(statistics.percentage_used_today, 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {statistics.expense_count_today} expense
                {statistics.expense_count_today !== 1 ? 's' : ''} •{' '}
                {formatNumber(100 - statistics.percentage_used_today, 1)}% available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

BudgetMetricsCard.displayName = 'BudgetMetricsCard';
