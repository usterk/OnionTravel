import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, CreditCard, Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface ExpenseStatistics {
  total_expenses: number;
  total_spent: number;
  total_budget: number;
  remaining_budget: number;
  percentage_used: number;
}

interface BudgetOverviewCardsProps {
  statistics: ExpenseStatistics | null;
  totalBudget: number;
  currencyCode: string;
}

export function BudgetOverviewCards({ statistics, totalBudget, currencyCode }: BudgetOverviewCardsProps) {
  const formatCurrency = (amount: number | string | undefined | null) => {
    const value = Number(amount ?? 0);
    return `${formatNumber(value)} ${currencyCode}`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBudgetStatusIcon = () => {
    if (!statistics) return null;
    if (statistics.percentage_used >= 100) {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return <TrendingUp className="h-5 w-5 text-green-500" />;
  };

  return (
    <>
      {/* Budget Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Budget</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">
              {formatCurrency(statistics?.total_budget || totalBudget || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <DollarSign className="h-4 w-4 mr-1" />
              <span>Allocated for trip</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">
              {formatCurrency(statistics?.total_spent || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <CreditCard className="h-4 w-4 mr-1" />
              <span>{statistics?.total_expenses || 0} expenses</span>
            </div>
          </CardContent>
        </Card>

        {/* Remaining Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Remaining</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">
              {formatCurrency(statistics?.remaining_budget || totalBudget || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm">
              {getBudgetStatusIcon()}
              <span className={`ml-1 ${
                statistics && statistics.percentage_used >= 100 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {statistics && statistics.percentage_used >= 100 ? 'Over budget!' : 'Available'}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Budget Usage */}
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Budget Used</CardDescription>
            <CardTitle className="text-2xl md:text-3xl">
              {formatNumber(statistics?.percentage_used || 0, 1)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Of total budget</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      {statistics && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Budget Progress</CardTitle>
            <CardDescription>
              {formatNumber(statistics.percentage_used, 1)}% of budget used
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${getProgressColor(statistics.percentage_used)}`}
                style={{ width: `${Math.min(statistics.percentage_used, 100)}%` }}
              />
            </div>
            {statistics.percentage_used >= 100 && (
              <p className="text-sm text-red-600 mt-2 font-medium">
                You have exceeded your budget by {formatCurrency(Math.abs(statistics.remaining_budget))}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
