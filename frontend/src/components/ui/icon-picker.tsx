import * as React from 'react';
import {
  Home,
  Plane,
  Car,
  Bus,
  Train,
  Ship,
  UtensilsCrossed,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Camera,
  Music,
  Gamepad2,
  Heart,
  Stethoscope,
  Pill,
  Dumbbell,
  Shirt,
  Gift,
  Briefcase,
  Wallet,
  CreditCard,
  DollarSign,
  Package,
  MapPin,
  Map,
  Compass,
  Mountain,
  Palmtree,
  Sparkles,
  Star,
  Bookmark,
  Tag,
  Utensils,
  HeartPulse,
  MoreHorizontal,
  Leaf,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
}

// Map of icon names to their components (PascalCase)
export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Home,
  Plane,
  Car,
  Bus,
  Train,
  Ship,
  UtensilsCrossed,
  Utensils,
  Coffee,
  ShoppingBag,
  ShoppingCart,
  Ticket,
  Camera,
  Music,
  Gamepad2,
  Heart,
  HeartPulse,
  Stethoscope,
  Pill,
  Dumbbell,
  Shirt,
  Gift,
  Briefcase,
  Wallet,
  CreditCard,
  DollarSign,
  Package,
  MapPin,
  Map,
  Compass,
  Mountain,
  Palmtree,
  Sparkles,
  Star,
  Bookmark,
  Tag,
  MoreHorizontal,
  Leaf,
  Wifi,
};

// Map kebab-case names (from backend) to PascalCase (Lucide React)
const KEBAB_TO_PASCAL: Record<string, string> = {
  'home': 'Home',
  'car': 'Car',
  'bus': 'Bus',
  'train': 'Train',
  'plane': 'Plane',
  'ship': 'Ship',
  'utensils': 'Utensils',
  'utensils-crossed': 'UtensilsCrossed',
  'coffee': 'Coffee',
  'shopping-bag': 'ShoppingBag',
  'shopping-cart': 'ShoppingCart',
  'ticket': 'Ticket',
  'camera': 'Camera',
  'music': 'Music',
  'gamepad': 'Gamepad2',
  'heart': 'Heart',
  'heart-pulse': 'HeartPulse',
  'stethoscope': 'Stethoscope',
  'pill': 'Pill',
  'dumbbell': 'Dumbbell',
  'shirt': 'Shirt',
  'gift': 'Gift',
  'briefcase': 'Briefcase',
  'wallet': 'Wallet',
  'credit-card': 'CreditCard',
  'dollar-sign': 'DollarSign',
  'package': 'Package',
  'map-pin': 'MapPin',
  'map': 'Map',
  'compass': 'Compass',
  'mountain': 'Mountain',
  'palmtree': 'Palmtree',
  'sparkles': 'Sparkles',
  'star': 'Star',
  'bookmark': 'Bookmark',
  'tag': 'Tag',
  'more-horizontal': 'MoreHorizontal',
  'leaf': 'Leaf',
  'wifi': 'Wifi',
};

// Reverse map: PascalCase to kebab-case (for saving to backend)
const PASCAL_TO_KEBAB: Record<string, string> = Object.entries(KEBAB_TO_PASCAL).reduce(
  (acc, [kebab, pascal]) => {
    acc[pascal] = kebab;
    return acc;
  },
  {} as Record<string, string>
);

// Helper to convert PascalCase to kebab-case for backend
export const toKebabCase = (iconName: string): string => {
  return PASCAL_TO_KEBAB[iconName] || iconName.toLowerCase();
};

// Get icon component by name (supports both kebab-case and PascalCase)
export const getIconComponent = (iconName?: string): LucideIcon | null => {
  if (!iconName) return null;

  // Try direct lookup first (PascalCase)
  if (ICON_MAP[iconName]) {
    return ICON_MAP[iconName] as LucideIcon;
  }

  // Try kebab-case to PascalCase conversion
  const pascalName = KEBAB_TO_PASCAL[iconName.toLowerCase()];
  if (pascalName && ICON_MAP[pascalName]) {
    return ICON_MAP[pascalName] as LucideIcon;
  }

  return null;
};

const IconPicker = React.forwardRef<HTMLDivElement, IconPickerProps>(
  ({ value, onChange, className }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    // Normalize the current value to PascalCase for comparison
    const normalizedValue = React.useMemo(() => {
      if (!value) return null;
      // If value is in kebab-case, convert to PascalCase
      const pascalName = KEBAB_TO_PASCAL[value.toLowerCase()];
      return pascalName || value;
    }, [value]);

    const filteredIcons = React.useMemo(() => {
      if (!searchQuery) return Object.keys(ICON_MAP);
      return Object.keys(ICON_MAP).filter((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery]);

    const isSelected = (iconName: string) => {
      return iconName === normalizedValue;
    };

    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        <Input
          type="text"
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2 max-h-64 overflow-y-auto p-1">
          {filteredIcons.map((iconName) => {
            const IconComponent = ICON_MAP[iconName];
            const selected = isSelected(iconName);
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={cn(
                  'relative flex items-center justify-center h-10 w-10 rounded-md border-2 transition-all hover:scale-110 hover:border-gray-400',
                  selected
                    ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                    : 'border-gray-200 bg-white'
                )}
                title={iconName}
              >
                <IconComponent
                  className={cn(
                    'h-5 w-5',
                    selected ? 'text-primary' : 'text-gray-600'
                  )}
                />
              </button>
            );
          })}
        </div>
        {filteredIcons.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">
            No icons found for "{searchQuery}"
          </p>
        )}
        {value && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Selected:</span>
            <span className="font-medium">{normalizedValue || value}</span>
          </div>
        )}
      </div>
    );
  }
);
IconPicker.displayName = 'IconPicker';

export { IconPicker };
