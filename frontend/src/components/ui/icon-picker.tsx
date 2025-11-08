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
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from './input';

export interface IconPickerProps {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
}

// Map of icon names to their components
export const ICON_MAP: Record<string, LucideIcon> = {
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
};

// Get icon component by name
export const getIconComponent = (iconName?: string): LucideIcon | null => {
  if (!iconName) return null;
  return ICON_MAP[iconName] || null;
};

const IconPicker = React.forwardRef<HTMLDivElement, IconPickerProps>(
  ({ value, onChange, className }, ref) => {
    const [searchQuery, setSearchQuery] = React.useState('');

    const filteredIcons = React.useMemo(() => {
      if (!searchQuery) return Object.keys(ICON_MAP);
      return Object.keys(ICON_MAP).filter((name) =>
        name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery]);

    return (
      <div ref={ref} className={cn('space-y-3', className)}>
        <Input
          type="text"
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full"
        />
        <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
          {filteredIcons.map((iconName) => {
            const IconComponent = ICON_MAP[iconName];
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => onChange(iconName)}
                className={cn(
                  'relative flex items-center justify-center h-10 w-10 rounded-md border-2 transition-all hover:scale-110 hover:border-gray-400',
                  value === iconName
                    ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                    : 'border-gray-200 bg-white'
                )}
                title={iconName}
              >
                <IconComponent
                  className={cn(
                    'h-5 w-5',
                    value === iconName ? 'text-primary' : 'text-gray-600'
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
            <span className="font-medium">{value}</span>
          </div>
        )}
      </div>
    );
  }
);
IconPicker.displayName = 'IconPicker';

export { IconPicker };
