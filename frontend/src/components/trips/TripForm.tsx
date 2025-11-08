import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { TripCreate, TripUpdate } from '@/types/trip';

interface TripFormProps {
  initialData?: Partial<TripCreate>;
  onSubmit: (data: TripCreate | TripUpdate) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'PLN', name: 'Polish Złoty' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
];

export function TripForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Create Trip',
}: TripFormProps) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    description: initialData?.description || '',
    start_date: initialData?.start_date || '',
    end_date: initialData?.end_date || '',
    currency_code: initialData?.currency_code || 'USD',
    total_budget: initialData?.total_budget?.toString() || '',
    daily_budget: initialData?.daily_budget?.toString() || '',
  });

  const [budgetMode, setBudgetMode] = useState<'total' | 'daily'>('total');

  // Calculate daily budget from total budget
  useEffect(() => {
    if (budgetMode === 'total' && formData.total_budget && formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) {
        const dailyBudget = (parseFloat(formData.total_budget) / days).toFixed(2);
        setFormData((prev) => ({ ...prev, daily_budget: dailyBudget }));
      }
    }
  }, [formData.total_budget, formData.start_date, formData.end_date, budgetMode]);

  // Calculate total budget from daily budget
  useEffect(() => {
    if (budgetMode === 'daily' && formData.daily_budget && formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (days > 0) {
        const totalBudget = (parseFloat(formData.daily_budget) * days).toFixed(2);
        setFormData((prev) => ({ ...prev, total_budget: totalBudget }));
      }
    }
  }, [formData.daily_budget, formData.start_date, formData.end_date, budgetMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: TripCreate = {
      name: formData.name,
      description: formData.description || null,
      start_date: formData.start_date,
      end_date: formData.end_date,
      currency_code: formData.currency_code,
      total_budget: formData.total_budget ? parseFloat(formData.total_budget) : null,
      daily_budget: formData.daily_budget ? parseFloat(formData.daily_budget) : null,
    };

    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Trip Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Summer Vacation to Thailand"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Start Date *</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="end_date">End Date *</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
            required
            min={formData.start_date}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="currency_code">Currency *</Label>
        <Select
          id="currency_code"
          value={formData.currency_code}
          onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
          required
        >
          {SUPPORTED_CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} - {currency.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label>Budget Mode</Label>
        <div className="flex gap-2 mt-2">
          <Button
            type="button"
            variant={budgetMode === 'total' ? 'default' : 'outline'}
            onClick={() => setBudgetMode('total')}
            className="flex-1"
          >
            Total Budget
          </Button>
          <Button
            type="button"
            variant={budgetMode === 'daily' ? 'default' : 'outline'}
            onClick={() => setBudgetMode('daily')}
            className="flex-1"
          >
            Daily Budget
          </Button>
        </div>
      </div>

      {budgetMode === 'total' ? (
        <div>
          <Label htmlFor="total_budget">Total Budget</Label>
          <Input
            id="total_budget"
            type="number"
            step="0.01"
            min="0"
            value={formData.total_budget}
            onChange={(e) => setFormData({ ...formData, total_budget: e.target.value })}
            placeholder="0.00"
          />
          {formData.daily_budget && (
            <p className="text-sm text-muted-foreground mt-1">
              Daily budget: {formData.currency_code} {formData.daily_budget}
            </p>
          )}
        </div>
      ) : (
        <div>
          <Label htmlFor="daily_budget">Daily Budget</Label>
          <Input
            id="daily_budget"
            type="number"
            step="0.01"
            min="0"
            value={formData.daily_budget}
            onChange={(e) => setFormData({ ...formData, daily_budget: e.target.value })}
            placeholder="0.00"
          />
          {formData.total_budget && (
            <p className="text-sm text-muted-foreground mt-1">
              Total budget: {formData.currency_code} {formData.total_budget}
            </p>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
