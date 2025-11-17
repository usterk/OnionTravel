import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryPieChart } from './CategoryPieChart';
import type { CategoryWithStats } from '@/types/models';

// Mock Recharts components
vi.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data, label }: any) => {
    // Call the label function to test renderCustomLabel
    const labelProps = {
      cx: 100,
      cy: 100,
      midAngle: 45,
      innerRadius: 50,
      outerRadius: 80,
      percent: 0.25, // 25%
    };

    return (
      <div data-testid="pie">
        {data?.map((item: any, i: number) => (
          <div key={i} data-testid={`pie-cell-${i}`}>
            {item.name}: {item.value}%
          </div>
        ))}
        {/* Call label function if provided */}
        {label && (
          <div data-testid="custom-label">
            {label(labelProps)}
          </div>
        )}
        {/* Test with small percentage */}
        {label && (
          <div data-testid="custom-label-small">
            {label({ ...labelProps, percent: 0.03 })}
          </div>
        )}
      </div>
    );
  },
  Cell: () => null,
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  Legend: ({ formatter }: any) => {
    // Call the formatter function to test Legend formatter
    const testEntry = {
      payload: {
        value: 35,
        isUnbudgeted: false,
      },
    };
    const testEntryUnbudgeted = {
      payload: {
        value: 20,
        isUnbudgeted: true,
      },
    };

    return (
      <div data-testid="legend">
        <div data-testid="legend-formatted">
          {formatter ? formatter('Food', testEntry) : 'Legend'}
        </div>
        <div data-testid="legend-formatted-unbudgeted">
          {formatter ? formatter('Shopping', testEntryUnbudgeted) : 'Legend'}
        </div>
      </div>
    );
  },
  Tooltip: ({ content }: any) => {
    // Call the CustomTooltip component
    if (content) {
      const testPayload = {
        payload: {
          name: 'Food',
          value: 35,
          spent: 200,
          allocated: 350,
          isUnbudgeted: false,
        },
      };
      const testPayloadUnbudgeted = {
        payload: {
          name: 'Shopping',
          value: 20,
          spent: 100,
          isUnbudgeted: true,
        },
      };

      return (
        <div data-testid="tooltip">
          <div data-testid="tooltip-active">
            {content.type({ active: true, payload: [testPayload] })}
          </div>
          <div data-testid="tooltip-active-unbudgeted">
            {content.type({ active: true, payload: [testPayloadUnbudgeted] })}
          </div>
          <div data-testid="tooltip-inactive">
            {content.type({ active: false, payload: [] })}
          </div>
        </div>
      );
    }
    return <div data-testid="tooltip">Tooltip</div>;
  },
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

  describe('Unbudgeted Categories', () => {
    it('should show unbudgeted category with spending', () => {
      const unbudgetedCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 50,
          total_spent: 500,
        },
        {
          ...mockCategories[1],
          budget_percentage: 0, // No budget
          total_spent: 100, // But has spending
        },
      ];

      render(<CategoryPieChart categories={unbudgetedCategories} tripCurrency="USD" />);

      // Should show both categories
      const pieElements = screen.getAllByTestId('pie');
      const cells = pieElements[0].querySelectorAll('[data-testid^="pie-cell-"]');
      expect(cells.length).toBeGreaterThan(0);
    });

    it('should calculate proportional value for unbudgeted category with spending', () => {
      const unbudgetedCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 0,
          allocated_budget: 0,
          total_spent: 100, // 50% of total spending
        },
        {
          ...mockCategories[1],
          budget_percentage: 0,
          allocated_budget: 0,
          total_spent: 100, // 50% of total spending
        },
      ];

      render(<CategoryPieChart categories={unbudgetedCategories} tripCurrency="USD" />);

      // Both categories should appear with proportional values
      const pieElements = screen.getAllByTestId('pie');
      const cells = pieElements[0].querySelectorAll('[data-testid^="pie-cell-"]');
      expect(cells).toHaveLength(2);
    });

    it('should show unbudgeted indicator in summary', () => {
      const unbudgetedCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 0,
          total_spent: 100,
        },
      ];

      render(<CategoryPieChart categories={unbudgetedCategories} tripCurrency="USD" />);

      // Should show unbudgeted message
      expect(screen.getByText(/Category has spending but no budget allocated/i)).toBeInTheDocument();
    });

    it('should not show unbudgeted indicator when all categories have budget', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Should not show unbudgeted message
      expect(screen.queryByText(/Category has spending but no budget allocated/i)).not.toBeInTheDocument();
    });
  });

  describe('Tooltip and Label Rendering', () => {
    it('should render custom tooltip with budgeted category data', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Tooltip should render with budgeted category info
      const tooltipActive = screen.getAllByTestId('tooltip-active');
      expect(tooltipActive.length).toBeGreaterThan(0);

      // Should contain category name
      expect(tooltipActive[0]).toHaveTextContent('Food');
      // Should contain budget percentage
      expect(tooltipActive[0]).toHaveTextContent('Budget:');
      expect(tooltipActive[0]).toHaveTextContent('35%');
      // Should contain allocated amount
      expect(tooltipActive[0]).toHaveTextContent('Allocated:');
      expect(tooltipActive[0]).toHaveTextContent('USD');
      expect(tooltipActive[0]).toHaveTextContent('350');
      // Should contain spent amount
      expect(tooltipActive[0]).toHaveTextContent('Spent:');
      expect(tooltipActive[0]).toHaveTextContent('200');
    });

    it('should render custom tooltip with unbudgeted category data', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Tooltip should render with unbudgeted category info
      const tooltipUnbudgeted = screen.getAllByTestId('tooltip-active-unbudgeted');
      expect(tooltipUnbudgeted.length).toBeGreaterThan(0);

      // Should contain category name
      expect(tooltipUnbudgeted[0]).toHaveTextContent('Shopping');
      // Should contain "No budget allocated" message
      expect(tooltipUnbudgeted[0]).toHaveTextContent('No budget allocated');
      // Should contain spent amount
      expect(tooltipUnbudgeted[0]).toHaveTextContent('Spent:');
      expect(tooltipUnbudgeted[0]).toHaveTextContent('USD');
      expect(tooltipUnbudgeted[0]).toHaveTextContent('100');
    });

    it('should return null when tooltip is inactive', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Inactive tooltip should be empty
      const tooltipInactive = screen.getAllByTestId('tooltip-inactive');
      expect(tooltipInactive.length).toBeGreaterThan(0);
      // Should not contain any content when inactive
      expect(tooltipInactive[0]).toBeEmptyDOMElement();
    });

    it('should render custom label for percentages >= 5%', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Custom label should render for normal percentages (25%)
      const customLabels = screen.getAllByTestId('custom-label');
      expect(customLabels.length).toBeGreaterThan(0);

      // Should contain percentage text (25% from labelProps)
      expect(customLabels[0]).toHaveTextContent('25%');
    });

    it('should not render custom label for percentages < 5%', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Custom label should NOT render for small percentages (3%)
      const customLabelsSmall = screen.getAllByTestId('custom-label-small');
      expect(customLabelsSmall.length).toBeGreaterThan(0);

      // Should be empty (return null for < 5%)
      expect(customLabelsSmall[0]).toBeEmptyDOMElement();
    });

    it('should format legend with category name and percentage', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Legend should format entries correctly
      const legendFormatted = screen.getAllByTestId('legend-formatted');
      expect(legendFormatted.length).toBeGreaterThan(0);

      // Should contain category name and percentage
      expect(legendFormatted[0]).toHaveTextContent('Food');
      expect(legendFormatted[0]).toHaveTextContent('35%');
      // Should NOT contain unbudgeted indicator (*)
      expect(legendFormatted[0]).not.toHaveTextContent('*');
    });

    it('should format legend with unbudgeted indicator', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Legend should format unbudgeted entries with indicator
      const legendUnbudgeted = screen.getAllByTestId('legend-formatted-unbudgeted');
      expect(legendUnbudgeted.length).toBeGreaterThan(0);

      // Should contain category name and percentage
      expect(legendUnbudgeted[0]).toHaveTextContent('Shopping');
      expect(legendUnbudgeted[0]).toHaveTextContent('20%');
      // Should contain unbudgeted indicator (*)
      expect(legendUnbudgeted[0]).toHaveTextContent('*');
    });
  });

  describe('Responsive Layout', () => {
    it('should render both mobile and desktop charts', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Should have 2 pie charts (one for mobile, one for desktop)
      expect(screen.getAllByTestId('pie-chart')).toHaveLength(2);
    });

    it('should render mobile chart with correct styling', () => {
      const { container } = render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Mobile chart container should exist
      const mobileChart = container.querySelector('.md\\:hidden');
      expect(mobileChart).toBeInTheDocument();
    });

    it('should render desktop chart with correct styling', () => {
      const { container } = render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      // Desktop chart container should exist
      const desktopChart = container.querySelector('.hidden.md\\:block');
      expect(desktopChart).toBeInTheDocument();
    });
  });

  describe('Data Transformation', () => {
    it('should filter and sort chart data correctly', () => {
      render(<CategoryPieChart categories={mockCategories} tripCurrency="USD" />);

      const pieElements = screen.getAllByTestId('pie');
      const cells = pieElements[0].querySelectorAll('[data-testid^="pie-cell-"]');

      // Should be sorted by budget percentage descending
      expect(cells[0].textContent).toContain('Accommodation: 40%');
      expect(cells[1].textContent).toContain('Food: 35%');
      expect(cells[2].textContent).toContain('Transport: 25%');
    });

    it('should include category with spending but no budget', () => {
      const mixedCategories: CategoryWithStats[] = [
        {
          ...mockCategories[0],
          budget_percentage: 50,
          total_spent: 250,
        },
        {
          ...mockCategories[1],
          budget_percentage: 0,
          total_spent: 100, // Has spending
        },
      ];

      render(<CategoryPieChart categories={mixedCategories} tripCurrency="USD" />);

      // Both should be in chart
      const pieElements = screen.getAllByTestId('pie');
      const cells = pieElements[0].querySelectorAll('[data-testid^="pie-cell-"]');
      expect(cells).toHaveLength(2);
    });

    it('should calculate total percentage correctly', () => {
      const partialCategories: CategoryWithStats[] = [
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

      render(<CategoryPieChart categories={partialCategories} tripCurrency="USD" />);

      // Should show 50% allocated with 50% unallocated
      expect(screen.getByText((content, element) => {
        return element?.textContent === '50% of budget allocated across 2 categories';
      })).toBeInTheDocument();
    });
  });
});
