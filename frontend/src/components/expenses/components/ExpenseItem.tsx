import { Edit, Trash2, ArrowLeftRight } from 'lucide-react';
import { getIconComponent } from '@/components/ui/icon-picker';
import { formatNumber } from '@/lib/utils';
import type { Expense } from '@/types/models';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';
import { calculateDailyAmount } from '../utils/formatters';

export interface ExpenseItemProps {
  expense: Expense;
  categoryInfo: DailyBudgetStatistics['by_category_today'][0] | undefined;
  isExpanded: boolean;
  currencyCode: string;
  formatCurrency: (amount: number) => string;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * Individual expense item with expandable details
 */
export function ExpenseItem({
  expense,
  categoryInfo,
  isExpanded,
  currencyCode,
  formatCurrency,
  onToggleExpand,
  onEdit,
  onDelete,
}: ExpenseItemProps) {
  const CategoryIcon = categoryInfo ? getIconComponent(categoryInfo.category_icon) : null;
  const isMultiDay = !!expense.end_date;

  // Calculate daily amount for multi-day expenses
  const displayAmount = isMultiDay && expense.start_date && expense.end_date
    ? calculateDailyAmount(expense.amount_in_trip_currency, expense.start_date, expense.end_date)
    : expense.amount_in_trip_currency;

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {/* Main row - clickable */}
      <div className="flex items-center gap-3 p-2 hover:bg-gray-50 transition-colors min-h-[44px]">
        {/* Category Icon */}
        {categoryInfo && (
          <div
            className="flex items-center justify-center w-6 h-6 rounded-md shrink-0 cursor-pointer"
            style={{ backgroundColor: categoryInfo.category_color + '20' }}
            onClick={onToggleExpand}
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
        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
          <span className="font-medium text-sm text-gray-900 truncate block">
            {expense.title}
          </span>
        </div>

        {/* Amount */}
        <div
          className="text-right shrink-0 cursor-pointer flex items-center gap-1.5"
          onClick={onToggleExpand}
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
              <span className="text-gray-900">
                {categoryInfo?.category_name || 'Unknown'}
              </span>
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
                  onEdit();
                }}
                className="p-2 hover:bg-blue-50 rounded-md transition-colors text-gray-600 hover:text-blue-600"
                title="Edit expense"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
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
