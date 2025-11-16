import { useState } from 'react';
import { Edit2, Trash2, Plus, GripVertical } from 'lucide-react';
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
import {
  DndContext,
  closestCenter,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getIconComponent } from '@/components/ui/icon-picker';
import { CategoryForm } from './CategoryForm';
import { deleteCategory, reorderCategories } from '@/lib/categories-api';
import { formatNumber } from '@/lib/utils';
import type { Category, CategoryWithStats } from '@/types/models';

interface CategoryListProps {
  categories: CategoryWithStats[] | Category[];
  tripId: number;
  onCategoryUpdated: () => void;
  showStats?: boolean;
}

interface SortableCategoryItemProps {
  category: Category | CategoryWithStats;
  showStats: boolean;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

function SortableCategoryItem({
  category,
  showStats,
  onEdit,
  onDelete,
}: SortableCategoryItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const IconComponent = getIconComponent(category.icon);
  const isWithStats = (cat: Category | CategoryWithStats): cat is CategoryWithStats => {
    return 'total_spent' in cat;
  };
  const categoryWithStats = isWithStats(category) ? category : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-gray-300 transition-all gap-3 ${
        isDragging ? 'cursor-grabbing z-10' : ''
      }`}
    >
      {/* Drag handle with touch support */}
      <div
        {...attributes}
        {...listeners}
        className="flex items-center justify-center shrink-0 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="h-5 w-5" />
      </div>

      <div className="flex items-center gap-3 flex-1 min-w-0">
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
                      ? 'text-red-600 font-bold'
                      : categoryWithStats.percentage_used > 90
                      ? 'text-amber-600 font-medium'
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
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onEdit(category)}
          className="h-8 w-8"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onDelete(category)}
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
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
  const [isReordering, setIsReordering] = useState(false);

  // Configure dnd-kit sensors with mobile support
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10, // 10px movement to start drag (prevents accidental drags)
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,      // 250ms long-press to activate drag
        tolerance: 5,    // 5px movement tolerance during press
      },
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = categories.findIndex(cat => cat.id === active.id);
    const newIndex = categories.findIndex(cat => cat.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Haptic feedback on drop (if supported)
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }

    setIsReordering(true);
    try {
      // Reorder the categories array
      const reorderedCategories = arrayMove(categories, oldIndex, newIndex);

      // Extract category IDs in new order
      const categoryIds = reorderedCategories.map(cat => cat.id);

      // Call API to update order
      await reorderCategories(tripId, categoryIds);

      // Refresh categories list
      onCategoryUpdated();
    } catch (error) {
      console.error('Failed to reorder categories:', error);
      alert('Failed to reorder categories. Please try again.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleDragStart = () => {
    // Haptic feedback on drag start (if supported)
    if (window.navigator.vibrate) {
      window.navigator.vibrate(10);
    }
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={categories.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
                disabled={isReordering}
              >
                <div className="space-y-2">
                  {categories.map((category) => (
                    <SortableCategoryItem
                      key={category.id}
                      category={category}
                      showStats={showStats}
                      onEdit={setEditingCategory}
                      onDelete={setDeletingCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
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
