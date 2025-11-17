import { useState } from 'react';
import { CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Expense } from '@/types/models';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { ExpenseListItem } from './ExpenseListItem';
import { formatDate, getDateTitle } from '@/lib/budget-utils';

export interface ExpensesListProps {
  expenses: Expense[];
  statistics: DailyBudgetStatistics;
  currencyCode: string;
  isLoading: boolean;
  expandedExpenseId: number | null;
  onToggleExpand: (id: number | null) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

/**
 * Expenses list section with collapsible header
 *
 * Features:
 * - Collapsible section (default: expanded)
 * - Loading state
 * - Empty state
 * - Multi-day expenses sorted to bottom
 * - Individual expense items
 */
export function ExpensesList({
  expenses,
  statistics,
  currencyCode,
  isLoading,
  expandedExpenseId,
  onToggleExpand,
  onEdit,
  onDelete,
}: ExpensesListProps) {
  const [showExpenses, setShowExpenses] = useState(true);

  // Sort expenses: multi-day expenses (with end_date) go to the bottom
  const sortedExpenses = [...expenses].sort((a, b) => {
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
        onClick={() => setShowExpenses(!showExpenses)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center text-lg md:text-xl">
              <CreditCard className="h-5 w-5 mr-2" />
              Expenses for {getDateTitle(statistics.date)}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setShowExpenses(!showExpenses);
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
          {isLoading ? (
            <div className="py-6 text-center text-gray-600">Loading expenses...</div>
          ) : expenses.length === 0 ? (
            <div className="py-6 text-center text-gray-600">
              No expenses recorded for {formatDate(statistics.date)}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => (
                <ExpenseListItem
                  key={expense.id}
                  expense={expense}
                  statistics={statistics}
                  currencyCode={currencyCode}
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
