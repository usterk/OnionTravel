import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryPieChart } from './CategoryPieChart';
import type { CategoryWithStats } from '@/types/models';

// Mock Recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => (
    <div data-testid="pie">
      {data?.map((item: any, i: number) => (
        <div key={i} data-testid={`pie-cell-${i}`}>
          {item.name}: {item.value}%
        </div>
      ))}
    </div>
  ),
  Cell: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: () => <div data-testid="legend">Legend</div>,
  Tooltip: () => <div data-testid="tooltip">Tooltip</div>,
}));

describe('CategoryPieChart', () => {
  const mockCategories: CategoryWithStats[] = [
    {
      id: 1,
      name: 'Food',
      color: '#FF5733',
      icon: 'utensils',
      budget_percentage: 35,
      allocated_budget: 350,
      total_spent: 200,
      remaining_budget: 150,
      percentage_used: 57.14,
      expense_count: 5,
      trip_id: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
    {
      id: 2,
      name: 'Transport',
      color: '#3498DB',
      icon: 'car',
      budget_percentage: 25,
      allocated_budget: 250,
      total_spent: 150,
      remaining_budget: 100,
      percentage_used: 60,
      expense_count: 3,
      trip_id: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
    {
      id: 3,
      name: 'Accommodation',
      color: '#2ECC71',
      icon: 'hotel',
      budget_percentage: 40,
      allocated_budget: 400,
      total_spent: 400,
      remaining_budget: 0,
      percentage_used: 100,
      expense_count: 2,
      trip_id: 1,
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    },
  ];

  describe('Rendering', () => {
    it('should render pie chart with categories', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
      // Component renders 2 charts (mobile + desktop), so we get multiple elements
      expect(screen.getAllByTestId('pie-chart')).toHaveLength(2);
      expect(screen.getAllByTestId('legend')).toHaveLength(2);
    });

    it('should display card description with total percentage and category count', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Total: 35 + 25 + 40 = 100%
      // Text is split into multiple elements due to formatNumber(), so use regex matcher
      expect(screen.getByText((content, element) => {
        return element?.textContent === '100% of budget allocated across 3 categories';
      })).toBeInTheDocument();
    });

    it('should show singular "category" when only one category', () => {
      const singleCategory = [mockCategories[0]];
      render(<CategoryPieChart categories={singleCategory} tripCurrency="EUR" />);

      // Text is split into multiple elements due to formatNumber(), so use function matcher
      expect(screen.getByText((content, element) => {
        return element?.textContent === '35% of budget allocated across 1 category';
      })).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no categories', () => {
      render(<CategoryPieChart categories={[]} tripCurrency="USD" />);

      expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
      expect(screen.getByText('No budget allocated to categories yet')).toBeInTheDocument();
      expect(screen.getByText('Assign budget percentages to categories to see the distribution')).toBeInTheDocument();
    });

    it('should show empty state when all categories have 0% budget and no spending', () => {
      const zeroBudgetCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 0,
          total_spent: 0, // Also no spending
        },
      ];

      render(<CategoryPieChart categories={zeroBudgetCategories} tripCurrency="USD" />);

      expect(screen.getByText('No budget allocated to categories yet')).toBeInTheDocument();
    });
  });

  describe('Data Filtering and Sorting', () => {
    it('should filter out categories with 0% budget and no spending', () => {
      const categoriesWithZero: CategoryWithStats[] = [
        ...mockCategories,
        {
          id: 4,
          name: 'Shopping',
          color: '#E74C3C',
          icon: 'shopping-bag',
          budget_percentage: 0,
          allocated_budget: 0,
          total_spent: 0, // No spending either
          remaining_budget: 0,
          percentage_used: 0,
          expense_count: 0,
          trip_id: 1,
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
        },
      ];

      render(<CategoryPieChart categories={categoriesWithZero} tripCurrency="USD" />);

      // Should still show only 3 categories (Shopping filtered out - no budget AND no spending)
      expect(screen.getByText((content, element) => {
        return element?.textContent === '100% of budget allocated across 3 categories';
      })).toBeInTheDocument();
    });

    it('should sort categories by budget percentage descending', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      const pieElements = screen.getAllByTestId('pie');
      const cells = pieElements[0].querySelectorAll('[data-testid^="pie-cell-"]');

      // First should be Accommodation (40%), then Food (35%), then Transport (25%)
      expect(cells[0].textContent).toContain('Accommodation: 40%');
      expect(cells[1].textContent).toContain('Food: 35%');
      expect(cells[2].textContent).toContain('Transport: 25%');
    });
  });

  describe('Budget Allocation Messages', () => {
    it('should show unallocated message when total < 100%', () => {
      const underallocatedCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 30,
          total_spent: 0,
        },
        {
          ...mockCategories[1],
          budget_percentage: 20,
          total_spent: 0,
        },
      ];

      render(<CategoryPieChart categories={underallocatedCategories} tripCurrency="USD" />);

      // getAllByText because text appears in both mobile and desktop views
      const elements = screen.getAllByText((content, element) => {
        return element?.textContent === '50% unallocated';
      });
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should show over-allocated warning when total > 100%', () => {
      const overallocatedCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 60,
          total_spent: 0,
        },
        {
          ...mockCategories[1],
          budget_percentage: 50,
          total_spent: 0,
        },
      ];

      render(<CategoryPieChart categories={overallocatedCategories} tripCurrency="USD" />);

      // getAllByText because text appears in both mobile and desktop views
      const elements = screen.getAllByText((content, element) => {
        return element?.textContent === 'Over-allocated by 10%';
      });
      expect(elements.length).toBeGreaterThan(0);
    });

    it('should not show allocation message when exactly 100%', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Total is 100%, so no message should be shown
      expect(screen.queryByText(/unallocated/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Over-allocated/)).not.toBeInTheDocument();
    });
  });

  describe('Currency Support', () => {
    it('should use default currency USD when not provided', () => {
      render(<CategoryPieChart categories={mockCategories} />);

      expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
    });

    it('should accept custom currency code', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="EUR" />);

      expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
    });

    it('should accept GBP currency', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="GBP" />);

      expect(screen.getByText('Budget Distribution')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small percentages correctly', () => {
      const smallPercentageCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 0.5,
          total_spent: 0,
        },
      ];

      render(<CategoryPieChart categories={smallPercentageCategories} tripCurrency="USD" />);

      expect(screen.getByText((content, element) => {
        return element?.textContent === '0.5% of budget allocated across 1 category';
      })).toBeInTheDocument();
    });

    it('should handle decimal percentages correctly', () => {
      const decimalCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 33.33,
          total_spent: 0,
        },
        {
          ...mockCategories[1],
          budget_percentage: 33.33,
          total_spent: 0,
        },
        {
          ...mockCategories[2],
          budget_percentage: 33.34,
          total_spent: 0,
        },
      ];

      render(<CategoryPieChart categories={decimalCategories} tripCurrency="USD" />);

      expect(screen.getByText((content, element) => {
        return element?.textContent === '100% of budget allocated across 3 categories';
      })).toBeInTheDocument();
    });

    it('should handle large number of categories', () => {
      const manyCategories: CategoryWithStats[] = Array.from({ length: 10 }, (_, i) => ({
        ...mockCategories[0],
        id: i + 1,
        name: `Category ${i + 1}`,
        budget_percentage: 10,
        total_spent: 0,
      }));

      render(<CategoryPieChart categories={manyCategories} tripCurrency="USD" />);

      expect(screen.getByText((content, element) => {
        return element?.textContent === '100% of budget allocated across 10 categories';
      })).toBeInTheDocument();
    });
  });

  describe('Chart Components', () => {
    it('should render tooltip component', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // 2 tooltips (mobile + desktop)
      expect(screen.getAllByTestId('tooltip')).toHaveLength(2);
    });

    it('should render legend component', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // 2 legends (mobile + desktop)
      expect(screen.getAllByTestId('legend')).toHaveLength(2);
    });

    it('should render pie component with data', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      const pieElements = screen.getAllByTestId('pie');
      expect(pieElements).toHaveLength(2); // mobile + desktop

      // Should have 3 cells for 3 categories in first pie
      const cells = pieElements[0].querySelectorAll('[data-testid^="pie-cell-"]');
      expect(cells).toHaveLength(3);
    });
  });
});
