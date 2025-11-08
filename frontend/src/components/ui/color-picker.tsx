import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

const PRESET_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Lime', value: '#84cc16' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Fuchsia', value: '#d946ef' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Slate', value: '#64748b' },
  { name: 'Gray', value: '#6b7280' },
  { name: 'Zinc', value: '#71717a' },
];

const ColorPicker = React.forwardRef<HTMLDivElement, ColorPickerProps>(
  ({ value, onChange, className }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <div className="grid grid-cols-10 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => onChange(color.value)}
              className={cn(
                'relative h-8 w-8 rounded-md border-2 transition-all hover:scale-110',
                value === color.value
                  ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2'
                  : 'border-gray-200 hover:border-gray-300'
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            >
              {value === color.value && (
                <Check className="h-4 w-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 drop-shadow" />
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="custom-color" className="text-sm text-gray-600">
            Custom:
          </label>
          <input
            id="custom-color"
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-16 rounded border border-gray-200 cursor-pointer"
          />
          <span className="text-sm text-gray-500 font-mono">{value}</span>
        </div>
      </div>
    );
  }
);
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker, PRESET_COLORS };
