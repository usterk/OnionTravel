import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { DatePickerInput } from '@/components/ui/date-picker-input';
import { TitleAutocomplete } from '@/components/ui/title-autocomplete';
import { getIconComponent } from '@/components/ui/icon-picker';
import { createExpense, updateExpense } from '@/lib/expenses-api';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category, Expense } from '@/types/models';

interface QuickExpenseEntryProps {
  tripId: number;
  tripCurrency: string;
  tripStartDate: string;
  tripEndDate: string;
  categories: Category[];
  expense?: Expense;
  initialDate?: string; // Optional initial date (defaults to today)
  onExpenseCreated: () => void;
  onCancel?: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment', 'Other'];

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'THB', 'VND', 'SGD', 'AUD', 'CAD'];

export function QuickExpenseEntry({
  tripId,
  tripCurrency,
  tripStartDate,
  tripEndDate,
  categories,
  expense,
  initialDate,
  onExpenseCreated,
  onCancel,
}: QuickExpenseEntryProps) {
  // Form state
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currency, setCurrency] = useState(tripCurrency);
  const [date, setDate] = useState(initialDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [title, setTitle] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Initialize form with expense data when editing
  useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setSelectedCategory(categories.find(c => c.id === expense.category_id) || null);
      setCurrency(expense.currency_code);
      setDate(expense.start_date);
      setEndDate(expense.end_date || '');
      setTitle(expense.title);
      setPaymentMethod(expense.payment_method || '');
      setNotes(expense.notes || '');
      setIsMultiDay(!!expense.end_date);
      setShowAdvanced(!!(expense.payment_method || expense.notes));
    }
  }, [expense, categories]);

  // Reset currency when trip currency changes
  useEffect(() => {
    if (!expense) {
      setCurrency(tripCurrency);
    }
  }, [tripCurrency, expense]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const amountValue = parseFloat(amount);
    if (!amount || isNaN(amountValue) || amountValue <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!selectedCategory) {
      setError('Please select a category');
      return;
    }

    setIsSubmitting(true);

    try {
      const expenseData = {
        title: title.trim() || `${selectedCategory.name} expense`,
        amount: amountValue,
        currency_code: currency,
        category_id: selectedCategory.id,
        start_date: date,
        end_date: (isMultiDay && endDate) ? endDate : undefined,
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
      };

      if (expense) {
        // Update existing expense
        await updateExpense(tripId, expense.id, expenseData);
        setSuccessMessage('Expense updated successfully!');
      } else {
        // Create new expense
        await createExpense(tripId, expenseData);
        // Success! Reset form for new entry
        setAmount('');
        setSelectedCategory(null);
        setDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setTitle('');
        setPaymentMethod('');
        setNotes('');
        setShowAdvanced(false);
        setIsMultiDay(false);
        setSuccessMessage('Expense added successfully!');

        // Focus back on amount input
        document.getElementById('quick-expense-amount')?.focus();
      }

      onExpenseCreated();
    } catch (err: any) {
      console.error('Failed to save expense:', err);
      setError(err.response?.data?.detail || `Failed to ${expense ? 'update' : 'add'} expense. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Enter key on amount input
  const handleAmountKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedCategory && amount) {
      handleSubmit(e as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
              <Check className="h-4 w-4" />
              {successMessage}
            </div>
          )}

          {/* Amount Input - Large and Prominent */}
          <div className="space-y-2">
            <Label htmlFor="quick-expense-amount" className="text-sm font-medium">
              Amount ({currency}) *
            </Label>
            <div className="flex gap-2 w-full">
              <Input
                id="quick-expense-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                placeholder="0.00"
                className="text-2xl sm:text-3xl md:text-4xl font-bold h-14 sm:h-16 md:h-20 text-right flex-[3] sm:flex-[4]"
                autoFocus
                disabled={isSubmitting}
              />
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex-[1] h-14 sm:h-16 md:h-20 text-sm sm:text-base md:text-lg"
                disabled={isSubmitting}
              >
                <option value={tripCurrency}>{tripCurrency}</option>
                {COMMON_CURRENCIES.filter((c) => c !== tripCurrency).map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </Select>
            </div>
            {currency !== tripCurrency && (
              <p className="text-xs sm:text-sm text-gray-600">
                Will be converted to {tripCurrency} automatically
              </p>
            )}
          </div>

          {/* Category Selection - Icon Grid */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Category *</Label>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">
                No categories available. Please create categories first.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 gap-2">
                {categories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const isSelected = selectedCategory?.id === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 sm:p-3 rounded-lg border-2 transition-all hover:scale-105',
                        isSelected
                          ? 'border-primary bg-primary/10'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      title={category.name}
                      disabled={isSubmitting}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-md"
                        style={{
                          backgroundColor: isSelected ? category.color : category.color + '20',
                        }}
                      >
                        {IconComponent && (
                          <IconComponent
                            className="h-5 w-5 sm:h-6 sm:w-6"
                            style={{ color: isSelected ? '#fff' : category.color }}
                          />
                        )}
                      </div>
                      <span className="text-[10px] sm:text-xs text-center w-full leading-tight line-clamp-2">
                        {category.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Title Input */}
          <div>
            <Label htmlFor="quick-expense-title" className="text-sm font-medium">
              Title
            </Label>
            <TitleAutocomplete
              id="quick-expense-title"
              tripId={tripId}
              value={title}
              onChange={setTitle}
              placeholder={
                selectedCategory ? `${selectedCategory.name} expense` : 'Enter title'
              }
              disabled={isSubmitting}
            />
          </div>

          {/* Multi-day Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="quick-multi-day"
              checked={isMultiDay}
              onChange={(e) => {
                setIsMultiDay(e.target.checked);
                if (!e.target.checked) {
                  setEndDate('');
                }
              }}
              disabled={isSubmitting}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <Label htmlFor="quick-multi-day" className="cursor-pointer text-sm font-medium">
              Multi-day expense
            </Label>
          </div>

          {/* Date Input */}
          {isMultiDay ? (
            <div className="flex gap-4 flex-wrap items-start">
              <div className="space-y-3">
                <Label htmlFor="quick-expense-date" className="text-sm font-medium block">
                  Start Date
                </Label>
                <DatePickerInput
                  id="quick-expense-date"
                  value={date}
                  onChange={setDate}
                  min={tripStartDate}
                  max={tripEndDate}
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="quick-expense-end-date" className="text-sm font-medium block">
                  End Date
                </Label>
                <DatePickerInput
                  id="quick-expense-end-date"
                  value={endDate}
                  onChange={setEndDate}
                  min={date || tripStartDate}
                  max={tripEndDate}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="quick-expense-date" className="text-sm font-medium block">
                Date
              </Label>
              <DatePickerInput
                id="quick-expense-date"
                value={date}
                onChange={setDate}
                min={tripStartDate}
                max={tripEndDate}
                disabled={isSubmitting}
              />
            </div>
          )}

          {/* Advanced Options Toggle */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-center gap-2"
            disabled={isSubmitting}
          >
            {showAdvanced ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Add Details
              </>
            )}
          </Button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t">
              <div>
                <Label htmlFor="quick-expense-payment" className="text-sm font-medium">
                  Payment Method
                </Label>
                <Select
                  id="quick-expense-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select payment method...</option>
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="quick-expense-notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Input
                  id="quick-expense-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {expense && onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 h-12 text-lg font-semibold"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              className={`h-12 text-lg font-semibold ${expense ? 'flex-1' : 'w-full'}`}
              disabled={isSubmitting || !amount || !selectedCategory}
            >
              {isSubmitting ? (expense ? 'Updating...' : 'Adding...') : (expense ? 'Update Expense' : 'Add Expense')}
            </Button>
          </div>

          {/* Keyboard Hint */}
          {!expense && amount && selectedCategory && !showAdvanced && (
            <p className="text-xs text-center text-gray-500">
              Press Enter to add expense quickly
            </p>
          )}
        </form>
  );
}
