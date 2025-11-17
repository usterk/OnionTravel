import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tag, ChevronDown, ChevronUp } from 'lucide-react';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { getIconComponent } from '@/components/ui/icon-picker';
import { formatCurrency } from '@/lib/daily-budget-utils';

export interface CategoryBreakdownCardProps {
  statistics: DailyBudgetStatistics;
  currencyCode: string;
  showCategoryBreakdown: boolean;
  onToggle: () => void;
}

/**
 * Component for displaying budget breakdown by category
 */
export function CategoryBreakdownCard({
  statistics,
  currencyCode,
  showCategoryBreakdown,
  onToggle,
}: CategoryBreakdownCardProps) {
  if (!statistics.by_category_today || statistics.by_category_today.length === 0) {
    return null;
  }

  const categories = statistics.by_category_today.filter(
    (cat) => cat.category_daily_budget > 0 || cat.total_spent > 0
  );

  if (categories.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors py-3 md:py-6"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-lg md:text-xl">
              <Tag className="h-5 w-5 mr-2" />
              Remaining by Category
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {showCategoryBreakdown ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      {showCategoryBreakdown && (
        <CardContent>
          <div className="space-y-4">
            {categories.map((category) => {
              // Progress bar shows how much was spent (visual intuition)
              const spentPercentage =
                category.category_daily_budget > 0
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
                        {CategoryIcon && (
                          <CategoryIcon
                            className="h-3.5 w-3.5"
                            style={{ color: category.category_color }}
                          />
                        )}
                      </div>
                      <span className="text-sm font-medium">{category.category_name}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-sm font-bold ${
                          isOverBudget ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {isOverBudget ? '-' : ''}
                        {formatCurrency(Math.abs(category.remaining_budget), currencyCode)}
                      </span>
                      <span className="text-xs text-gray-500">
                        of {formatCurrency(category.category_daily_budget, currencyCode)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        backgroundColor: category.category_color,
                        width: `${Math.min(Math.max(spentPercentage, 0), 100)}%`,
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Spent: {formatCurrency(category.total_spent, currencyCode)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
