import { forwardRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

export interface BudgetMetricsCardProps {
  remainingToday: number;
  cumulativeSavingsPast: number | null;
  totalSpentToday: number;
  percentageUsedToday: number;
  expenseCountToday: number;
  isOverBudget: boolean;
  selectedDate: string;
  currencyCode: string;
  formatCurrency: (amount: number) => string;
}

/**
 * Main budget metrics card showing remaining budget and spending progress
 */
export const BudgetMetricsCard = forwardRef<HTMLDivElement, BudgetMetricsCardProps>(
  (
    {
      remainingToday,
      cumulativeSavingsPast,
      totalSpentToday,
      percentageUsedToday,
      expenseCountToday,
      isOverBudget,
      selectedDate,
      currencyCode,
      formatCurrency,
    },
    ref
  ) => {
    const today = new Date().toISOString().split('T')[0];
    const showCumulativeSavings =
      cumulativeSavingsPast !== null &&
      cumulativeSavingsPast !== undefined &&
      selectedDate <= today;

    return (
      <Card className="border-2 border-green-500" ref={ref}>
        <CardContent className="py-6">
          <div className="flex flex-col gap-4">
            {/* YOU CAN STILL SPEND - Main focus */}
            <div className="text-center pb-4 border-b border-gray-200">
              <p className="text-sm md:text-base text-gray-600 mb-2">
                💰 Remaining Today
              </p>

              {/* Mobile: column layout */}
              <div className="flex flex-col md:hidden items-center gap-2">
                <p
                  className={`text-4xl font-bold ${
                    remainingToday < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {remainingToday < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(remainingToday))}
                </p>
                {showCumulativeSavings && (
                  <p
                    className={`text-xs font-medium ${
                      cumulativeSavingsPast! >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {cumulativeSavingsPast! >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(cumulativeSavingsPast!))}{' '}
                    {cumulativeSavingsPast! >= 0 ? 'saved' : 'overspent'}
                  </p>
                )}
              </div>

              {/* Desktop: centered layout with savings below */}
              <div className="hidden md:flex flex-col items-center gap-2">
                {/* Main amount - centered */}
                <p
                  className={`text-5xl font-bold ${
                    remainingToday < 0 ? 'text-red-600' : 'text-green-600'
                  }`}
                >
                  {remainingToday < 0 ? '-' : ''}
                  {formatCurrency(Math.abs(remainingToday))}
                </p>

                {/* Savings text below main amount */}
                {showCumulativeSavings && (
                  <p
                    className={`text-sm font-medium ${
                      cumulativeSavingsPast! >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {cumulativeSavingsPast! >= 0 ? '+' : '-'}
                    {formatCurrency(Math.abs(cumulativeSavingsPast!))}{' '}
                    {cumulativeSavingsPast! >= 0 ? 'saved' : 'overspent'}
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
                      backgroundColor: isOverBudget
                        ? '#ef444420'
                        : percentageUsedToday >= 80
                        ? '#f59e0b20'
                        : '#10b98120',
                    }}
                  >
                    {isOverBudget ? (
                      <TrendingDown
                        className="h-3.5 w-3.5"
                        style={{ color: '#ef4444' }}
                      />
                    ) : (
                      <TrendingUp
                        className="h-3.5 w-3.5"
                        style={{
                          color: percentageUsedToday >= 80 ? '#f59e0b' : '#10b981',
                        }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-medium">Already Spent</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(totalSpentToday)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatNumber(percentageUsedToday, 1)}% of budget
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    backgroundColor: isOverBudget
                      ? '#ef4444'
                      : percentageUsedToday >= 80
                      ? '#f59e0b'
                      : '#10b981',
                    width: `${Math.min(percentageUsedToday, 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {expenseCountToday} expense
                {expenseCountToday !== 1 ? 's' : ''} •{' '}
                {formatNumber(100 - percentageUsedToday, 1)}% available
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

BudgetMetricsCard.displayName = 'BudgetMetricsCard';
