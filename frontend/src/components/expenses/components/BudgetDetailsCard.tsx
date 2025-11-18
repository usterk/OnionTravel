import { Card, CardContent } from '@/components/ui/card';
import { Calendar, CircleDollarSign, TrendingUp } from 'lucide-react';
import type { DailyBudgetStatistics, ExpenseStatistics } from '@/lib/expenses-api';

export interface BudgetDetailsCardProps {
  statistics: DailyBudgetStatistics;
  tripStatistics: ExpenseStatistics | null;
  selectedDate: string;
  formatCurrency: (amount: number) => string;
}

/**
 * Budget details card showing daily budget, adjusted budget, and average
 */
export function BudgetDetailsCard({
  statistics,
  tripStatistics,
  selectedDate,
  formatCurrency,
}: BudgetDetailsCardProps) {
  const today = new Date().toISOString().split('T')[0];
  const showAdjustedBudget =
    statistics.adjusted_daily_budget !== null &&
    statistics.adjusted_daily_budget !== undefined &&
    statistics.daily_budget &&
    Math.abs(statistics.adjusted_daily_budget - statistics.daily_budget) > 0.01 &&
    selectedDate <= today;

  const showAverageDailySpending =
    tripStatistics && tripStatistics.average_daily_spending > 0;

  return (
    <Card className="bg-gray-50">
      <CardContent className="py-3 md:py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 divide-y md:divide-y-0 md:divide-x divide-gray-300">
          {/* Daily Budget */}
          <div className="flex items-center justify-between pb-3 md:pb-0 md:pr-4">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Daily Budget</p>
              <p className="text-lg md:text-xl font-bold text-gray-900">
                {formatCurrency(statistics.daily_budget)}
              </p>
            </div>
            <Calendar className="h-6 w-6 md:h-8 md:w-8 text-gray-400 shrink-0" />
          </div>

          {/* Adjusted Daily Budget */}
          {showAdjustedBudget && (
            <div className="flex items-center justify-between py-3 md:py-0 md:px-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Adjusted Daily Budget</p>
                <p
                  className={`text-lg md:text-xl font-bold ${
                    statistics.adjusted_daily_budget! > statistics.daily_budget
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatCurrency(statistics.adjusted_daily_budget!)}
                </p>
              </div>
              <CircleDollarSign className="h-6 w-6 md:h-8 md:w-8 text-gray-400 shrink-0" />
            </div>
          )}

          {/* Average Daily Spending */}
          {showAverageDailySpending && (
            <div className="flex items-center justify-between pt-3 md:pt-0 md:pl-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Avg. Daily</p>
                <p
                  className={`text-lg md:text-xl font-bold ${
                    statistics.daily_budget &&
                    tripStatistics!.average_daily_spending > statistics.daily_budget
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}
                >
                  {formatCurrency(tripStatistics!.average_daily_spending)}
                </p>
              </div>
              <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-gray-400 shrink-0" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
