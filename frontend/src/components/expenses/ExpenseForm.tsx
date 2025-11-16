import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getIconComponent } from '@/components/ui/icon-picker';
import { createExpense, updateExpense } from '@/lib/expenses-api';
import type { Expense, Category } from '@/types/models';
import type { ExpenseCreate, ExpenseUpdate } from '@/lib/expenses-api';

interface ExpenseFormProps {
  tripId: number;
  tripCurrency: string;
  tripStartDate: string;
  tripEndDate: string;
  categories: Category[];
  expense?: Expense;
  onSuccess: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment', 'Other'];
const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'THB', 'VND', 'SGD', 'AUD', 'CAD'];

export function ExpenseForm({
  tripId,
  tripCurrency,
  tripStartDate,
  tripEndDate,
  categories,
  expense,
  onSuccess,
  onCancel,
}: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    title: expense?.title || '',
    description: expense?.description || '',
    amount: expense?.amount.toString() || '',
    currency_code: expense?.currency_code || tripCurrency,
    category_id: expense?.category_id.toString() || '',
    start_date: expense?.start_date || new Date().toISOString().split('T')[0],
    end_date: expense?.end_date || '',
    payment_method: expense?.payment_method || '',
    location: expense?.location || '',
    notes: expense?.notes || '',
  });

  const [isMultiDay, setIsMultiDay] = useState(!!expense?.end_date);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form when expense changes
  useEffect(() => {
    if (expense) {
      setFormData({
        title: expense.title,
        description: expense.description || '',
        amount: expense.amount.toString(),
        currency_code: expense.currency_code,
        category_id: expense.category_id.toString(),
        start_date: expense.start_date,
        end_date: expense.end_date || '',
        payment_method: expense.payment_method || '',
        location: expense.location || '',
        notes: expense.notes || '',
      });
      setIsMultiDay(!!expense.end_date);
    }
  }, [expense]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    const amountValue = parseFloat(formData.amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (!formData.category_id) {
      setError('Category is required');
      return;
    }

    if (!formData.start_date) {
      setError('Start date is required');
      return;
    }

    // Validate dates are within trip range
    if (formData.start_date < tripStartDate || formData.start_date > tripEndDate) {
      setError('Start date must be within the trip dates');
      return;
    }

    // Validate date range for multi-day expenses
    if (isMultiDay && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);

      if (endDate < startDate) {
        setError('End date must be on or after start date');
        return;
      }

      if (formData.end_date > tripEndDate) {
        setError('End date must be within the trip dates');
        return;
      }
    }

    setIsLoading(true);

    try {
      if (expense) {
        // Update existing expense
        const updateData: ExpenseUpdate = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          amount: amountValue,
          currency_code: formData.currency_code,
          category_id: parseInt(formData.category_id),
          start_date: formData.start_date,
          end_date: isMultiDay && formData.end_date ? formData.end_date : undefined,
          payment_method: formData.payment_method || undefined,
          location: formData.location.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        };
        await updateExpense(tripId, expense.id, updateData);
      } else {
        // Create new expense
        const createData: ExpenseCreate = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          amount: amountValue,
          currency_code: formData.currency_code,
          category_id: parseInt(formData.category_id),
          start_date: formData.start_date,
          end_date: isMultiDay && formData.end_date ? formData.end_date : undefined,
          payment_method: formData.payment_method || undefined,
          location: formData.location.trim() || undefined,
          notes: formData.notes.trim() || undefined,
        };
        await createExpense(tripId, createData);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      setError(err.response?.data?.detail || 'Failed to save expense. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Title */}
      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="e.g., Hotel booking, Dinner at restaurant"
          required
          disabled={isLoading}
        />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Additional details..."
          disabled={isLoading}
        />
      </div>

      {/* Amount and Currency */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            placeholder="0.00"
            required
            disabled={isLoading}
          />
        </div>
        <div>
          <Label htmlFor="currency_code">Currency *</Label>
          <Select
            id="currency_code"
            value={formData.currency_code}
            onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
            required
            disabled={isLoading}
          >
            <option value={tripCurrency}>{tripCurrency}</option>
            {COMMON_CURRENCIES.filter((c) => c !== tripCurrency).map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Currency Conversion Notice */}
      {formData.currency_code !== tripCurrency && (
        <p className="text-sm text-gray-600 -mt-2">
          Amount will be automatically converted to {tripCurrency}
        </p>
      )}

      {/* Category */}
      <div>
        <Label>Category *</Label>
        <div className="grid grid-cols-4 gap-2 mt-2">
          {categories.map((cat) => {
            const IconComponent = getIconComponent(cat.icon);
            const isSelected = formData.category_id === cat.id.toString();

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFormData({ ...formData, category_id: cat.id.toString() })}
                disabled={isLoading}
                className={`
                  flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all
                  ${isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                  }
                  ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={cat.name}
              >
                {IconComponent && <IconComponent className="h-6 w-6 mb-1" />}
                <span className="text-xs text-center line-clamp-1">{cat.name}</span>
              </button>
            );
          })}
        </div>
        {!formData.category_id && (
          <p className="text-sm text-red-600 mt-1">Please select a category</p>
        )}
      </div>

      {/* Multi-day Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="multi-day"
          checked={isMultiDay}
          onChange={(e) => {
            setIsMultiDay(e.target.checked);
            if (!e.target.checked) {
              setFormData({ ...formData, end_date: '' });
            }
          }}
          disabled={isLoading}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <Label htmlFor="multi-day" className="cursor-pointer">
          Multi-day expense
        </Label>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">{isMultiDay ? 'Start Date' : 'Date'}</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            min={tripStartDate}
            max={tripEndDate}
            required
            disabled={isLoading}
          />
        </div>
        {isMultiDay && (
          <div>
            <Label htmlFor="end_date">End Date</Label>
            <Input
              id="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              min={formData.start_date || tripStartDate}
              max={tripEndDate}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div>
        <Label htmlFor="payment_method">Payment Method</Label>
        <Select
          id="payment_method"
          value={formData.payment_method}
          onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
          disabled={isLoading}
        >
          <option value="">Select payment method...</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </Select>
      </div>

      {/* Location */}
      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="e.g., Tokyo, Japan"
          disabled={isLoading}
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Input
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Any additional notes..."
          disabled={isLoading}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : expense ? 'Update Expense' : 'Create Expense'}
        </Button>
      </div>
    </form>
  );
}
