import type { Expense } from '@/types/models';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { getIconComponent } from '@/components/ui/icon-picker';
import { Edit, Trash2, ArrowLeftRight } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import { calculateDailyExpenseAmount } from '@/lib/daily-budget-utils';

export interface ExpenseItemProps {
  expense: Expense;
  currencyCode: string;
  statistics: DailyBudgetStatistics;
  isExpanded: boolean;
  onToggleExpand: (expenseId: number) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

/**
 * Component for displaying a single expense item
 * Shows category icon, title, amount, and expandable details
 */
export function ExpenseItem({
  expense,
  currencyCode,
  statistics,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  // Find category info from statistics
  const categoryInfo = statistics.by_category_today?.find(
    (cat) => cat.category_id === expense.category_id
  );
  const CategoryIcon = categoryInfo ? getIconComponent(categoryInfo.category_icon) : null;

  const isMultiDay = !!expense.end_date;

  // Calculate display amount
  const displayAmount = isMultiDay
    ? calculateDailyExpenseAmount(expense.amount_in_trip_currency, expense.start_date, expense.end_date)
    : expense.amount_in_trip_currency;

  const formatCurrency = (amount: number) => {
    return `${formatNumber(amount)} ${currencyCode}`;
  };

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Main row - clickable */}
      <div className="flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors min-h-[44px]">
        {/* Category Icon */}
        {categoryInfo && (
          <div
            className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 cursor-pointer"
            style={{ backgroundColor: categoryInfo.category_color + '20' }}
            onClick={() => onToggleExpand(expense.id)}
          >
            {CategoryIcon && (
              <CategoryIcon
                className="h-4 w-4"
                style={{ color: categoryInfo.category_color }}
              />
            )}
          </div>
        )}

        {/* Expense Title */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onToggleExpand(expense.id)}
        >
          <span className="font-medium text-sm text-gray-900 truncate block">
            {expense.title}
          </span>
        </div>

        {/* Amount */}
        <div
          className="text-right shrink-0 cursor-pointer flex items-center gap-1.5"
          onClick={() => onToggleExpand(expense.id)}
        >
          {isMultiDay && (
            <ArrowLeftRight
              className="h-3.5 w-3.5 text-gray-500"
              title="Multi-day expense - showing daily amount"
            />
          )}
          <div className="font-bold text-sm text-gray-900">
            {formatCurrency(displayAmount)}
          </div>
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-2 pb-2 pt-1 border-t border-gray-100 bg-gray-50">
          <div className="space-y-2 text-sm">
            {/* Category */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500 w-20">Category:</span>
              <span className="text-gray-900">{categoryInfo?.category_name || 'Unknown'}</span>
            </div>

            {/* Payment method */}
            {expense.payment_method && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-20">Payment:</span>
                <span className="text-gray-900">{expense.payment_method}</span>
              </div>
            )}

            {/* Original currency */}
            {expense.currency_code !== currencyCode && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-20">Original:</span>
                <span className="text-gray-900">
                  {formatNumber(expense.amount)} {expense.currency_code}
                </span>
              </div>
            )}

            {/* Notes */}
            {expense.notes && (
              <div className="flex gap-2">
                <span className="text-gray-500 w-20 shrink-0">Notes:</span>
                <span className="text-gray-900">{expense.notes}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2 justify-end">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(expense);
                }}
                className="p-2 hover:bg-blue-50 rounded-md transition-colors text-gray-600 hover:text-blue-600"
                title="Edit expense"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(expense);
                }}
                className="p-2 hover:bg-red-50 rounded-md transition-colors text-gray-600 hover:text-red-600"
                title="Delete expense"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
