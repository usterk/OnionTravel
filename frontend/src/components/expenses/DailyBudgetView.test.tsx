import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DailyBudgetView } from './DailyBudgetView';
import * as expensesApi from '@/lib/expenses-api';
import * as categoriesApi from '@/lib/categories-api';
import type { DailyBudgetStatistics, ExpenseStatistics } from '@/lib/expenses-api';
import type { Expense, Category } from '@/types/models';

// Mock the expenses API
vi.mock('@/lib/expenses-api', () => ({
  getDailyBudgetStatistics: vi.fn(),
  getExpenseStatistics: vi.fn(),
  getExpenses: vi.fn(),
  deleteExpense: vi.fn(),
}));

// Mock the categories API
vi.mock('@/lib/categories-api', () => ({
  getCategories: vi.fn(),
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

// Mock VoiceExpenseButton
vi.mock('./VoiceExpenseButton', () => ({
  VoiceExpenseButton: () => <button data-testid="voice-expense-button">Voice Input</button>,
}));

// Mock ExpenseForm
vi.mock('./ExpenseForm', () => ({
  ExpenseForm: ({ onSuccess, onCancel }: any) => (
    <div data-testid="expense-form">
      <button onClick={onSuccess}>Submit</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

// Mock QuickExpenseEntry
vi.mock('./QuickExpenseEntry', () => ({
  QuickExpenseEntry: ({ onExpenseCreated, onCancel }: any) => (
    <div data-testid="quick-expense-entry">
      <button onClick={onExpenseCreated}>Create</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

describe('DailyBudgetView', () => {
  const mockTripId = 1;
  const mockCurrencyCode = 'USD';
  // Use dates that include today to avoid edge cases
  const today = new Date();
  const mockTripStartDate = new Date(today);
  mockTripStartDate.setDate(today.getDate() - 3); // 3 days ago
  const mockTripEndDate = new Date(today);
  mockTripEndDate.setDate(today.getDate() + 4); // 4 days from now

  const mockTripStartDateStr = mockTripStartDate.toISOString().split('T')[0];
  const mockTripEndDateStr = mockTripEndDate.toISOString().split('T')[0];

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default mock implementations
    vi.mocked(expensesApi.getExpenseStatistics).mockResolvedValue({
      total_expenses: 0,
      total_spent: 0,
      total_budget: 1000,
      remaining_budget: 1000,
      percentage_used: 0,
      by_category: [],
      by_payment_method: [],
      average_daily_spending: 0,
    });
    // getExpenses returns Expense[] directly
    vi.mocked(expensesApi.getExpenses).mockResolvedValue([]);
    // getCategories returns Category[] directly
    vi.mocked(categoriesApi.getCategories).mockResolvedValue([]);
  });

  const createMockStatistics = (overrides?: Partial<DailyBudgetStatistics>): DailyBudgetStatistics => ({
    date: '2025-11-10',
    daily_budget: 100,
    adjusted_daily_budget: null,
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
        category_daily_budget: 35,
        total_spent: 30,
        remaining_budget: 5,
        display_order: 0,
      },
      {
        category_id: 2,
        category_name: 'Transport',
        category_color: '#3498DB',
        category_icon: 'car',
        category_daily_budget: 25,
        total_spent: 20,
        remaining_budget: 5,
        display_order: 1,
      },
    ],
    is_over_budget: false,
    days_into_trip: 3,
    total_days: 8,
    cumulative_savings_past: null,
    ...overrides,
  });

  const createMockExpense = (overrides?: Partial<Expense>): Expense => ({
    id: 1,
    trip_id: mockTripId,
    category_id: 1,
    title: 'Lunch',
    amount: 15,
    currency_code: 'USD',
    amount_in_trip_currency: 15,
    exchange_rate: 1,
    payment_method: 'cash',
    start_date: '2025-11-10',
    end_date: null,
    notes: null,
    created_at: '2025-11-10T12:00:00Z',
    updated_at: '2025-11-10T12:00:00Z',
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
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
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
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
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
      const mockStats = createMockStatistics({
        daily_budget: null as any,
        date: today
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No daily budget set for this trip')).toBeInTheDocument();
      });

      // Check that spent amount is still shown - text may be in multiple elements
      const spentText = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Spent today:') &&
               element?.textContent?.includes('50 USD') &&
               element?.textContent?.includes('2 expenses') || false;
      });
      expect(spentText.length).toBeGreaterThan(0);
    });
  });

  describe('Main Metrics Display', () => {
    it('should display "Remaining Today" as main focus', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('💰 Remaining Today')).toBeInTheDocument();
      });

      // Check remaining amount - may appear multiple times
      const amounts = screen.getAllByText((content, element) => {
        return element?.textContent === '50 USD';
      });
      expect(amounts.length).toBeGreaterThan(0);
    });

    it('should display negative remaining in red when over budget', async () => {
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
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('💰 Remaining Today')).toBeInTheDocument();
      });

      // Check for negative amount with red styling - may appear multiple times
      const negativeAmounts = screen.getAllByText((content, element) => {
        return element?.textContent === '-20 USD' &&
               element?.className?.includes('text-red-600') || false;
      });
      expect(negativeAmounts.length).toBeGreaterThan(0);
    });

    it('should display cumulative savings when available', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({
        date: today,
        cumulative_savings_past: 25,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        const savingsText = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('+25 USD saved') || false;
        });
        expect(savingsText.length).toBeGreaterThan(0);
      });
    });

    it('should display cumulative overspending in red', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({
        date: today,
        cumulative_savings_past: -15,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        const overspentText = screen.getAllByText((content, element) => {
          return element?.textContent?.includes('-15 USD overspent') || false;
        });
        expect(overspentText.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Already Spent Display', () => {
    it('should display spent amount and progress bar', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Already Spent')).toBeInTheDocument();
      });

      // Amounts may appear multiple times in different sections
      const amounts = screen.getAllByText((content, element) => {
        return element?.textContent === '50 USD';
      });
      expect(amounts.length).toBeGreaterThan(0);

      const percentages = screen.getAllByText((content, element) => {
        return element?.textContent === '50% of budget';
      });
      expect(percentages.length).toBeGreaterThan(0);

      expect(screen.getByText('2 expenses • 50% available')).toBeInTheDocument();
    });
  });

  describe('Status Badge', () => {
    it('should show "On Track" badge when under 80% budget', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({
        date: today,
        percentage_used_today: 60
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('On Track')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show "Warning" badge when between 80-100% budget', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({
        date: today,
        percentage_used_today: 85
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Warning')).toBeInTheDocument();
      });
    });

    it('should show "Over Budget" badge when exceeding budget', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({
        date: today,
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
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Over Budget')).toBeInTheDocument();
      });
    });

    it('should show "Completed" badge for past days within budget', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayDate = yesterday.toISOString().split('T')[0];

      const mockStats = createMockStatistics({
        date: yesterdayDate,
        percentage_used_today: 60,
        is_over_budget: false,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Completed')).toBeInTheDocument();
      });
    });

    it('should show "Not Started" badge for future days with no expenses', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.toISOString().split('T')[0];

      const mockStats = createMockStatistics({
        date: tomorrowDate,
        total_spent_today: 0,
        expense_count_today: 0,
        remaining_today: 100,
        percentage_used_today: 0,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Not Started')).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Date Navigation', () => {
    it('should display day title as "Today" for current date', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Today')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should display day of week for non-today dates', async () => {
      const mockStats = createMockStatistics({ date: '2025-11-10' });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        // 2025-11-10 is a Monday
        expect(screen.getByText('Monday')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show day counter', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Day 3 of 8')).toBeInTheDocument();
      });
    });

    it('should have Previous and Next buttons', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getAllByRole('button', { name: /Previous/i })[0]).toBeInTheDocument();
      });

      expect(screen.getAllByRole('button', { name: /Next/i })[0]).toBeInTheDocument();
    });

    it('should disable Previous button at trip start', async () => {
      // Use today as trip start to match hook's initialization
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={today}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        const prevButton = screen.getAllByRole('button', { name: /Previous/i })[0];
        expect(prevButton).toBeDisabled();
      }, { timeout: 3000 });
    });

    it('should disable Next button at trip end', async () => {
      // Use today as trip end to match hook's initialization
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={today}
        />
      );

      await waitFor(() => {
        const nextButton = screen.getAllByRole('button', { name: /Next/i })[0];
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Expenses Section', () => {
    it('should display expenses for the selected day', async () => {
      const mockStats = createMockStatistics();
      const mockExpenses = [
        createMockExpense({ id: 1, title: 'Lunch', amount_in_trip_currency: 15 }),
        createMockExpense({ id: 2, title: 'Bus ticket', amount_in_trip_currency: 5 }),
      ];

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Lunch')).toBeInTheDocument();
      });

      expect(screen.getByText('Bus ticket')).toBeInTheDocument();
    });

    it('should show "No expenses recorded" when day has no expenses', async () => {
      const mockStats = createMockStatistics({
        expense_count_today: 0,
        total_spent_today: 0,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue([]);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/No expenses recorded for/)).toBeInTheDocument();
      });
    });

    it('should collapse/expand expenses section when clicked', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics();
      const mockExpenses = [createMockExpense()];

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Lunch')).toBeInTheDocument();
      });

      // Find the expenses header and click it
      const expensesHeader = screen.getByText(/Expenses for/);
      await user.click(expensesHeader);

      // After collapse, expense should not be visible
      await waitFor(() => {
        expect(screen.queryByText('Lunch')).not.toBeInTheDocument();
      });
    });

    it('should display multi-day expense with daily amount', async () => {
      const mockStats = createMockStatistics();
      const multiDayExpense = createMockExpense({
        title: 'Hotel',
        amount_in_trip_currency: 300,
        start_date: '2025-11-10',
        end_date: '2025-11-12', // 3 days: 10, 11, 12
      });

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue([multiDayExpense]);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Hotel')).toBeInTheDocument();
      });

      // Daily amount should be 300/3 = 100 - may appear multiple times
      const amounts = screen.getAllByText((content, element) => {
        return element?.textContent === '100 USD';
      });
      expect(amounts.length).toBeGreaterThan(0);
    });
  });

  describe('Category Breakdown Section', () => {
    it('should display category breakdown when collapsed by default', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Remaining by Category')).toBeInTheDocument();
      });

      // Should not show category details initially (collapsed)
      expect(screen.queryByText('Food')).not.toBeInTheDocument();
    });

    it('should expand category breakdown when clicked', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Remaining by Category')).toBeInTheDocument();
      });

      const categoryHeader = screen.getByText('Remaining by Category');
      await user.click(categoryHeader);

      // After expand, categories should be visible
      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
      });

      expect(screen.getByText('Transport')).toBeInTheDocument();
    });

    it('should show remaining budget per category', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Remaining by Category')).toBeInTheDocument();
      });

      // Expand section
      await user.click(screen.getByText('Remaining by Category'));

      await waitFor(() => {
        // Food: 35 budget - 30 spent = 5 remaining - may appear multiple times
        const amounts = screen.getAllByText((content, element) => {
          return element?.textContent === '5 USD';
        });
        expect(amounts.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });
  });

  describe('Budget Details Section', () => {
    it('should display daily budget', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Budget')).toBeInTheDocument();
      });

      expect(screen.getByText((content, element) => {
        return element?.textContent === '100 USD';
      })).toBeInTheDocument();
    });

    it('should display adjusted daily budget when different from daily budget', async () => {
      const today = new Date().toISOString().split('T')[0];
      const mockStats = createMockStatistics({
        date: today,
        adjusted_daily_budget: 110,
      });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Adjusted Daily Budget')).toBeInTheDocument();
      });

      expect(screen.getByText((content, element) => {
        return element?.textContent === '110 USD';
      })).toBeInTheDocument();
    });

    it('should display average daily spending when available', async () => {
      const mockStats = createMockStatistics();
      const mockTripStats: ExpenseStatistics = {
        total_expenses: 10,
        total_spent: 500,
        total_budget: 1000,
        remaining_budget: 500,
        percentage_used: 50,
        by_category: [],
        by_payment_method: [],
        average_daily_spending: 62.5,
      };

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenseStatistics).mockResolvedValue(mockTripStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Avg. Daily')).toBeInTheDocument();
      });

      expect(screen.getByText((content, element) => {
        return element?.textContent === '62.5 USD';
      })).toBeInTheDocument();
    });
  });

  describe('Quick Add Button', () => {
    it('should render quick add floating button', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Quick add expense')).toBeInTheDocument();
      });
    });

    it('should open quick add dialog when clicked', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByLabelText('Quick add expense')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('Quick add expense'));

      await waitFor(() => {
        expect(screen.getByText('Quick Add Expense')).toBeInTheDocument();
      });

      expect(screen.getByTestId('quick-expense-entry')).toBeInTheDocument();
    });
  });

  describe('Voice Expense Button', () => {
    it('should render voice expense button', async () => {
      const mockStats = createMockStatistics();
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('voice-expense-button')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Expense', () => {
    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics();
      const mockExpenses = [createMockExpense({ title: 'Lunch to delete' })];

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Lunch to delete')).toBeInTheDocument();
      });

      // Expand expense to show delete button
      await user.click(screen.getByText('Lunch to delete'));

      await waitFor(() => {
        expect(screen.getByTitle('Delete expense')).toBeInTheDocument();
      });

      // Click delete button
      await user.click(screen.getByTitle('Delete expense'));

      await waitFor(() => {
        expect(screen.getByText('Delete Expense')).toBeInTheDocument();
      });

      expect(screen.getByText('Are you sure you want to delete this expense?')).toBeInTheDocument();
      expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
    });

    it('should delete expense when confirmed', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics();
      const mockExpenses = [createMockExpense({ id: 123, title: 'Lunch to delete' })];

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue(mockExpenses);
      vi.mocked(expensesApi.deleteExpense).mockResolvedValue(undefined);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Lunch to delete')).toBeInTheDocument();
      });

      // Expand and delete
      await user.click(screen.getByText('Lunch to delete'));

      await waitFor(() => {
        expect(screen.getByTitle('Delete expense')).toBeInTheDocument();
      });

      await user.click(screen.getByTitle('Delete expense'));

      await waitFor(() => {
        expect(screen.getByText('Delete Expense')).toBeInTheDocument();
      });

      // Confirm deletion - click the Delete button in the dialog
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(expensesApi.deleteExpense).toHaveBeenCalledWith(mockTripId, 123);
      }, { timeout: 3000 });
    });
  });

  describe('Currency Formatting', () => {
    it('should format amounts with provided currency code', async () => {
      const mockStats = createMockStatistics();
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
        // Check for EUR currency in budget details
        expect(screen.getByText((content, element) => {
          return element?.textContent === '100 EUR';
        })).toBeInTheDocument();
      });
    });
  });

  describe('Date Navigation Functions', () => {
    it('should not navigate beyond trip start date', async () => {
      // Use today's date as trip start to ensure hook initializes correctly
      const today = new Date().toISOString().split('T')[0];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 10);
      const endDateStr = endDate.toISOString().split('T')[0];

      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={today}
          tripEndDate={endDateStr}
        />
      );

      await waitFor(() => {
        const prevButton = screen.getAllByRole('button', { name: /Previous/i })[0];
        expect(prevButton).toBeDisabled();
      });
    });

    it('should not navigate beyond trip end date', async () => {
      // Use dates where today is the end date
      const today = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);
      const startDateStr = startDate.toISOString().split('T')[0];

      const mockStats = createMockStatistics({ date: today });
      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={startDateStr}
          tripEndDate={today}
        />
      );

      await waitFor(() => {
        const nextButton = screen.getAllByRole('button', { name: /Next/i })[0];
        expect(nextButton).toBeDisabled();
      });
    });
  });

  describe('Category Breakdown Section', () => {
    it('should collapse/expand category breakdown when clicked', async () => {
      const user = userEvent.setup();
      const mockStats = createMockStatistics({
        by_category_today: [
          {
            category_id: 1,
            category_name: 'Food',
            category_color: '#FF5733',
            category_icon: 'utensils',
            category_daily_budget: 20,
            total_spent: 10,
            remaining_budget: 10,
          },
        ],
      });

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Remaining by Category')).toBeInTheDocument();
      });

      // Initially collapsed
      expect(screen.queryByText('Food')).not.toBeInTheDocument();

      // Click to expand
      const header = screen.getByText('Remaining by Category').closest('.cursor-pointer');
      if (header) {
        await user.click(header);
      }

      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
      });

      // Click to collapse
      if (header) {
        await user.click(header);
      }

      await waitFor(() => {
        expect(screen.queryByText('Food')).not.toBeInTheDocument();
      });
    });

    it('should show remaining budget per category', async () => {
      const mockStats = createMockStatistics({
        by_category_today: [
          {
            category_id: 1,
            category_name: 'Food',
            category_color: '#FF5733',
            category_icon: 'utensils',
            category_daily_budget: 30,
            total_spent: 15,
            remaining_budget: 15,
          },
          {
            category_id: 2,
            category_name: 'Transport',
            category_color: '#3498DB',
            category_icon: 'car',
            category_daily_budget: 20,
            total_spent: 25,
            remaining_budget: -5, // Over budget
          },
        ],
      });

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenses).mockResolvedValue([]);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      // Expand category breakdown
      await waitFor(() => {
        expect(screen.getByText('Remaining by Category')).toBeInTheDocument();
      });

      const header = screen.getByText('Remaining by Category').closest('.cursor-pointer');
      if (header) {
        await userEvent.click(header);
      }

      await waitFor(() => {
        expect(screen.getByText('Food')).toBeInTheDocument();
        expect(screen.getByText('Transport')).toBeInTheDocument();
      });

      // Check remaining amounts (multiple elements with "15 USD" expected)
      const amountElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('15') && element?.textContent?.includes('USD') || false;
      });
      expect(amountElements.length).toBeGreaterThan(0);
    });
  });

  describe('Budget Details Section', () => {
    it('should display daily budget', async () => {
      const mockStats = createMockStatistics({ daily_budget: 100 });

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Daily Budget')).toBeInTheDocument();
      });

      expect(screen.getAllByText((content, element) => {
        return element?.textContent?.includes('100') && element?.textContent?.includes('USD') || false;
      })[0]).toBeInTheDocument();
    });

    it('should display adjusted daily budget when different from daily budget', async () => {
      const mockStats = createMockStatistics({
        daily_budget: 100,
        adjusted_daily_budget: 120,
        cumulative_savings_past: 20,
      });

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Adjusted Daily Budget')).toBeInTheDocument();
      });
    });

    it('should display average daily spending when available', async () => {
      const mockStats = createMockStatistics();
      const mockTripStats: ExpenseStatistics = {
        total_budget: 1000,
        daily_budget: 100,
        total_spent: 300,
        remaining_budget: 700,
        percentage_used: 30,
        total_expenses: 15,
        average_daily_spending: 75,
        days_into_trip: 4,
        total_days: 10,
      };

      vi.mocked(expensesApi.getDailyBudgetStatistics).mockResolvedValue(mockStats);
      vi.mocked(expensesApi.getExpenseStatistics).mockResolvedValue(mockTripStats);

      render(
        <DailyBudgetView
          tripId={mockTripId}
          currencyCode={mockCurrencyCode}
          tripStartDate={mockTripStartDateStr}
          tripEndDate={mockTripEndDateStr}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Avg. Daily')).toBeInTheDocument();
      });

      const avgElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('75') && element?.textContent?.includes('USD') || false;
      });
      expect(avgElements.length).toBeGreaterThan(0);
    });
  });
});
