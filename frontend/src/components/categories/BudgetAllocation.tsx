import { useMemo } from 'react';
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getIconComponent } from '@/components/ui/icon-picker';
import { formatNumber } from '@/lib/utils';
import type { CategoryWithStats } from '@/types/models';

interface BudgetAllocationProps {
  categories: CategoryWithStats[];
  tripCurrency?: string;
  totalBudget?: number;
}

export function BudgetAllocation({
  categories,
  tripCurrency = 'USD',
  totalBudget,
}: BudgetAllocationProps) {
  const stats = useMemo(() => {
    const totalAllocated = categories.reduce(
      (sum, cat) => sum + (cat.budget_percentage || 0),
      0
    );
    const totalSpent = categories.reduce((sum, cat) => sum + cat.total_spent, 0);
    const totalAllocatedBudget = categories.reduce(
      (sum, cat) => sum + cat.allocated_budget,
      0
    );

    return {
      totalAllocated,
      totalSpent,
      totalAllocatedBudget,
      isOverAllocated: totalAllocated > 100,
      unallocated: Math.max(0, 100 - totalAllocated),
    };
  }, [categories]);

  // Sort categories by budget percentage for better visualization
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a, b) => {
      const aPercentage = a.budget_percentage || 0;
      const bPercentage = b.budget_percentage || 0;
      return bPercentage - aPercentage;
    });
  }, [categories]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Budget Allocation</CardTitle>
          {stats.isOverAllocated && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Over-allocated
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Allocated</span>
            <span
              className={`text-sm font-bold ${
                stats.isOverAllocated
                  ? 'text-red-600'
                  : stats.totalAllocated > 90
                  ? 'text-amber-600'
                  : 'text-green-600'
              }`}
            >
              {formatNumber(stats.totalAllocated, 1)}%
            </span>
          </div>

          {/* Overall allocation bar */}
          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all ${
                stats.isOverAllocated
                  ? 'bg-red-500'
                  : stats.totalAllocated > 90
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, stats.totalAllocated)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-900">
              {formatNumber(stats.totalAllocated, 1)}% of 100%
            </div>
          </div>

          {stats.unallocated > 0 && (
            <p className="text-sm text-gray-600">
              {formatNumber(stats.unallocated, 1)}% unallocated
            </p>
          )}
        </div>

        {/* Spending Summary (if total budget is available) */}
        {totalBudget && totalBudget > 0 && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Budget:</span>
              <span className="font-medium">
                {tripCurrency} {formatNumber(totalBudget)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Spent:</span>
              <span className="font-medium">
                {tripCurrency} {formatNumber(stats.totalSpent)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining:</span>
              <span
                className={`font-medium ${
                  totalBudget - stats.totalSpent < 0
                    ? 'text-red-600'
                    : 'text-green-600'
                }`}
              >
                {tripCurrency} {formatNumber(Number(totalBudget ?? 0) - stats.totalSpent)}
              </span>
            </div>
          </div>
        )}

        {/* Category Breakdown */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-700">Category Breakdown</h4>
          {sortedCategories.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No categories with budget allocation
            </p>
          ) : (
            <div className="space-y-3">
              {sortedCategories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const budgetPercentage = category.budget_percentage || 0;
                const percentageUsed = category.percentage_used || 0;

                return (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {IconComponent && (
                          <div
                            className="flex items-center justify-center w-6 h-6 rounded"
                            style={{ backgroundColor: category.color + '20' }}
                          >
                            <IconComponent
                              className="h-3.5 w-3.5"
                              style={{ color: category.color }}
                            />
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{category.name}</span>
                      </div>
                      <span className="text-gray-600">{formatNumber(budgetPercentage, 1)}%</span>
                    </div>

                    {/* Budget allocation bar */}
                    <div className="relative h-6 bg-gray-100 rounded overflow-hidden">
                      {/* Budget allocation background */}
                      <div
                        className="absolute top-0 left-0 h-full opacity-30"
                        style={{
                          backgroundColor: category.color,
                          width: '100%',
                        }}
                      />
                      {/* Actual spending */}
                      <div
                        className="absolute top-0 left-0 h-full transition-all"
                        style={{
                          backgroundColor: category.color,
                          width: `${Math.min(100, percentageUsed)}%`,
                        }}
                      />
                      <div className="absolute inset-0 flex items-center px-2">
                        <div className="flex items-center justify-between w-full text-xs">
                          <span className="font-medium text-gray-900">
                            {tripCurrency} {formatNumber(category.total_spent)}
                          </span>
                          <div className="flex items-center gap-1">
                            {percentageUsed > 100 ? (
                              <TrendingUp className="h-3 w-3 text-red-600" />
                            ) : percentageUsed > 0 ? (
                              <TrendingDown className="h-3 w-3 text-green-600" />
                            ) : null}
                            <span
                              className={
                                percentageUsed > 100
                                  ? 'text-red-600 font-medium'
                                  : percentageUsed > 90
                                  ? 'text-amber-600'
                                  : 'text-gray-600'
                              }
                            >
                              {formatNumber(percentageUsed, 1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex justify-between text-xs text-gray-500 px-1">
                      <span>
                        Budget: {tripCurrency} {formatNumber(category.allocated_budget)}
                      </span>
                      <span
                        className={
                          category.remaining_budget < 0
                            ? 'text-red-600'
                            : 'text-green-600'
                        }
                      >
                        Remaining: {tripCurrency} {formatNumber(category.remaining_budget)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Warnings */}
        {stats.isOverAllocated && (
          <div className="border-t pt-4">
            <div className="flex gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-900">Budget Over-allocated</p>
                <p className="text-red-700 mt-1">
                  Your total budget allocation is {formatNumber(stats.totalAllocated, 1)}%, which
                  exceeds 100%. Consider adjusting your category budgets.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
