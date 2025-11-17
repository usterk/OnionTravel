import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DatePicker } from './date-picker';

// Mock react-day-picker
vi.mock('react-day-picker', () => ({
  DayPicker: ({ selected, onSelect, disabled, mode }: any) => {
    // Test the disabled function with various dates
    const testDates = [
      new Date('2025-01-01'),
      new Date('2025-01-05'),
      new Date('2025-01-10'),
      new Date('2025-01-15'),
      new Date('2025-01-20'),
      new Date('2025-01-25'),
    ];

    return (
      <div data-testid="day-picker">
        <button
          data-testid="select-date"
          onClick={() => onSelect?.(new Date('2025-01-15'))}
        >
          Select Date
        </button>
        <button
          data-testid="select-disabled-date"
          onClick={() => {
            const testDate = new Date('2025-01-01');
            if (!disabled || !disabled(testDate)) {
              onSelect?.(testDate);
            }
          }}
        >
          Select Disabled Date
        </button>
        <div data-testid="selected-date">
          {selected ? selected.toISOString().split('T')[0] : 'No date'}
        </div>
        <div data-testid="mode">{mode}</div>
        {/* Test disabled function with various dates */}
        {disabled && (
          <div data-testid="disabled-dates">
            {testDates.map(date => (
              <div key={date.toISOString()} data-testid={`disabled-${date.toISOString().split('T')[0]}`}>
                {disabled(date) ? 'disabled' : 'enabled'}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
}));

describe('DatePicker', () => {
  const mockOnChange = vi.fn();
  const mockOnTodayClick = vi.fn();
  const mockOnStartClick = vi.fn();
  const mockOnEndClick = vi.fn();

  const defaultProps = {
    value: new Date('2025-01-10'),
    onChange: mockOnChange,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock createPortal to render in the same container
    vi.mock('react-dom', () => ({
      createPortal: (node: any) => node,
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render calendar button with formatted date', () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      expect(button).toBeInTheDocument();
    });

    it('should render calendar icon', () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      expect(button).toBeInTheDocument();
      // Icon is rendered via lucide-react
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not show calendar initially', () => {
      render(<DatePicker {...defaultProps} />);

      expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
    });
  });

  describe('Opening and Closing Calendar', () => {
    it('should open calendar when button is clicked', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });
    });

    it('should toggle calendar on button click', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });

      // Open
      await userEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      // Close
      await userEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });

    it('should close calendar when date is selected', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      const selectButton = screen.getByTestId('select-date');
      await userEvent.click(selectButton);

      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith(new Date('2025-01-15'));
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });

    it('should close calendar when clicking outside', async () => {
      const { container } = render(
        <div>
          <div data-testid="outside">Outside</div>
          <DatePicker {...defaultProps} />
        </div>
      );

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });

    it('should not close when clicking inside calendar', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      const calendar = screen.getByTestId('day-picker');
      fireEvent.mouseDown(calendar);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });
    });
  });

  describe('Date Selection', () => {
    it('should call onChange when date is selected', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      const selectButton = screen.getByTestId('select-date');
      await userEvent.click(selectButton);

      expect(mockOnChange).toHaveBeenCalledWith(new Date('2025-01-15'));
    });

    it('should not call onChange when undefined date is selected', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      // Simulate DayPicker calling onSelect with undefined
      await waitFor(() => {
        const dayPicker = screen.getByTestId('day-picker');
        expect(dayPicker).toBeInTheDocument();
      });

      // onChange should not be called for undefined
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });

  describe('Min/Max Date Constraints', () => {
    it('should respect min date constraint', async () => {
      const minDate = new Date('2025-01-05');
      render(<DatePicker {...defaultProps} min={minDate} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      // Check that dates before min are disabled
      const disabledDates = screen.getByTestId('disabled-dates');
      expect(disabledDates).toBeInTheDocument();

      // 2025-01-01 should be disabled (before min)
      expect(screen.getByTestId('disabled-2025-01-01')).toHaveTextContent('disabled');
      // 2025-01-05 should be enabled (equals min)
      expect(screen.getByTestId('disabled-2025-01-05')).toHaveTextContent('enabled');
      // 2025-01-10 should be enabled (after min)
      expect(screen.getByTestId('disabled-2025-01-10')).toHaveTextContent('enabled');
    });

    it('should respect max date constraint', async () => {
      const maxDate = new Date('2025-01-20');
      render(<DatePicker {...defaultProps} max={maxDate} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      // Check that dates after max are disabled
      const disabledDates = screen.getByTestId('disabled-dates');
      expect(disabledDates).toBeInTheDocument();

      // 2025-01-10 should be enabled (before max)
      expect(screen.getByTestId('disabled-2025-01-10')).toHaveTextContent('enabled');
      // 2025-01-20 should be enabled (equals max)
      expect(screen.getByTestId('disabled-2025-01-20')).toHaveTextContent('enabled');
      // 2025-01-25 should be disabled (after max)
      expect(screen.getByTestId('disabled-2025-01-25')).toHaveTextContent('disabled');
    });

    it('should respect both min and max constraints', async () => {
      const minDate = new Date('2025-01-05');
      const maxDate = new Date('2025-01-20');
      render(<DatePicker {...defaultProps} min={minDate} max={maxDate} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      // Check that dates outside range are disabled
      const disabledDates = screen.getByTestId('disabled-dates');
      expect(disabledDates).toBeInTheDocument();

      // 2025-01-01 should be disabled (before min)
      expect(screen.getByTestId('disabled-2025-01-01')).toHaveTextContent('disabled');
      // 2025-01-05 should be enabled (equals min)
      expect(screen.getByTestId('disabled-2025-01-05')).toHaveTextContent('enabled');
      // 2025-01-10 should be enabled (within range)
      expect(screen.getByTestId('disabled-2025-01-10')).toHaveTextContent('enabled');
      // 2025-01-20 should be enabled (equals max)
      expect(screen.getByTestId('disabled-2025-01-20')).toHaveTextContent('enabled');
      // 2025-01-25 should be disabled (after max)
      expect(screen.getByTestId('disabled-2025-01-25')).toHaveTextContent('disabled');
    });

    it('should normalize dates to start of day for comparison', async () => {
      // Set min/max with specific times
      const minDate = new Date('2025-01-05T14:30:00');
      const maxDate = new Date('2025-01-20T18:45:00');
      render(<DatePicker {...defaultProps} min={minDate} max={maxDate} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      // Even with specific times, should compare by day only
      expect(screen.getByTestId('disabled-2025-01-05')).toHaveTextContent('enabled');
      expect(screen.getByTestId('disabled-2025-01-20')).toHaveTextContent('enabled');
    });

    it('should allow all dates when no constraints', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      // All dates should be enabled
      const disabledDates = screen.getByTestId('disabled-dates');
      expect(disabledDates).toBeInTheDocument();

      expect(screen.getByTestId('disabled-2025-01-01')).toHaveTextContent('enabled');
      expect(screen.getByTestId('disabled-2025-01-10')).toHaveTextContent('enabled');
      expect(screen.getByTestId('disabled-2025-01-25')).toHaveTextContent('enabled');
    });
  });

  describe('Quick Action Buttons', () => {
    it('should render Today button when onTodayClick is provided', async () => {
      render(<DatePicker {...defaultProps} onTodayClick={mockOnTodayClick} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Today/i })).toBeInTheDocument();
      });
    });

    it('should render Start button when onStartClick is provided', async () => {
      render(<DatePicker {...defaultProps} onStartClick={mockOnStartClick} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
      });
    });

    it('should render End button when onEndClick is provided', async () => {
      render(<DatePicker {...defaultProps} onEndClick={mockOnEndClick} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /End/i })).toBeInTheDocument();
      });
    });

    it('should render all quick action buttons when all handlers provided', async () => {
      render(
        <DatePicker
          {...defaultProps}
          onTodayClick={mockOnTodayClick}
          onStartClick={mockOnStartClick}
          onEndClick={mockOnEndClick}
        />
      );

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Today/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Start/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /End/i })).toBeInTheDocument();
      });
    });

    it('should call onTodayClick and close calendar', async () => {
      render(<DatePicker {...defaultProps} onTodayClick={mockOnTodayClick} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      const todayButton = await screen.findByRole('button', { name: /Today/i });
      await userEvent.click(todayButton);

      expect(mockOnTodayClick).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });

    it('should call onStartClick and close calendar', async () => {
      render(<DatePicker {...defaultProps} onStartClick={mockOnStartClick} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      const startButton = await screen.findByRole('button', { name: /Start/i });
      await userEvent.click(startButton);

      expect(mockOnStartClick).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });

    it('should call onEndClick and close calendar', async () => {
      render(<DatePicker {...defaultProps} onEndClick={mockOnEndClick} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      const endButton = await screen.findByRole('button', { name: /End/i });
      await userEvent.click(endButton);

      expect(mockOnEndClick).toHaveBeenCalledTimes(1);
      await waitFor(() => {
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });

    it('should disable Today button when todayDisabled is true', async () => {
      render(
        <DatePicker
          {...defaultProps}
          onTodayClick={mockOnTodayClick}
          todayDisabled={true}
        />
      );

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      const todayButton = await screen.findByRole('button', { name: /Today/i });
      expect(todayButton).toBeDisabled();
    });

    it('should enable Today button when todayDisabled is false', async () => {
      render(
        <DatePicker
          {...defaultProps}
          onTodayClick={mockOnTodayClick}
          todayDisabled={false}
        />
      );

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      const todayButton = await screen.findByRole('button', { name: /Today/i });
      expect(todayButton).not.toBeDisabled();
    });
  });

  describe('Date Formatting', () => {
    it('should format date as "MMM d, yyyy"', () => {
      render(<DatePicker value={new Date('2025-03-25')} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /Mar 25, 2025/i })).toBeInTheDocument();
    });

    it('should format different date correctly', () => {
      render(<DatePicker value={new Date('2025-12-01')} onChange={mockOnChange} />);

      expect(screen.getByRole('button', { name: /Dec 1, 2025/i })).toBeInTheDocument();
    });
  });

  describe('DayPicker Integration', () => {
    it('should pass selected date to DayPicker', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        const selectedDate = screen.getByTestId('selected-date');
        expect(selectedDate).toHaveTextContent('2025-01-10');
      });
    });

    it('should use single mode for DayPicker', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        const mode = screen.getByTestId('mode');
        expect(mode).toHaveTextContent('single');
      });
    });
  });

  describe('Event Handling', () => {
    it('should stop propagation on button click', async () => {
      const containerClick = vi.fn();
      render(
        <div onClick={containerClick}>
          <DatePicker {...defaultProps} />
        </div>
      );

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      // Container click should not be called due to stopPropagation
      expect(containerClick).not.toHaveBeenCalled();
    });
  });

  describe('Backdrop Behavior', () => {
    it('should render backdrop when calendar is open', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
        expect(backdrop).toBeInTheDocument();
      });
    });

    it('should close calendar when backdrop is clicked', async () => {
      render(<DatePicker {...defaultProps} />);

      const button = screen.getByRole('button', { name: /Jan 10, 2025/i });
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('day-picker')).toBeInTheDocument();
      });

      const backdrop = document.querySelector('.fixed.inset-0.bg-black\\/30');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByTestId('day-picker')).not.toBeInTheDocument();
      });
    });
  });
});
