import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { getIconComponent } from '@/components/ui/icon-picker';
import { createExpense } from '@/lib/expenses-api';
import { Zap, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Category } from '@/types/models';

interface QuickExpenseEntryProps {
  tripId: number;
  tripCurrency: string;
  categories: Category[];
  onExpenseCreated: () => void;
}

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment', 'Other'];

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'THB', 'VND', 'SGD', 'AUD', 'CAD'];

export function QuickExpenseEntry({
  tripId,
  tripCurrency,
  categories,
  onExpenseCreated,
}: QuickExpenseEntryProps) {
  // Form state
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currency, setCurrency] = useState(tripCurrency);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Reset currency when trip currency changes
  useEffect(() => {
    setCurrency(tripCurrency);
  }, [tripCurrency]);

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
      await createExpense(tripId, {
        title: title.trim() || `${selectedCategory.name} expense`,
        amount: amountValue,
        currency_code: currency,
        category_id: selectedCategory.id,
        start_date: date,
        payment_method: paymentMethod || undefined,
        notes: notes.trim() || undefined,
      });

      // Success! Reset form
      setAmount('');
      setSelectedCategory(null);
      setDate(new Date().toISOString().split('T')[0]);
      setTitle('');
      setPaymentMethod('');
      setNotes('');
      setShowAdvanced(false);
      setSuccessMessage('Expense added successfully!');
      onExpenseCreated();

      // Focus back on amount input
      document.getElementById('quick-expense-amount')?.focus();
    } catch (err: any) {
      console.error('Failed to create expense:', err);
      setError(err.response?.data?.detail || 'Failed to add expense. Please try again.');
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
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Zap className="h-5 w-5 text-primary" />
          Quick Add Expense
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleAmountKeyDown}
                placeholder="0.00"
                className="text-4xl font-bold h-20 text-right flex-[9]"
                autoFocus
                disabled={isSubmitting}
              />
              <Select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex-[1] h-20 text-lg"
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
              <p className="text-sm text-gray-600">
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
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {categories.map((category) => {
                  const IconComponent = getIconComponent(category.icon);
                  const isSelected = selectedCategory?.id === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all hover:scale-105',
                        isSelected
                          ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                      title={category.name}
                      disabled={isSubmitting}
                    >
                      <div
                        className="flex items-center justify-center w-8 h-8 rounded-md"
                        style={{
                          backgroundColor: isSelected ? category.color : category.color + '20',
                        }}
                      >
                        {IconComponent && (
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: isSelected ? '#fff' : category.color }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-center truncate w-full">
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
              Title (Optional)
            </Label>
            <Input
              id="quick-expense-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                selectedCategory ? `${selectedCategory.name} expense` : 'Enter title'
              }
              disabled={isSubmitting}
            />
          </div>

          {/* Date Input */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label htmlFor="quick-expense-date" className="text-sm font-medium">
                Date *
              </Label>
              <Input
                id="quick-expense-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDate(new Date().toISOString().split('T')[0])}
              disabled={isSubmitting}
            >
              Today
            </Button>
          </div>

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
                Add Details (Optional)
              </>
            )}
          </Button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t">
              <div>
                <Label htmlFor="quick-expense-payment" className="text-sm font-medium">
                  Payment Method (Optional)
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
                  Notes (Optional)
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

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 text-lg font-semibold"
            disabled={isSubmitting || !amount || !selectedCategory}
          >
            {isSubmitting ? 'Adding...' : 'Add Expense'}
          </Button>

          {/* Keyboard Hint */}
          {amount && selectedCategory && !showAdvanced && (
            <p className="text-xs text-center text-gray-500">
              Press Enter to add expense quickly
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
