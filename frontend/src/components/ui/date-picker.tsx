import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './button';
import 'react-day-picker/style.css';

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  min?: Date;
  max?: Date;
  onTodayClick?: () => void;
  onStartClick?: () => void;
  onEndClick?: () => void;
  todayDisabled?: boolean;
}

export function DatePicker({ value, onChange, min, max, onTodayClick, onStartClick, onEndClick, todayDisabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      onChange(date);
      setIsOpen(false);
    }
  };

  const handleTodayClick = () => {
    if (onTodayClick) {
      onTodayClick();
      setIsOpen(false);
    }
  };

  const handleStartClick = () => {
    if (onStartClick) {
      onStartClick();
      setIsOpen(false);
    }
  };

  const handleEndClick = () => {
    if (onEndClick) {
      onEndClick();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 font-normal"
      >
        <CalendarIcon className="mr-2 h-4 w-4" />
        {format(value, 'MMM d, yyyy')}
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-2 left-1/2 -translate-x-1/2 rounded-md border bg-white p-3 shadow-lg">
          <DayPicker
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={(date) => {
              if (min && date < min) return true;
              if (max && date > max) return true;
              return false;
            }}
            defaultMonth={value}
            className="rdp-custom"
          />
          {(onStartClick || onTodayClick || onEndClick) && (
            <div className="mt-2 pt-2 border-t flex gap-2">
              {onStartClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStartClick}
                  className="flex-1"
                >
                  Start
                </Button>
              )}
              {onTodayClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTodayClick}
                  className="flex-1"
                  disabled={todayDisabled}
                >
                  Today
                </Button>
              )}
              {onEndClick && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEndClick}
                  className="flex-1"
                >
                  End
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
