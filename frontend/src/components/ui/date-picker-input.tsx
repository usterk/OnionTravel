import { DatePicker } from './date-picker';

interface DatePickerInputProps {
  value: string; // YYYY-MM-DD format
  onChange: (value: string) => void; // YYYY-MM-DD format
  min?: string; // YYYY-MM-DD format
  max?: string; // YYYY-MM-DD format
  disabled?: boolean;
  id?: string;
  required?: boolean;
}

/**
 * Wrapper for DatePicker that works with string dates (YYYY-MM-DD format)
 * instead of Date objects. This makes it easier to use in forms.
 */
export function DatePickerInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  id,
  required = false,
}: DatePickerInputProps) {
  // If no value and not required, use today as default for display
  // If required and no value, also use today
  const dateValue = value ? new Date(value + 'T00:00:00') : new Date();
  const minDate = min ? new Date(min + 'T00:00:00') : undefined;
  const maxDate = max ? new Date(max + 'T00:00:00') : undefined;

  // Convert Date to string (YYYY-MM-DD)
  const handleChange = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    onChange(`${year}-${month}-${day}`);
  };

  const handleTodayClick = () => {
    const today = new Date();
    handleChange(today);
  };

  const handleStartClick = minDate ? () => handleChange(minDate) : undefined;
  const handleEndClick = maxDate ? () => handleChange(maxDate) : undefined;

  // Check if today is within range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDisabled =
    (minDate && today < minDate) || (maxDate && today > maxDate) || false;

  return (
    <DatePicker
      value={dateValue}
      onChange={handleChange}
      min={minDate}
      max={maxDate}
      onTodayClick={handleTodayClick}
      onStartClick={handleStartClick}
      onEndClick={handleEndClick}
      todayDisabled={todayDisabled}
    />
  );
}
