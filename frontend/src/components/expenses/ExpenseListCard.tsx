import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ChevronDown, ChevronUp } from 'lucide-react';
import type { Expense } from '@/types/models';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { ExpenseItem } from './ExpenseItem';
import { formatDate, getDateTitle } from '@/lib/daily-budget-utils';

export interface ExpenseListCardProps {
  statistics: DailyBudgetStatistics;
  dayExpenses: Expense[];
  currencyCode: string;
  isLoadingExpenses: boolean;
  showExpenses: boolean;
  expandedExpenseId: number | null;
  onToggleExpenses: () => void;
  onToggleExpand: (expenseId: number) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

/**
 * Component for displaying the list of expenses for a day
 */
export function ExpenseListCard({
  statistics,
  dayExpenses,
  currencyCode,
  isLoadingExpenses,
  showExpenses,
  expandedExpenseId,
  onToggleExpenses,
  onToggleExpand,
  onEdit,
  onDelete,
}: ExpenseListCardProps) {
  const dateTitle = getDateTitle(statistics.date);

  // Sort expenses: single-day expenses first, multi-day expenses at the bottom
  const sortedExpenses = [...dayExpenses].sort((a, b) => {
    const aIsMultiDay = !!a.end_date;
    const bIsMultiDay = !!b.end_date;
    if (aIsMultiDay && !bIsMultiDay) return 1;
    if (!aIsMultiDay && bIsMultiDay) return -1;
    return 0; // Keep original order for same type
  });

  return (
    <Card>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50 transition-colors py-3 md:py-6"
        onClick={onToggleExpenses}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-lg md:text-xl">
              <CreditCard className="h-5 w-5 mr-2" />
              Expenses for {dateTitle}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpenses();
            }}
          >
            {showExpenses ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
      </CardHeader>
      {showExpenses && (
        <CardContent>
          {isLoadingExpenses ? (
            <div className="py-6 text-center text-gray-600">Loading expenses...</div>
          ) : dayExpenses.length === 0 ? (
            <div className="py-6 text-center text-gray-600">
              No expenses recorded for {formatDate(statistics.date)}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => (
                <ExpenseItem
                  key={expense.id}
                  expense={expense}
                  currencyCode={currencyCode}
                  statistics={statistics}
                  isExpanded={expandedExpenseId === expense.id}
                  onToggleExpand={onToggleExpand}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
