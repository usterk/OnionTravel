import { useState } from 'react';
import { Edit2, Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { getIconComponent } from '@/components/ui/icon-picker';
import { CategoryForm } from './CategoryForm';
import { deleteCategory } from '@/lib/categories-api';
import { formatNumber } from '@/lib/utils';
import type { Category, CategoryWithStats } from '@/types/models';

interface CategoryListProps {
  categories: CategoryWithStats[] | Category[];
  tripId: number;
  onCategoryUpdated: () => void;
  showStats?: boolean;
}

export function CategoryList({
  categories,
  tripId,
  onCategoryUpdated,
  showStats = false,
}: CategoryListProps) {
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleDelete = async () => {
    if (!deletingCategory) return;

    setIsDeleting(true);
    try {
      await deleteCategory(tripId, deletingCategory.id);
      onCategoryUpdated();
      setDeletingCategory(null);
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert('Failed to delete category. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const isWithStats = (
    category: Category | CategoryWithStats
  ): category is CategoryWithStats => {
    return 'total_spent' in category;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Categories</CardTitle>
          <Button onClick={() => setShowCreateForm(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No categories yet.</p>
              <p className="text-sm mt-1">Create your first category to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((category) => {
                const IconComponent = getIconComponent(category.icon);
                const categoryWithStats = isWithStats(category) ? category : null;

                return (
                  <div
                    key={category.id}
                    className="flex items-start justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors gap-3"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-md shrink-0"
                        style={{ backgroundColor: category.color + '20' }}
                      >
                        {IconComponent && (
                          <IconComponent
                            className="h-5 w-5"
                            style={{ color: category.color }}
                          />
                        )}
                      </div>

                      {/* Category Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-medium text-gray-900 break-words">{category.name}</h4>
                          {category.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              Default
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                          <span className="whitespace-nowrap">Budget: {category.budget_percentage || 0}%</span>
                          {showStats && categoryWithStats && (
                            <>
                              <span className="whitespace-nowrap">
                                Spent: ${formatNumber(categoryWithStats.total_spent)}
                              </span>
                              <span className="whitespace-nowrap">
                                Left: ${formatNumber(categoryWithStats.remaining_budget)}
                              </span>
                              <span
                                className={`whitespace-nowrap ${
                                  categoryWithStats.percentage_used > 100
                                    ? 'text-red-600 font-medium'
                                    : categoryWithStats.percentage_used > 90
                                    ? 'text-amber-600'
                                    : 'text-green-600'
                                }`}
                              >
                                {formatNumber(categoryWithStats.percentage_used, 1)}% used
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCategory(category)}
                        className="h-8 w-8"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingCategory(category)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Category Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent>
          <DialogHeader onClose={() => setShowCreateForm(false)}>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Add a new category to organize your trip expenses.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <CategoryForm
              tripId={tripId}
              onSuccess={() => {
                setShowCreateForm(false);
                onCategoryUpdated();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader onClose={() => setEditingCategory(null)}>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {editingCategory && (
              <CategoryForm
                tripId={tripId}
                category={editingCategory}
                onSuccess={() => {
                  setEditingCategory(null);
                  onCategoryUpdated();
                }}
                onCancel={() => setEditingCategory(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <DialogContent>
          <DialogHeader onClose={() => setDeletingCategory(null)}>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingCategory(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
