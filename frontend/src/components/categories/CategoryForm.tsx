import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ColorPicker, PRESET_COLORS } from '@/components/ui/color-picker';
import { IconPicker, toKebabCase } from '@/components/ui/icon-picker';
import { createCategory, updateCategory, getCategories } from '@/lib/categories-api';
import { formatNumber } from '@/lib/utils';
import type { Category } from '@/types/models';
import type { CategoryCreate, CategoryUpdate } from '@/lib/categories-api';

interface CategoryFormProps {
  tripId: number;
  category?: Category;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function CategoryForm({ tripId, category, onSuccess, onCancel }: CategoryFormProps) {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    color: category?.color || PRESET_COLORS[0].value,
    icon: category?.icon || 'Tag',
    budget_percentage: category?.budget_percentage?.toString() || '0',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalAllocated, setTotalAllocated] = useState(0);

  // Calculate total allocated budget percentage
  useEffect(() => {
    const fetchTotalAllocated = async () => {
      try {
        const categories = await getCategories(tripId);
        const total = categories
          .filter((c) => c.id !== category?.id) // Exclude current category when editing
          .reduce((sum, c) => sum + (c.budget_percentage || 0), 0);
        setTotalAllocated(total);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      }
    };

    fetchTotalAllocated();
  }, [tripId, category?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    const budgetPercentage = parseFloat(formData.budget_percentage);
    if (isNaN(budgetPercentage) || budgetPercentage < 0 || budgetPercentage > 100) {
      setError('Budget percentage must be between 0 and 100');
      return;
    }

    // Check if total allocation would exceed 100%
    const newTotal = totalAllocated + budgetPercentage;
    if (newTotal > 100) {
      setError(
        `Total budget allocation cannot exceed 100%. Currently allocated: ${formatNumber(totalAllocated, 1)}%. Available: ${formatNumber(100 - totalAllocated, 1)}%`
      );
      return;
    }

    setIsLoading(true);

    try {
      // Convert icon to kebab-case for backend
      const iconKebabCase = formData.icon ? toKebabCase(formData.icon) : undefined;

      if (category) {
        // Update existing category
        const updateData: CategoryUpdate = {
          name: formData.name,
          color: formData.color,
          icon: iconKebabCase,
          budget_percentage: budgetPercentage,
        };
        await updateCategory(tripId, category.id, updateData);
      } else {
        // Create new category
        const createData: CategoryCreate = {
          name: formData.name,
          color: formData.color,
          icon: iconKebabCase,
          budget_percentage: budgetPercentage,
        };
        await createCategory(tripId, createData);
      }

      onSuccess();
    } catch (err: any) {
      console.error('Failed to save category:', err);
      setError(err.response?.data?.detail || 'Failed to save category. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const budgetPercentage = parseFloat(formData.budget_percentage) || 0;
  const projectedTotal = totalAllocated + budgetPercentage;
  const availablePercentage = 100 - totalAllocated;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
          {error}
        </div>
      )}

      <div>
        <Label htmlFor="name">Category Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Transportation, Food, Accommodation"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label>Color *</Label>
        <ColorPicker
          value={formData.color}
          onChange={(color) => setFormData({ ...formData, color })}
        />
      </div>

      <div>
        <Label>Icon</Label>
        <IconPicker
          value={formData.icon}
          onChange={(icon) => setFormData({ ...formData, icon })}
        />
      </div>

      <div>
        <Label htmlFor="budget_percentage">Budget Percentage</Label>
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <Input
              id="budget_percentage"
              type="number"
              step="1.0"
              min="0"
              max="100"
              value={formData.budget_percentage}
              onChange={(e) =>
                setFormData({ ...formData, budget_percentage: e.target.value })
              }
              placeholder="0"
              disabled={isLoading}
              className="w-24"
            />
            <span className="text-gray-600">%</span>
          </div>

          {/* Budget allocation summary */}
          <div className="text-sm space-y-1">
            <div className="flex justify-between text-gray-600">
              <span>Currently allocated (other categories):</span>
              <span className="font-medium">{formatNumber(totalAllocated, 1)}%</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>This category:</span>
              <span className="font-medium">{formatNumber(budgetPercentage, 1)}%</span>
            </div>
            <div className="flex justify-between border-t pt-1">
              <span
                className={projectedTotal > 100 ? 'text-red-600 font-medium' : 'text-gray-900'}
              >
                Total allocated:
              </span>
              <span
                className={
                  projectedTotal > 100
                    ? 'text-red-600 font-medium'
                    : projectedTotal > 90
                    ? 'text-amber-600 font-medium'
                    : 'font-medium'
                }
              >
                {formatNumber(projectedTotal, 1)}%
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Available:</span>
              <span className="font-medium">
                {formatNumber(Math.max(0, availablePercentage - budgetPercentage), 1)}%
              </span>
            </div>
          </div>

          {projectedTotal > 100 && (
            <p className="text-red-600 text-sm">
              Warning: Total allocation exceeds 100%. Please reduce the budget percentage.
            </p>
          )}
          {projectedTotal > 90 && projectedTotal <= 100 && (
            <p className="text-amber-600 text-sm">
              Notice: You're allocating {formatNumber(projectedTotal, 1)}% of your budget.
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading || projectedTotal > 100}>
          {isLoading ? 'Saving...' : category ? 'Update Category' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}
