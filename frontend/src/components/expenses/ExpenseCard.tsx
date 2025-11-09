import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getIconComponent } from '@/components/ui/icon-picker';
import { Edit2, Trash2, Calendar, CreditCard, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { formatNumber } from '@/lib/utils';
import type { Expense, Category } from '@/types/models';

interface ExpenseCardProps {
  expense: Expense;
  tripCurrency: string;
  onEdit?: (expense: Expense) => void;
  onDelete?: (expense: Expense) => void;
  showActions?: boolean;
}

export function ExpenseCard({
  expense,
  tripCurrency,
  onEdit,
  onDelete,
  showActions = true,
}: ExpenseCardProps) {
  const category = expense.category;
  const IconComponent = category?.icon ? getIconComponent(category.icon) : null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatAmount = (amount: number, currencyCode: string) => {
    return `${currencyCode} ${formatNumber(amount)}`;
  };

  const isMultiDay = expense.end_date && expense.end_date !== expense.start_date;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          {/* Left side - Info */}
          <div className="flex items-start gap-3 flex-1">
            {/* Expense Details */}
            <div className="flex-1 min-w-0">
              {/* Title and Category Icon */}
              <div className="flex items-center gap-2 mb-1">
                {category && IconComponent && (
                  <div
                    className="flex items-center justify-center w-6 h-6 rounded shrink-0"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    <IconComponent className="h-4 w-4" style={{ color: category.color }} />
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 truncate">{expense.title}</h3>
              </div>

              {/* Description */}
              {expense.description && (
                <p className="text-sm text-gray-600 mb-2">{expense.description}</p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                {/* Date */}
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    {formatDate(expense.start_date)}
                    {isMultiDay && ` - ${formatDate(expense.end_date!)}`}
                  </span>
                </div>

                {/* Payment Method */}
                {expense.payment_method && (
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>{expense.payment_method}</span>
                  </div>
                )}

                {/* Location */}
                {expense.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{expense.location}</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {expense.notes && (
                <div className="flex items-start gap-1 mt-2 text-sm text-gray-600">
                  <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="italic">{expense.notes}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Amount and Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Amount */}
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">
                {formatAmount(expense.amount, expense.currency_code)}
              </div>
              {/* Show converted amount if different currency */}
              {expense.currency_code !== tripCurrency && expense.amount_in_trip_currency && (
                <div className="text-sm text-gray-600">
                  {formatAmount(expense.amount_in_trip_currency, tripCurrency)}
                </div>
              )}
              {/* Exchange rate info */}
              {expense.exchange_rate && expense.currency_code !== tripCurrency && (
                <div className="text-xs text-gray-500">
                  Rate: {formatNumber(expense.exchange_rate, 4)}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {showActions && (onEdit || onDelete) && (
              <div className="flex items-center gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(expense)}
                    className="h-8 w-8"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(expense)}
                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
