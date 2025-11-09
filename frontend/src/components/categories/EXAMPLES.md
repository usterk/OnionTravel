# Category Components - Usage Examples

## Quick Start

### 1. Basic Category List

Display categories without statistics:

```tsx
import { CategoryList } from '@/components/categories';
import { getCategories } from '@/lib/categories-api';

function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const tripId = 1; // Your trip ID

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const data = await getCategories(tripId);
    setCategories(data);
  };

  return (
    <CategoryList
      categories={categories}
      tripId={tripId}
      onCategoryUpdated={loadCategories}
    />
  );
}
```

### 2. Category List with Statistics

Display categories with spending information:

```tsx
import { CategoryList } from '@/components/categories';
import { getCategoriesWithStats } from '@/lib/categories-api';

function CategoriesWithStats() {
  const [categories, setCategories] = useState([]);
  const tripId = 1;

  const loadCategories = async () => {
    const data = await getCategoriesWithStats(tripId);
    setCategories(data);
  };

  return (
    <CategoryList
      categories={categories}
      tripId={tripId}
      onCategoryUpdated={loadCategories}
      showStats={true}  // Enable statistics display
    />
  );
}
```

### 3. Standalone Budget Allocation Widget

Show just the budget visualization:

```tsx
import { BudgetAllocation } from '@/components/categories';
import { getCategoriesWithStats } from '@/lib/categories-api';

function BudgetWidget({ trip }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    loadCategories();
  }, [trip.id]);

  const loadCategories = async () => {
    const data = await getCategoriesWithStats(trip.id);
    setCategories(data);
  };

  return (
    <BudgetAllocation
      categories={categories}
      tripCurrency={trip.currency_code}
      totalBudget={trip.total_budget}
    />
  );
}
```

### 4. Create Category in Modal

Open a form in a dialog to create a new category:

```tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/dialog';
import { CategoryForm } from '@/components/categories';
import { Button } from '@/components/ui/button';

function CreateCategoryButton({ tripId, onCreated }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Create Category
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setIsOpen(false)}>
            <DialogTitle>Create New Category</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <CategoryForm
              tripId={tripId}
              onSuccess={() => {
                setIsOpen(false);
                onCreated();
              }}
              onCancel={() => setIsOpen(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### 5. Edit Category Form

Edit an existing category:

```tsx
import { CategoryForm } from '@/components/categories';

function EditCategoryDialog({ tripId, category, onClose, onUpdated }) {
  return (
    <Dialog open={!!category} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader onClose={onClose}>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {category && (
            <CategoryForm
              tripId={tripId}
              category={category}
              onSuccess={() => {
                onClose();
                onUpdated();
              }}
              onCancel={onClose}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
```

### 6. Standalone Color Picker

Use the color picker in your own form:

```tsx
import { useState } from 'react';
import { ColorPicker } from '@/components/ui/color-picker';
import { Label } from '@/components/ui/label';

function CustomForm() {
  const [color, setColor] = useState('#3b82f6');

  return (
    <div>
      <Label>Choose a color</Label>
      <ColorPicker value={color} onChange={setColor} />
      <p>Selected: {color}</p>
    </div>
  );
}
```

### 7. Standalone Icon Picker

Use the icon picker in your own form:

```tsx
import { useState } from 'react';
import { IconPicker, getIconComponent } from '@/components/ui/icon-picker';
import { Label } from '@/components/ui/label';

function CustomForm() {
  const [iconName, setIconName] = useState('Star');
  const IconComponent = getIconComponent(iconName);

  return (
    <div>
      <Label>Choose an icon</Label>
      <IconPicker value={iconName} onChange={setIconName} />

      {IconComponent && (
        <div className="flex items-center gap-2 mt-4">
          <IconComponent className="h-6 w-6" />
          <span>Selected: {iconName}</span>
        </div>
      )}
    </div>
  );
}
```

### 8. Full Dashboard with Categories

Combine all components for a complete trip management view:

```tsx
import { useState, useEffect } from 'react';
import { CategoryList, BudgetAllocation } from '@/components/categories';
import { getCategoriesWithStats } from '@/lib/categories-api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function TripDashboard({ trip }) {
  const [categories, setCategories] = useState([]);

  const loadCategories = async () => {
    const data = await getCategoriesWithStats(trip.id);
    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
  }, [trip.id]);

  return (
    <div className="space-y-6">
      <h1>{trip.name}</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <BudgetAllocation
            categories={categories}
            tripCurrency={trip.currency_code}
            totalBudget={trip.total_budget}
          />
        </TabsContent>

        <TabsContent value="categories">
          <CategoryList
            categories={categories}
            tripId={trip.id}
            onCategoryUpdated={loadCategories}
            showStats={true}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 9. Initialize Default Categories

Create default categories when a trip is created:

```tsx
import { useEffect } from 'react';
import { initializeDefaultCategories } from '@/lib/categories-api';
import { Button } from '@/components/ui/button';

function TripSetup({ tripId, onComplete }) {
  const [isLoading, setIsLoading] = useState(false);

  const handleInitDefaults = async () => {
    setIsLoading(true);
    try {
      await initializeDefaultCategories(tripId);
      onComplete();
    } catch (error) {
      console.error('Failed to initialize categories:', error);
      alert('Failed to create default categories');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h2>Set Up Your Categories</h2>
      <p>Would you like to start with default categories?</p>
      <Button onClick={handleInitDefaults} disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create Default Categories'}
      </Button>
    </div>
  );
}
```

### 10. Category Badge Component

Display a category with its icon and color inline:

```tsx
import { getIconComponent } from '@/components/ui/icon-picker';

function CategoryBadge({ category }) {
  const IconComponent = getIconComponent(category.icon);

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
      style={{
        backgroundColor: category.color + '20',
        color: category.color
      }}
    >
      {IconComponent && <IconComponent className="h-4 w-4" />}
      <span>{category.name}</span>
    </div>
  );
}

// Usage
<CategoryBadge category={category} />
```

### 11. Handling Loading States

Show loading indicators while fetching categories:

```tsx
import { CategoryList } from '@/components/categories';

function CategoriesWithLoading({ tripId }) {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadCategories = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getCategoriesWithStats(tripId);
      setCategories(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading categories...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <CategoryList
      categories={categories}
      tripId={tripId}
      onCategoryUpdated={loadCategories}
      showStats={true}
    />
  );
}
```

### 12. Custom Icon Rendering

Render category icons in different contexts:

```tsx
import { getIconComponent } from '@/components/ui/icon-picker';

function ExpenseItem({ expense }) {
  const IconComponent = getIconComponent(expense.category?.icon);

  return (
    <div className="flex items-center gap-3">
      {/* Category icon with color background */}
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: expense.category?.color + '20' }}
      >
        {IconComponent && (
          <IconComponent
            className="h-5 w-5"
            style={{ color: expense.category?.color }}
          />
        )}
      </div>

      {/* Expense details */}
      <div>
        <p className="font-medium">{expense.title}</p>
        <p className="text-sm text-gray-600">{expense.category?.name}</p>
      </div>

      {/* Amount */}
      <p className="ml-auto font-bold">
        ${expense.amount.toFixed(2)}
      </p>
    </div>
  );
}
```

## Common Patterns

### Auto-refresh on Tab Switch

```tsx
function TripTabs({ tripId }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (activeTab === 'categories') {
      loadCategories();
    }
  }, [activeTab]);

  // ...
}
```

### Optimistic Updates

```tsx
async function handleDeleteCategory(categoryId) {
  // Optimistically remove from UI
  setCategories(prev => prev.filter(c => c.id !== categoryId));

  try {
    await deleteCategory(tripId, categoryId);
  } catch (error) {
    // Revert on error
    loadCategories();
    alert('Failed to delete category');
  }
}
```

### Conditional Rendering

```tsx
function CategorySection({ trip, categories }) {
  // Only show if trip has a budget
  if (!trip.total_budget) {
    return (
      <div className="text-gray-500 text-center p-8">
        <p>Set a trip budget to enable category management</p>
      </div>
    );
  }

  return (
    <BudgetAllocation
      categories={categories}
      tripCurrency={trip.currency_code}
      totalBudget={trip.total_budget}
    />
  );
}
```

## Error Handling Examples

### Form Validation Errors

The CategoryForm component handles validation automatically, but you can catch API errors:

```tsx
<CategoryForm
  tripId={tripId}
  onSuccess={() => {
    console.log('Category created successfully');
    loadCategories();
  }}
  onCancel={() => {
    console.log('User cancelled');
  }}
/>
```

### Network Errors

```tsx
const loadCategories = async () => {
  try {
    const data = await getCategoriesWithStats(tripId);
    setCategories(data);
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Trip not found');
    } else if (error.response?.status === 401) {
      console.error('Unauthorized');
      // Redirect to login
    } else {
      console.error('Failed to load categories:', error);
    }
  }
};
```

## Performance Tips

1. **Memoize callbacks** to prevent unnecessary re-renders:
```tsx
const handleCategoryUpdated = useCallback(() => {
  loadCategories(tripId);
}, [tripId]);
```

2. **Use keys properly** when rendering lists
3. **Debounce search** in icon picker (already implemented)
4. **Lazy load** category stats only when needed

## Accessibility

All components are built with accessibility in mind:
- Proper ARIA labels
- Keyboard navigation support
- Focus management in dialogs
- Color contrast compliance
- Screen reader friendly

## Browser Compatibility

Components work on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)
