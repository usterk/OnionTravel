import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ChevronUp, ChevronDown } from 'lucide-react';
import { ExpenseItem } from './ExpenseItem';
import { formatDateString } from '../utils/formatters';
import type { Expense } from '@/types/models';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';

export interface ExpensesListProps {
  dateTitle: string;
  dateString: string;
  expenses: Expense[];
  statistics: DailyBudgetStatistics;
  isLoading: boolean;
  expandedExpenseId: number | null;
  currencyCode: string;
  formatCurrency: (amount: number) => string;
  onToggleExpand: (expenseId: number | null) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expense: Expense) => void;
}

/**
 * Collapsible list of expenses for the selected day
 */
export function ExpensesList({
  dateTitle,
  dateString,
  expenses,
  statistics,
  isLoading,
  expandedExpenseId,
  currencyCode,
  formatCurrency,
  onToggleExpand,
  onEditExpense,
  onDeleteExpense,
}: ExpensesListProps) {
  const [showExpenses, setShowExpenses] = useState(true);

  // Sort expenses: multi-day to bottom
  const sortedExpenses = [...expenses].sort((a, b) => {
    const aIsMultiDay = !!a.end_date;
    const bIsMultiDay = !!b.end_date;
    if (aIsMultiDay && !bIsMultiDay) return 1;
    if (!aIsMultiDay && bIsMultiDay) return -1;
    return 0;
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
              Expenses for {dateTitle}
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
              No expenses recorded for {formatDateString(dateString)}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedExpenses.map((expense) => {
                const categoryInfo = statistics.by_category_today?.find(
                  (cat) => cat.category_id === expense.category_id
                );

                return (
                  <ExpenseItem
                    key={expense.id}
                    expense={expense}
                    categoryInfo={categoryInfo}
                    isExpanded={expandedExpenseId === expense.id}
                    currencyCode={currencyCode}
                    formatCurrency={formatCurrency}
                    onToggleExpand={() =>
                      onToggleExpand(
                        expandedExpenseId === expense.id ? null : expense.id
                      )
                    }
                    onEdit={() => onEditExpense(expense)}
                    onDelete={() => onDeleteExpense(expense)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
