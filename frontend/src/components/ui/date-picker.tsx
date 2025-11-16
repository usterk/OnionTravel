import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from './button';
import 'react-day-picker/style.css';
import './date-picker.css';

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
  const calendarRef = useRef<HTMLDivElement>(null);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);

  // Update button position when opening
  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      setButtonRect(containerRef.current.getBoundingClientRect());
    }
    setIsOpen(!isOpen);
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        calendarRef.current &&
        !calendarRef.current.contains(target)
      ) {
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

  const calendarContent = isOpen && (
    <>
      {/* Backdrop - tylko na mobilce */}
      <div
        className="fixed inset-0 bg-black/30 z-[100] sm:hidden"
        onClick={() => setIsOpen(false)}
      />

      {/* Calendar */}
      <div
        ref={calendarRef}
        className="fixed bottom-0 inset-x-4 sm:inset-x-auto sm:bottom-auto z-[110] bg-white rounded-t-2xl sm:rounded-md border-t sm:border p-4 sm:p-3 shadow-2xl sm:shadow-lg animate-in slide-in-from-bottom sm:slide-in-from-top duration-200 max-w-md mx-auto sm:mx-0 sm:max-w-none"
        style={
          buttonRect
            ? {
                // Desktop positioning
                left: window.innerWidth >= 640 ? `${buttonRect.left}px` : undefined,
                top: window.innerWidth >= 640 ? `${buttonRect.bottom + 8}px` : undefined,
              }
            : {}
        }
      >
          <DayPicker
            mode="single"
            selected={value}
            onSelect={handleSelect}
            disabled={(date) => {
              // Normalize to start of day for accurate comparison
              const checkDate = new Date(date);
              checkDate.setHours(0, 0, 0, 0);

              if (min) {
                const minDate = new Date(min);
                minDate.setHours(0, 0, 0, 0);
                if (checkDate < minDate) return true;
              }

              if (max) {
                const maxDate = new Date(max);
                maxDate.setHours(0, 0, 0, 0);
                if (checkDate > maxDate) return true;
              }

              return false;
            }}
            defaultMonth={value}
            className="rdp-custom w-full"
          />
          {(onStartClick || onTodayClick || onEndClick) && (
            <div className="mt-2 pt-2 border-t flex gap-2">
              {onStartClick && (
                <Button
                  type="button"
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
                  type="button"
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
                  type="button"
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
    </>
  );

  return (
    <>
      <div className="relative inline-block" ref={containerRef}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="h-8 font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {format(value, 'MMM d, yyyy')}
        </Button>
      </div>
      {isOpen && createPortal(calendarContent, document.body)}
    </>
  );
}
