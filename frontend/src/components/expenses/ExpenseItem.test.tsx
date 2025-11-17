import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExpenseItem } from './ExpenseItem';
import type { Expense } from '@/types/models';
import type { DailyBudgetStatistics } from '@/lib/expenses-api';

// Mock icon picker
vi.mock('@/components/ui/icon-picker', () => ({
  getIconComponent: () => {
    return () => <div data-testid="category-icon" />;
  },
}));

describe('ExpenseItem', () => {
  const mockStatistics: DailyBudgetStatistics = {
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
    ],
    is_over_budget: false,
    days_into_trip: 3,
    total_days: 8,
    cumulative_savings_past: null,
  };

  const mockExpense: Expense = {
    id: 1,
    trip_id: 1,
    category_id: 1,
    title: 'Lunch',
    amount: 15,
    currency_code: 'USD',
    amount_in_trip_currency: 15,
    exchange_rate: 1,
    payment_method: 'cash',
    start_date: '2025-11-10',
    end_date: null,
    notes: 'Tasty lunch',
    created_at: '2025-11-10T12:00:00Z',
    updated_at: '2025-11-10T12:00:00Z',
  };

  const mockProps = {
    expense: mockExpense,
    currencyCode: 'USD',
    statistics: mockStatistics,
    isExpanded: false,
    onToggleExpand: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
  };

  it('should render expense title and amount', () => {
    render(<ExpenseItem {...mockProps} />);

    expect(screen.getByText('Lunch')).toBeInTheDocument();
    expect(screen.getByText('15 USD')).toBeInTheDocument();
  });

  it('should render category icon', () => {
    render(<ExpenseItem {...mockProps} />);

    expect(screen.getByTestId('category-icon')).toBeInTheDocument();
  });

  it('should call onToggleExpand when clicking on title', async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();

    render(<ExpenseItem {...mockProps} onToggleExpand={onToggleExpand} />);

    await user.click(screen.getByText('Lunch'));

    expect(onToggleExpand).toHaveBeenCalledWith(mockExpense.id);
  });

  it('should call onToggleExpand when clicking on amount', async () => {
    const user = userEvent.setup();
    const onToggleExpand = vi.fn();

    render(<ExpenseItem {...mockProps} onToggleExpand={onToggleExpand} />);

    await user.click(screen.getByText('15 USD'));

    expect(onToggleExpand).toHaveBeenCalledWith(mockExpense.id);
  });

  it('should show expanded details when isExpanded is true', () => {
    render(<ExpenseItem {...mockProps} isExpanded={true} />);

    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('Payment:')).toBeInTheDocument();
    expect(screen.getByText('cash')).toBeInTheDocument();
    expect(screen.getByText('Notes:')).toBeInTheDocument();
    expect(screen.getByText('Tasty lunch')).toBeInTheDocument();
  });

  it('should not show expanded details when isExpanded is false', () => {
    render(<ExpenseItem {...mockProps} isExpanded={false} />);

    expect(screen.queryByText('Category:')).not.toBeInTheDocument();
    expect(screen.queryByText('Payment:')).not.toBeInTheDocument();
    expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
  });

  it('should show edit and delete buttons when expanded', async () => {
    render(<ExpenseItem {...mockProps} isExpanded={true} />);

    expect(screen.getByTitle('Edit expense')).toBeInTheDocument();
    expect(screen.getByTitle('Delete expense')).toBeInTheDocument();
  });

  it('should call onEdit when clicking edit button', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    render(<ExpenseItem {...mockProps} isExpanded={true} onEdit={onEdit} />);

    await user.click(screen.getByTitle('Edit expense'));

    expect(onEdit).toHaveBeenCalledWith(mockExpense);
  });

  it('should call onDelete when clicking delete button', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<ExpenseItem {...mockProps} isExpanded={true} onDelete={onDelete} />);

    await user.click(screen.getByTitle('Delete expense'));

    expect(onDelete).toHaveBeenCalledWith(mockExpense);
  });

  it('should show multi-day indicator for multi-day expenses', () => {
    const multiDayExpense = {
      ...mockExpense,
      amount_in_trip_currency: 300,
      start_date: '2025-11-10',
      end_date: '2025-11-12', // 3 days
    };

    render(<ExpenseItem {...mockProps} expense={multiDayExpense} />);

    // Should show multi-day icon
    expect(screen.getByTitle('Multi-day expense - showing daily amount')).toBeInTheDocument();

    // Should show daily amount (300/3 = 100)
    expect(screen.getByText('100 USD')).toBeInTheDocument();
  });

  it('should show original currency when different from trip currency', () => {
    const foreignExpense = {
      ...mockExpense,
      currency_code: 'EUR',
      amount: 20,
      amount_in_trip_currency: 22,
      exchange_rate: 1.1,
    };

    render(<ExpenseItem {...mockProps} expense={foreignExpense} isExpanded={true} />);

    expect(screen.getByText('Original:')).toBeInTheDocument();
    expect(screen.getByText('20 EUR')).toBeInTheDocument();
  });

  it('should not show original currency when same as trip currency', () => {
    render(<ExpenseItem {...mockProps} isExpanded={true} />);

    expect(screen.queryByText('Original:')).not.toBeInTheDocument();
  });

  it('should not show notes section when notes is null', () => {
    const expenseWithoutNotes = {
      ...mockExpense,
      notes: null,
    };

    render(<ExpenseItem {...mockProps} expense={expenseWithoutNotes} isExpanded={true} />);

    expect(screen.queryByText('Notes:')).not.toBeInTheDocument();
  });

  it('should not show payment method when not provided', () => {
    const expenseWithoutPayment = {
      ...mockExpense,
      payment_method: null,
    };

    render(<ExpenseItem {...mockProps} expense={expenseWithoutPayment} isExpanded={true} />);

    expect(screen.queryByText('Payment:')).not.toBeInTheDocument();
  });
});
