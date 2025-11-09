# Category Management Components

This directory contains all the frontend components for managing budget categories in OnionTravel.

## Components Overview

### 1. ColorPicker (`/components/ui/color-picker.tsx`)

A color selection component that provides preset colors and custom color input.

**Features:**
- 20 preset colors matching common budget category themes
- Custom color picker using native HTML5 color input
- Visual feedback showing selected color with checkmark
- Displays hex color code

**Usage:**
```tsx
import { ColorPicker } from '@/components/ui/color-picker';

function MyComponent() {
  const [color, setColor] = useState('#ef4444');

  return (
    <ColorPicker
      value={color}
      onChange={setColor}
    />
  );
}
```

**Props:**
- `value: string` - Current color hex value (e.g., '#ef4444')
- `onChange: (color: string) => void` - Callback when color changes
- `className?: string` - Optional additional CSS classes

---

### 2. IconPicker (`/components/ui/icon-picker.tsx`)

An icon selection component featuring commonly used Lucide React icons.

**Features:**
- 33 pre-selected icons relevant to budget categories
- Search/filter functionality
- Visual grid layout with hover effects
- Shows selected icon name
- Includes helper function to get icon component by name

**Usage:**
```tsx
import { IconPicker, getIconComponent } from '@/components/ui/icon-picker';

function MyComponent() {
  const [iconName, setIconName] = useState('Plane');
  const IconComponent = getIconComponent(iconName);

  return (
    <div>
      <IconPicker
        value={iconName}
        onChange={setIconName}
      />
      {IconComponent && <IconComponent className="h-5 w-5" />}
    </div>
  );
}
```

**Props:**
- `value?: string` - Current icon name (e.g., 'Plane', 'Home')
- `onChange: (iconName: string) => void` - Callback when icon changes
- `className?: string` - Optional additional CSS classes

**Helper Functions:**
- `getIconComponent(iconName?: string): LucideIcon | null` - Returns the icon component for the given name
- `ICON_MAP: Record<string, LucideIcon>` - Object mapping icon names to components

---

### 3. CategoryList (`/components/categories/CategoryList.tsx`)

Displays and manages the list of categories for a trip.

**Features:**
- Shows all categories with icons, colors, and budget percentages
- Optional statistics display (spent, remaining, percentage used)
- Edit and delete actions for each category
- Create new category button
- Modal dialogs for create, edit, and delete operations
- Visual indicators for default categories
- Color-coded spending status (green/amber/red)

**Usage:**
```tsx
import { CategoryList } from '@/components/categories';

function TripPage({ tripId }) {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);

  const loadCategories = async () => {
    const data = await getCategoriesWithStats(tripId);
    setCategories(data);
  };

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

**Props:**
- `categories: CategoryWithStats[] | Category[]` - Array of categories
- `tripId: number` - The trip ID
- `onCategoryUpdated: () => void` - Callback when categories are modified
- `showStats?: boolean` - Whether to show spending statistics (default: false)

---

### 4. CategoryForm (`/components/categories/CategoryForm.tsx`)

Form component for creating and editing categories.

**Features:**
- Name input with validation
- Color selection using ColorPicker
- Icon selection using IconPicker
- Budget percentage input with validation
- Real-time budget allocation calculation
- Warning messages when approaching or exceeding 100% allocation
- Shows available budget percentage
- Error handling and loading states

**Validation:**
- Category name is required
- Budget percentage must be between 0-100
- Total allocation across all categories cannot exceed 100%

**Usage:**
```tsx
import { CategoryForm } from '@/components/categories';

function CreateCategoryDialog({ tripId, onSuccess }) {
  return (
    <CategoryForm
      tripId={tripId}
      onSuccess={onSuccess}
      onCancel={onClose}
    />
  );
}

function EditCategoryDialog({ tripId, category, onSuccess }) {
  return (
    <CategoryForm
      tripId={tripId}
      category={category}
      onSuccess={onSuccess}
      onCancel={onClose}
    />
  );
}
```

**Props:**
- `tripId: number` - The trip ID
- `category?: Category` - Existing category to edit (omit for create)
- `onSuccess: () => void` - Callback on successful save
- `onCancel?: () => void` - Callback when form is cancelled

---

### 5. BudgetAllocation (`/components/categories/BudgetAllocation.tsx`)

Visual representation of budget allocation across categories.

**Features:**
- Overall allocation summary with progress bar
- Color-coded status indicators (green/amber/red)
- Category-by-category breakdown with visual bars
- Shows both budget allocation and actual spending
- Spending progress indicators (TrendingUp/TrendingDown icons)
- Warning messages for over-allocation
- Displays remaining budget per category
- Optional total budget spending summary

**Usage:**
```tsx
import { BudgetAllocation } from '@/components/categories';

function TripBudget({ tripId, trip }) {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);

  return (
    <BudgetAllocation
      categories={categories}
      tripCurrency={trip.currency_code}
      totalBudget={trip.total_budget}
    />
  );
}
```

**Props:**
- `categories: CategoryWithStats[]` - Array of categories with statistics
- `tripCurrency?: string` - Currency code (default: 'USD')
- `totalBudget?: number` - Total trip budget (optional, enables spending summary)

---

## Integration Example

Here's how the components are integrated into the TripDetail page:

```tsx
import { CategoryList, BudgetAllocation } from '@/components/categories';
import { getCategoriesWithStats } from '@/lib/categories-api';

export default function TripDetail() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const currentTrip = // ... your trip data

  const loadCategories = async (tripId: number) => {
    try {
      const categoriesData = await getCategoriesWithStats(tripId);
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Budget Visualization */}
      <BudgetAllocation
        categories={categories}
        tripCurrency={currentTrip.currency_code}
        totalBudget={currentTrip.total_budget}
      />

      {/* Category Management */}
      <CategoryList
        categories={categories}
        tripId={currentTrip.id}
        onCategoryUpdated={() => loadCategories(currentTrip.id)}
        showStats={true}
      />
    </div>
  );
}
```

---

## API Integration

All components use the API functions from `/lib/categories-api.ts`:

```typescript
// Get categories with statistics
const categories = await getCategoriesWithStats(tripId);

// Create category
const newCategory = await createCategory(tripId, {
  name: 'Transportation',
  color: '#3b82f6',
  icon: 'Car',
  budget_percentage: 20
});

// Update category
const updated = await updateCategory(tripId, categoryId, {
  name: 'Food & Dining',
  budget_percentage: 25
});

// Delete category
await deleteCategory(tripId, categoryId);

// Initialize default categories
const defaultCategories = await initializeDefaultCategories(tripId);
```

---

## Type Definitions

From `/types/models.ts`:

```typescript
interface Category {
  id: number;
  trip_id: number;
  name: string;
  color: string;
  icon?: string;
  budget_percentage?: number;
  is_default: boolean;
  created_at: string;
}

interface CategoryWithStats extends Category {
  total_spent: number;
  allocated_budget: number;
  remaining_budget: number;
  percentage_used: number;
}
```

---

## Styling

All components follow the existing OnionTravel design patterns:

- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Shadcn/ui patterns** for consistent UI
- Responsive design with mobile support
- Accessible color contrasts
- Loading and error states

---

## Testing Recommendations

When testing these components, ensure:

1. **Color Picker:**
   - Preset color selection works
   - Custom color input updates correctly
   - Color value is displayed as hex

2. **Icon Picker:**
   - Search/filter functionality works
   - All icons are displayed
   - Selected icon is highlighted
   - Icon component can be retrieved

3. **Category List:**
   - Categories display correctly with icons and colors
   - Edit/delete dialogs open and close
   - Statistics are shown when enabled
   - Create category flow works

4. **Category Form:**
   - All validation rules work correctly
   - Budget allocation warnings appear
   - Cannot exceed 100% allocation
   - Form submits and handles errors

5. **Budget Allocation:**
   - Visual bars render correctly
   - Color-coding matches status
   - Calculations are accurate
   - Over-allocation warnings appear

---

## Future Enhancements

Potential improvements for these components:

1. **Drag-and-drop reordering** of categories
2. **Category templates** for common trip types
3. **Pie chart visualization** as alternative to progress bars
4. **Export/import** category configurations
5. **Category groups** or subcategories
6. **Historical spending trends** per category
7. **Budget recommendations** based on trip type and location

---

## Support

For issues or questions about these components, refer to:
- Main project README: `/CLAUDE.md`
- API documentation: Backend Swagger docs at `http://localhost:8001/docs`
- Component patterns: Other UI components in `/components/ui/`
