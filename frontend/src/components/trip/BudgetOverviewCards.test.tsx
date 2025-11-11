import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BudgetOverviewCards } from './BudgetOverviewCards';
import type { ExpenseStatistics } from '@/lib/expenses-api';

describe('BudgetOverviewCards', () => {
  const mockStatistics: ExpenseStatistics = {
    total_expenses: 10,
    total_spent: 750,
    total_budget: 1000,
    remaining_budget: 250,
    percentage_used: 75,
    by_category: [],
    by_payment_method: [],
    average_daily_spending: 50,
  };

  describe('Rendering', () => {
    it('should render all four budget cards', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('Total Budget')).toBeInTheDocument();
      expect(screen.getByText('Total Spent')).toBeInTheDocument();
      expect(screen.getByText('Remaining')).toBeInTheDocument();
      expect(screen.getByText('Budget Used')).toBeInTheDocument();
    });

    it('should display correct values from statistics', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('1 000.00 USD')).toBeInTheDocument(); // Total Budget
      expect(screen.getByText('750.00 USD')).toBeInTheDocument(); // Total Spent
      expect(screen.getByText('250.00 USD')).toBeInTheDocument(); // Remaining
      expect(screen.getByText('75.0%')).toBeInTheDocument(); // Percentage Used
    });

    it('should display expense count', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('10 expenses')).toBeInTheDocument();
    });
  });

  describe('Null Statistics Handling', () => {
    it('should handle null statistics gracefully', () => {
      render(
        <BudgetOverviewCards
          statistics={null}
          totalBudget={1000}
          currencyCode="EUR"
        />
      );

      expect(screen.getByText('Total Budget')).toBeInTheDocument();
      expect(screen.getAllByText('1 000.00 EUR').length).toBeGreaterThan(0); // Falls back to totalBudget
      expect(screen.getByText('0.00 EUR')).toBeInTheDocument(); // Total Spent defaults to 0
      expect(screen.getByText('0 expenses')).toBeInTheDocument();
    });
  });

  describe('Budget Status Icons', () => {
    it('should show green icon when under budget', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    it('should show red icon and "Over budget!" when at or over 100%', () => {
      const overBudgetStats: ExpenseStatistics = {
        ...mockStatistics,
        total_spent: 1100,
        remaining_budget: -100,
        percentage_used: 110,
      };

      render(
        <BudgetOverviewCards
          statistics={overBudgetStats}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('Over budget!')).toBeInTheDocument();
    });

    it('should show red icon exactly at 100%', () => {
      const exactBudgetStats: ExpenseStatistics = {
        ...mockStatistics,
        total_spent: 1000,
        remaining_budget: 0,
        percentage_used: 100,
      };

      render(
        <BudgetOverviewCards
          statistics={exactBudgetStats}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('Over budget!')).toBeInTheDocument();
    });
  });

  describe('Currency Formatting', () => {
    it('should format currency with provided currency code', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="EUR"
        />
      );

      expect(screen.getByText('1 000.00 EUR')).toBeInTheDocument();
      expect(screen.getByText('750.00 EUR')).toBeInTheDocument();
      expect(screen.getByText('250.00 EUR')).toBeInTheDocument();
    });

    it('should handle different currency codes correctly', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="GBP"
        />
      );

      expect(screen.getByText('1 000.00 GBP')).toBeInTheDocument();
      expect(screen.getByText('750.00 GBP')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero values', () => {
      const zeroStats: ExpenseStatistics = {
        total_expenses: 0,
        total_spent: 0,
        total_budget: 0,
        remaining_budget: 0,
        percentage_used: 0,
        by_category: [],
        by_payment_method: [],
        average_daily_spending: 0,
      };

      render(
        <BudgetOverviewCards
          statistics={zeroStats}
          totalBudget={0}
          currencyCode="USD"
        />
      );

      expect(screen.getAllByText('0.00 USD').length).toBeGreaterThan(0);
      expect(screen.getByText('0.0%')).toBeInTheDocument();
      expect(screen.getByText('0 expenses')).toBeInTheDocument();
    });

    it('should handle large numbers', () => {
      const largeStats: ExpenseStatistics = {
        ...mockStatistics,
        total_budget: 1234567,
        total_spent: 987654,
        remaining_budget: 246913,
        percentage_used: 80,
      };

      render(
        <BudgetOverviewCards
          statistics={largeStats}
          totalBudget={1234567}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('1 234 567.00 USD')).toBeInTheDocument();
      expect(screen.getByText('987 654.00 USD')).toBeInTheDocument();
    });

    it('should handle decimal percentages correctly', () => {
      const decimalStats: ExpenseStatistics = {
        ...mockStatistics,
        percentage_used: 67.89,
      };

      render(
        <BudgetOverviewCards
          statistics={decimalStats}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('67.9%')).toBeInTheDocument();
    });
  });

  describe('Card Labels', () => {
    it('should show descriptive labels under each card', () => {
      render(
        <BudgetOverviewCards
          statistics={mockStatistics}
          totalBudget={1000}
          currencyCode="USD"
        />
      );

      expect(screen.getByText('Allocated for trip')).toBeInTheDocument();
      expect(screen.getByText('Of total budget')).toBeInTheDocument();
    });
  });
});
