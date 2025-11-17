import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExpenseOperations } from './useExpenseOperations';
import * as expensesApi from '@/lib/expenses-api';
import type { Expense } from '@/types/models';

// Mock the expenses API
vi.mock('@/lib/expenses-api', () => ({
  deleteExpense: vi.fn(),
}));

describe('useExpenseOperations', () => {
  const mockExpense: Expense = {
    id: 1,
    trip_id: 1,
    category_id: 1,
    title: 'Test Expense',
    amount: 50,
    currency_code: 'USD',
    amount_in_trip_currency: 50,
    exchange_rate: 1,
    payment_method: 'cash',
    start_date: '2025-11-10',
    end_date: null,
    notes: null,
    created_at: '2025-11-10T12:00:00Z',
    updated_at: '2025-11-10T12:00:00Z',
  };

  const onOperationSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Edit Operations', () => {
    it('should open edit dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleEditExpense(mockExpense);
      });

      expect(result.current.isEditDialogOpen).toBe(true);
      expect(result.current.editingExpense).toEqual(mockExpense);
    });

    it('should handle edit success', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleEditExpense(mockExpense);
      });

      act(() => {
        result.current.handleEditSuccess();
      });

      expect(result.current.isEditDialogOpen).toBe(false);
      expect(result.current.editingExpense).toBeNull();
      expect(onOperationSuccess).toHaveBeenCalledTimes(1);
    });

    it('should handle edit cancel', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleEditExpense(mockExpense);
      });

      act(() => {
        result.current.handleEditCancel();
      });

      expect(result.current.isEditDialogOpen).toBe(false);
      expect(result.current.editingExpense).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    it('should open delete dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleDeleteExpense(mockExpense);
      });

      expect(result.current.isDeleteDialogOpen).toBe(true);
      expect(result.current.deletingExpense).toEqual(mockExpense);
    });

    it('should handle delete confirm', async () => {
      vi.mocked(expensesApi.deleteExpense).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleDeleteExpense(mockExpense);
      });

      await act(async () => {
        await result.current.handleDeleteConfirm();
      });

      expect(expensesApi.deleteExpense).toHaveBeenCalledWith(1, 1);
      expect(result.current.isDeleteDialogOpen).toBe(false);
      expect(result.current.deletingExpense).toBeNull();
      expect(onOperationSuccess).toHaveBeenCalledTimes(1);
    });

    it('should handle delete error', async () => {
      // Mock global alert
      const originalAlert = global.alert;
      global.alert = vi.fn();

      vi.mocked(expensesApi.deleteExpense).mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleDeleteExpense(mockExpense);
      });

      await act(async () => {
        await result.current.handleDeleteConfirm();
      });

      expect(global.alert).toHaveBeenCalledWith('Failed to delete expense. Please try again.');
      expect(result.current.isDeleting).toBe(false);

      // Restore original alert
      global.alert = originalAlert;
    });

    it('should handle delete cancel', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleDeleteExpense(mockExpense);
      });

      act(() => {
        result.current.handleDeleteCancel();
      });

      expect(result.current.isDeleteDialogOpen).toBe(false);
      expect(result.current.deletingExpense).toBeNull();
    });

    it('should close expanded view when deleting expanded expense', async () => {
      vi.mocked(expensesApi.deleteExpense).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      // Expand the expense first
      act(() => {
        result.current.setExpandedExpenseId(1);
      });

      expect(result.current.expandedExpenseId).toBe(1);

      // Delete the expanded expense
      act(() => {
        result.current.handleDeleteExpense(mockExpense);
      });

      await act(async () => {
        await result.current.handleDeleteConfirm();
      });

      expect(result.current.expandedExpenseId).toBeNull();
    });
  });

  describe('Quick Add Operations', () => {
    it('should open quick add dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleQuickAddOpen();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(true);
    });

    it('should handle quick add success', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleQuickAddOpen();
      });

      act(() => {
        result.current.handleQuickAddSuccess();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(false);
      expect(onOperationSuccess).toHaveBeenCalledTimes(1);
    });

    it('should handle quick add cancel', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.handleQuickAddOpen();
      });

      act(() => {
        result.current.handleQuickAddCancel();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(false);
    });
  });

  describe('Expanded Expense', () => {
    it('should toggle expanded expense ID', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: 1, onOperationSuccess })
      );

      act(() => {
        result.current.setExpandedExpenseId(1);
      });

      expect(result.current.expandedExpenseId).toBe(1);

      act(() => {
        result.current.setExpandedExpenseId(null);
      });

      expect(result.current.expandedExpenseId).toBeNull();
    });
  });
});
