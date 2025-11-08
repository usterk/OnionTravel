# Category Components - Quick Start Guide

## 30-Second Setup

```tsx
import { CategoryList, BudgetAllocation } from '@/components/categories';
import { getCategoriesWithStats } from '@/lib/categories-api';

function MyTripPage({ tripId }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategoriesWithStats(tripId).then(setCategories);
  }, [tripId]);

  return (
    <>
      <BudgetAllocation categories={categories} tripCurrency="USD" />
      <CategoryList
        categories={categories}
        tripId={tripId}
        onCategoryUpdated={() => getCategoriesWithStats(tripId).then(setCategories)}
        showStats
      />
    </>
  );
}
```

## Component Imports

```tsx
// Category components
import { CategoryList, CategoryForm, BudgetAllocation } from '@/components/categories';

// UI components
import { ColorPicker } from '@/components/ui/color-picker';
import { IconPicker, getIconComponent } from '@/components/ui/icon-picker';

// API functions
import {
  getCategories,
  getCategoriesWithStats,
  createCategory,
  updateCategory,
  deleteCategory,
  initializeDefaultCategories
} from '@/lib/categories-api';

// Types
import type { Category, CategoryWithStats } from '@/types/models';
import type { CategoryCreate, CategoryUpdate } from '@/lib/categories-api';
```

## Common Tasks

### Display Categories
```tsx
<CategoryList
  categories={categories}
  tripId={tripId}
  onCategoryUpdated={loadCategories}
  showStats={true}
/>
```

### Show Budget Visualization
```tsx
<BudgetAllocation
  categories={categories}
  tripCurrency="USD"
  totalBudget={5000}
/>
```

### Create Category
```tsx
<CategoryForm
  tripId={tripId}
  onSuccess={handleSuccess}
  onCancel={handleCancel}
/>
```

### Edit Category
```tsx
<CategoryForm
  tripId={tripId}
  category={existingCategory}
  onSuccess={handleSuccess}
/>
```

### Use Color Picker
```tsx
<ColorPicker value={color} onChange={setColor} />
```

### Use Icon Picker
```tsx
<IconPicker value={iconName} onChange={setIconName} />
```

### Display Category Icon
```tsx
const IconComponent = getIconComponent(category.icon);
{IconComponent && <IconComponent className="h-5 w-5" />}
```

## Props Reference

### CategoryList
- `categories` - Array of categories
- `tripId` - Trip ID (number)
- `onCategoryUpdated` - Callback function
- `showStats?` - Show statistics (boolean, default: false)

### BudgetAllocation
- `categories` - Array of CategoryWithStats
- `tripCurrency?` - Currency code (string, default: 'USD')
- `totalBudget?` - Total budget (number, optional)

### CategoryForm
- `tripId` - Trip ID (number)
- `category?` - Category to edit (optional)
- `onSuccess` - Success callback
- `onCancel?` - Cancel callback (optional)

### ColorPicker
- `value` - Current color (string, hex)
- `onChange` - Change callback
- `className?` - CSS classes (optional)

### IconPicker
- `value?` - Current icon name (string)
- `onChange` - Change callback
- `className?` - CSS classes (optional)

## API Quick Reference

```tsx
// Get categories
const categories = await getCategories(tripId);

// Get with stats
const stats = await getCategoriesWithStats(tripId);

// Create
await createCategory(tripId, {
  name: 'Food',
  color: '#ef4444',
  icon: 'UtensilsCrossed',
  budget_percentage: 25
});

// Update
await updateCategory(tripId, categoryId, { name: 'New Name' });

// Delete
await deleteCategory(tripId, categoryId);

// Initialize defaults
await initializeDefaultCategories(tripId);
```

## Validation Rules

- Category name: Required
- Budget percentage: 0-100
- Total allocation: ≤ 100% across all categories
- Color: Valid hex color (enforced by picker)
- Icon: Must be valid Lucide icon name

## Available Icons

Common category icons:
- Transportation: `Plane`, `Car`, `Bus`, `Train`, `Ship`
- Accommodation: `Home`
- Food: `UtensilsCrossed`, `Coffee`
- Shopping: `ShoppingBag`, `ShoppingCart`
- Entertainment: `Ticket`, `Camera`, `Music`, `Gamepad2`
- Health: `Heart`, `Stethoscope`, `Pill`
- Activities: `Dumbbell`, `Mountain`, `Palmtree`
- Money: `Wallet`, `CreditCard`, `DollarSign`
- General: `Tag`, `Bookmark`, `Star`, `Sparkles`

[See full list in icon-picker.tsx]

## Color Palette

Preset colors available:
- Red (#ef4444), Orange (#f97316), Amber (#f59e0b)
- Yellow (#eab308), Lime (#84cc16), Green (#22c55e)
- Emerald (#10b981), Teal (#14b8a6), Cyan (#06b6d4)
- Sky (#0ea5e9), Blue (#3b82f6), Indigo (#6366f1)
- Violet (#8b5cf6), Purple (#a855f7), Fuchsia (#d946ef)
- Pink (#ec4899), Rose (#f43f5e)
- Slate (#64748b), Gray (#6b7280), Zinc (#71717a)

## Error Handling

Components handle errors automatically, but you can catch them:

```tsx
const loadCategories = async () => {
  try {
    const data = await getCategoriesWithStats(tripId);
    setCategories(data);
  } catch (error) {
    console.error('Failed to load categories:', error);
    // Show user-friendly error message
  }
};
```

## Common Patterns

### With Dialog
```tsx
const [showForm, setShowForm] = useState(false);

<Dialog open={showForm} onOpenChange={setShowForm}>
  <DialogContent>
    <DialogBody>
      <CategoryForm
        tripId={tripId}
        onSuccess={() => {
          setShowForm(false);
          loadCategories();
        }}
      />
    </DialogBody>
  </DialogContent>
</Dialog>
```

### With Tabs
```tsx
<Tabs defaultValue="categories">
  <TabsList>
    <TabsTrigger value="categories">Categories</TabsTrigger>
  </TabsList>
  <TabsContent value="categories">
    <CategoryList {...props} />
  </TabsContent>
</Tabs>
```

### Loading State
```tsx
{isLoading ? (
  <div>Loading categories...</div>
) : (
  <CategoryList categories={categories} {...props} />
)}
```

## Troubleshooting

**Categories not loading?**
- Check API base URL in .env
- Verify backend is running on port 8001
- Check browser console for errors

**Validation errors?**
- Ensure total allocation ≤ 100%
- Check category name is not empty
- Verify budget percentage is 0-100

**Icons not showing?**
- Check icon name matches ICON_MAP keys
- Use `getIconComponent()` to retrieve icon
- Icon names are case-sensitive

**Colors not applying?**
- Ensure color is valid hex format
- Use ColorPicker for guaranteed valid colors
- Check style attribute syntax

## More Help

- **Full Documentation**: `README.md`
- **Examples**: `EXAMPLES.md`
- **Project Guide**: `/CLAUDE.md`
- **API Docs**: http://localhost:8001/docs

## File Locations

```
frontend/src/
├── components/
│   ├── ui/
│   │   ├── color-picker.tsx
│   │   └── icon-picker.tsx
│   └── categories/
│       ├── CategoryList.tsx
│       ├── CategoryForm.tsx
│       ├── BudgetAllocation.tsx
│       ├── index.ts
│       ├── README.md
│       ├── EXAMPLES.md
│       └── QUICK_START.md (this file)
├── lib/
│   └── categories-api.ts
└── types/
    └── models.ts
```
