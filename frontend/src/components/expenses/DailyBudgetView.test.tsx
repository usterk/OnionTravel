import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyBudgetView } from './DailyBudgetView';
import * as expensesApi from '@/lib/expenses-api';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';

// Mock the expenses API
vi.mock('@/lib/expenses-api', () => ({
  getDailyBudgetStatistics: vi.fn(),
}));

// Mock the icon-picker module
vi.mock('@/components/ui/icon-picker', () => ({
  getIconComponent: () => {
    // Return a mock component that renders a div
    return () => <div data-testid="mock-icon" />;
  },
}));

// Mock react-swipeable
vi.mock('react-swipeable', () => ({
  useSwipeable: () => ({}),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, transition, ...props }: any) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children, mode }: any) => <>{children}</>,
}));

describe('DailyBudgetView', () => {
  const mockTripId = 1;
  const mockCurrencyCode = 'USD';
  const mockTripStartDate = '2025-11-08';
  const mockTripEndDate = '2025-11-15';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createMockStatistics = (overrides?: Partial<DailyBudgetStatistics>): DailyBudgetStatistics => ({
    date: '2025-11-10',
    daily_budget: 100,
    total_spent_today: 50,
    remaining_today: 50,
    percentage_used_today: 50,
    expense_count_today: 2,
    by_category_today: [
      {
        category_id: 1,
        category_name: 'Food',
        category_color: '#FF5733',
        category_icon: 'utensils',
        total_spent: 30,
      },
      {
        category_id: 2,
        category_name: 'Transport',
        category_color: '#3498DB',
        category_icon: 'car',
        total_spent: 20,
      },
    ],
    is_over_budget: false,
    days_into_trip: 3,
    total_days: 8,
    ...overrides,
  });

  describe('Loading State', () => {
    it('should show loading state initially', async () => {
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      expect(screen.getByText('Loading daily budget...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when API call fails', async () => {
      const errorMessage = 'Failed to load daily statistics';
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockRejectedValue({
        response: { data: { detail: errorMessage } },
      });

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });
  });

  describe('No Daily Budget Set', () => {
    it('should show warning when no daily budget is configured', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ daily_budget: null, date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No daily budget set for this trip')).toBeInTheDocument();
      });

      // The text is rendered as one node: "Spent today: 50 USD (2 expenses)"
      expect(screen.getByText(/Spent today:.*50 USD.*2 expenses/)).toBeInTheDocument();
    });
  });

  describe('Normal Budget Display', () => {
    it('should display daily budget statistics correctly', async () => {
      // Component will call API with today's date initially
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      // Check main metrics - multiple instances of currency amounts exist
      expect(screen.getAllByText('100 USD').length).toBeGreaterThan(0); // Daily budget
      expect(screen.getAllByText('50 USD').length).toBeGreaterThan(0); // Spent today and remaining
      expect(screen.getByText('2 expenses')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    it('should show "On Track" badge when under 80% budget', async () => {
      const mockStats = createMockStatistics({ percentage_used_today: 60 });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('On Track')).toBeInTheDocument();
      });
    });

    it('should show "Warning" badge when between 80-100% budget', async () => {
      const mockStats = createMockStatistics({ percentage_used_today: 85 });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Warning')).toBeInTheDocument();
      });
    });

    it('should show "Over Budget" badge when exceeding budget', async () => {
      const mockStats = createMockStatistics({
        total_spent_today: 120,
        remaining_today: -20,
        percentage_used_today: 120,
        is_over_budget: true,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Over Budget')).toBeInTheDocument();
      });

      expect(screen.getByText('Over budget')).toBeInTheDocument();
      // The message contains "You have exceeded your daily budget by" and "20 USD" separately
      expect(screen.getByText(/You have exceeded your daily budget/)).toBeInTheDocument();
    });

    it('should display day information correctly', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Day 3 of 8/)).toBeInTheDocument();
      });
    });
  });

  describe('Category Breakdown', () => {
    it('should display category breakdown with icons and colors', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Today's Spending by Category")).toBeInTheDocument();
      });

      // Check categories are displayed
      expect(screen.getByText('Food')).toBeInTheDocument();
      expect(screen.getByText('Transport')).toBeInTheDocument();

      // Check amounts (may have multiple instances)
      expect(screen.getAllByText(/30 USD/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/20 USD/).length).toBeGreaterThan(0);

      // Check percentages
      expect(screen.getByText(/60.0%/)).toBeInTheDocument(); // Food: 30/50 = 60%
      expect(screen.getByText(/40.0%/)).toBeInTheDocument(); // Transport: 20/50 = 40%
    });

    it('should not show category breakdown when no expenses', async () => {
      const mockStats = createMockStatistics({
        by_category_today: [],
        expense_count_today: 0,
        total_spent_today: 0,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText("Today's Spending by Category")).not.toBeInTheDocument();
      });

      expect(screen.getByText(/No expenses recorded for/)).toBeInTheDocument();
    });
  });

  describe('Date Navigation', () => {
    it('should have Previous, Today, and Next buttons', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should navigate to next day when Next button is clicked', async () => {
      const user = userEvent.setup();
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const mockStats = createMockStatistics({ date: today });
      const mockStatsNext = createMockStatistics({ date: tomorrowDate });

      vi.mocked(expensesApi.getDailyBudgetStatistics)
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockStatsNext);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /Next/i });
      await user.click(nextButton);

      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledWith(mockTripId, tomorrowDate);
      });
    });

    it('should navigate to previous day when Previous button is clicked', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics({ date: '2025-11-10' });
      const mockStatsPrev = createMockStatistics({ date: '2025-11-09' });

      vi.mocked(expensesApi.getDailyBudgetStatistics)
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockStatsPrev);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      const prevButton = screen.getByText('Previous');
      await user.click(prevButton);

      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledWith(mockTripId, '2025-11-09');
      });
    });

    it('should disable Previous button at trip start date', async () => {
      const user = userEvent.setup();
      const today = new Date().toISOString().split('T')[0];

      // Mock responses: first for today, then for trip start date
      const mockStatsToday = createMockStatistics({ date: today });
      const mockStatsStart = createMockStatistics({ date: mockTripStartDate });

      vi.mocked(expensesApi.getDailyBudgetStatistics)
        .mockResolvedValueOnce(mockStatsToday)
        .mockResolvedValueOnce(mockStatsStart);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      // Navigate to trip start by clicking the date picker
      const dateInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const dateInput = dateInputs.find(input => input.type === 'date')!;
      await user.clear(dateInput);
      await user.type(dateInput, mockTripStartDate);

      // Wait for the new data to load
      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledWith(mockTripId, mockTripStartDate);
      });

      // Now check that Previous is disabled
      const prevButton = screen.getByRole('button', { name: /Previous/i });
      expect(prevButton).toBeDisabled();
    });

    it('should disable Next button at trip end date', async () => {
      const user = userEvent.setup();
      const today = new Date().toISOString().split('T')[0];

      // Mock responses: first for today, then for trip end date
      const mockStatsToday = createMockStatistics({ date: today });
      const mockStatsEnd = createMockStatistics({ date: mockTripEndDate });

      vi.mocked(expensesApi.getDailyBudgetStatistics)
        .mockResolvedValueOnce(mockStatsToday)
        .mockResolvedValueOnce(mockStatsEnd);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      // Navigate to trip end by clicking the date picker
      const dateInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const dateInput = dateInputs.find(input => input.type === 'date')!;
      await user.clear(dateInput);
      await user.type(dateInput, mockTripEndDate);

      // Wait for the new data to load
      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledWith(mockTripId, mockTripEndDate);
      });

      // Now check that Next is disabled
      const nextButton = screen.getByRole('button', { name: /Next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should have date input with min and max constraints', async () => {
      const mockStats = createMockStatistics({ date: '2025-11-10' });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      // Find the date input by its type attribute
      const dateInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const dateInput = dateInputs.find(input => input.type === 'date');

      expect(dateInput).toBeDefined();
      expect(dateInput).toHaveAttribute('min', mockTripStartDate);
      expect(dateInput).toHaveAttribute('max', mockTripEndDate);
    });

    it('should update statistics when date input is changed', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics({ date: '2025-11-10' });
      const mockStatsNew = createMockStatistics({ date: '2025-11-12' });

      vi.mocked(expensesApi.getDailyBudgetStatistics)
        .mockResolvedValueOnce(mockStats)
        .mockResolvedValueOnce(mockStatsNew);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        // Check for navigation buttons instead (UI has changed - no more "Daily Budget Overview" title)
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });

      const dateInputs = screen.getAllByRole('textbox') as HTMLInputElement[];
      const dateInput = dateInputs.find(input => input.type === 'date')!;

      await user.clear(dateInput);
      await user.type(dateInput, '2025-11-12');

      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledWith(mockTripId, '2025-11-12');
      });
    });
  });

  describe('Progress Bar', () => {
    it('should display progress bar with correct percentage', async () => {
      const mockStats = createMockStatistics({ percentage_used_today: 50 });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText("Today's Budget Usage")).toBeInTheDocument();
      });

      expect(screen.getByText('50.0% of daily budget used')).toBeInTheDocument();
    });

    it('should cap progress bar width at 100% even when over budget', async () => {
      const mockStats = createMockStatistics({
        percentage_used_today: 150,
        is_over_budget: true,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('150.0% of daily budget used')).toBeInTheDocument();
      });
    });
  });

  describe('Currency Formatting', () => {
    it('should format amounts with the provided currency code', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode="EUR"
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByText(/100 EUR/).length).toBeGreaterThan(0);
      });

      expect(screen.getAllByText(/50 EUR/).length).toBeGreaterThan(0);
    });
  });

  describe('API Integration', () => {
    it('should call API with correct parameters on mount', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledWith(
          mockTripId,
          expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) // Today's date in YYYY-MM-DD format
        );
      });
    });

    it('should reload statistics when tripId changes', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      const { rerender } = render(
        <DailyBudgetView
          tripId={1}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledTimes(1);
      });

      rerender(
        <DailyBudgetView
          tripId={2}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDate}
          tripEndDate={mockTripEndDate}
        />
      );

      await waitFor(() => {
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenCalledTimes(2);
        expect(expensesApi.getDailyBudgetStatistics).toHaveBeenLastCalledWith(
          2,
          expect.any(String)
        );
      });
    });
  });
});
