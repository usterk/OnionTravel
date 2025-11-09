import { useEffect, useState } from 'react';
import { Category } from '@/types/models';
import { categoryApi } from '@/lib/api';

interface CategoriesListProps {
  tripId: number;
}

export function CategoriesList({ tripId }: CategoriesListProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
  }, [tripId]);

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryApi.getCategories(tripId);
      setCategories(data);
    } catch (err) {
      setError('Failed to load categories');
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-gray-500">Loading categories...</div>;
  }

  if (error) {
    return <div className="text-red-500">{error}</div>;
  }

  if (categories.length === 0) {
    return <div className="text-gray-500">No categories found</div>;
  }

  const totalBudget = categories.reduce(
    (sum, cat) => sum + (cat.budget_percentage || 0),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Budget Categories</h3>
        <div className="text-sm text-gray-600">
          Total: {totalBudget.toFixed(1)}%
        </div>
      </div>

      <div className="grid gap-3">
        {categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50"
          >
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: category.color }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{category.name}</div>
              {category.icon && (
                <div className="text-xs text-gray-500">{category.icon}</div>
              )}
            </div>
            <div className="text-sm font-medium text-gray-700">
              {category.budget_percentage?.toFixed(1)}%
            </div>
            {category.is_default && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Default
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
