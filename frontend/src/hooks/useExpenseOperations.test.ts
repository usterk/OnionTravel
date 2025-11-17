import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExpenseOperations } from './useExpenseOperations';
import * as expensesApi from '@/lib/expenses-api';
import type { Expense } from '@/types/models';

// Mock the expenses API
vi.mock('@/lib/expenses-api', () => ({
  deleteExpense: vi.fn(),
}));

describe('useExpenseOperations', () => {
  const mockTripId = 1;
  const mockExpense: Expense = {
    id: 123,
    trip_id: mockTripId,
    category_id: 1,
    title: 'Test Expense',
    amount: 50,
    currency_code: 'USD',
    amount_in_trip_currency: 50,
    exchange_rate: 1,
    payment_method: 'cash',
    start_date: '2025-11-10',
    end_date: null,
    notes: 'Test notes',
    created_at: '2025-11-10T12:00:00Z',
    updated_at: '2025-11-10T12:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Expense Expansion', () => {
    it('should manage expanded expense ID', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      expect(result.current.expandedExpenseId).toBeNull();

      act(() => {
        result.current.setExpandedExpenseId(123);
      });

      expect(result.current.expandedExpenseId).toBe(123);

      act(() => {
        result.current.setExpandedExpenseId(null);
      });

      expect(result.current.expandedExpenseId).toBeNull();
    });
  });

  describe('Edit Expense', () => {
    it('should open edit dialog with expense', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      expect(result.current.isEditDialogOpen).toBe(false);
      expect(result.current.editingExpense).toBeNull();

      act(() => {
        result.current.openEditDialog(mockExpense);
      });

      expect(result.current.isEditDialogOpen).toBe(true);
      expect(result.current.editingExpense).toBe(mockExpense);
    });

    it('should close edit dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      act(() => {
        result.current.openEditDialog(mockExpense);
      });

      expect(result.current.isEditDialogOpen).toBe(true);

      act(() => {
        result.current.closeEditDialog();
      });

      expect(result.current.isEditDialogOpen).toBe(false);
      expect(result.current.editingExpense).toBeNull();
    });

    it('should handle edit success and call onSuccess', () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId, onSuccess })
      );

      act(() => {
        result.current.openEditDialog(mockExpense);
      });

      act(() => {
        result.current.handleEditSuccess();
      });

      expect(result.current.isEditDialogOpen).toBe(false);
      expect(result.current.editingExpense).toBeNull();
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('Delete Expense', () => {
    it('should open delete dialog with expense', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      expect(result.current.isDeleteDialogOpen).toBe(false);
      expect(result.current.deletingExpense).toBeNull();

      act(() => {
        result.current.openDeleteDialog(mockExpense);
      });

      expect(result.current.isDeleteDialogOpen).toBe(true);
      expect(result.current.deletingExpense).toBe(mockExpense);
    });

    it('should close delete dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      act(() => {
        result.current.openDeleteDialog(mockExpense);
      });

      expect(result.current.isDeleteDialogOpen).toBe(true);

      act(() => {
        result.current.closeDeleteDialog();
      });

      expect(result.current.isDeleteDialogOpen).toBe(false);
      expect(result.current.deletingExpense).toBeNull();
    });

    it('should confirm delete and call API', async () => {
      vi.mocked(expensesApi.deleteExpense).mockResolvedValue(undefined);
      const onSuccess = vi.fn();

      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId, onSuccess })
      );

      act(() => {
        result.current.openDeleteDialog(mockExpense);
      });

      expect(result.current.isDeleting).toBe(false);

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(expensesApi.deleteExpense).toHaveBeenCalledWith(mockTripId, mockExpense.id);
      expect(result.current.isDeleteDialogOpen).toBe(false);
      expect(result.current.deletingExpense).toBeNull();
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it('should handle delete error', async () => {
      vi.mocked(expensesApi.deleteExpense).mockRejectedValue(new Error('Delete failed'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      act(() => {
        result.current.openDeleteDialog(mockExpense);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      expect(alertSpy).toHaveBeenCalledWith('Failed to delete expense. Please try again.');
      expect(result.current.isDeleting).toBe(false);

      alertSpy.mockRestore();
    });

    it('should close expanded expense if deleted', async () => {
      vi.mocked(expensesApi.deleteExpense).mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      // Expand the expense
      act(() => {
        result.current.setExpandedExpenseId(mockExpense.id);
      });

      expect(result.current.expandedExpenseId).toBe(mockExpense.id);

      // Delete the expense
      act(() => {
        result.current.openDeleteDialog(mockExpense);
      });

      await act(async () => {
        await result.current.confirmDelete();
      });

      // Expanded ID should be cleared
      expect(result.current.expandedExpenseId).toBeNull();
    });
  });

  describe('Quick Add', () => {
    it('should open quick add dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      expect(result.current.isQuickAddDialogOpen).toBe(false);

      act(() => {
        result.current.openQuickAddDialog();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(true);
    });

    it('should close quick add dialog', () => {
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId })
      );

      act(() => {
        result.current.openQuickAddDialog();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(true);

      act(() => {
        result.current.closeQuickAddDialog();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(false);
    });

    it('should handle quick add success and call onSuccess', () => {
      const onSuccess = vi.fn();
      const { result } = renderHook(() =>
        useExpenseOperations({ tripId: mockTripId, onSuccess })
      );

      act(() => {
        result.current.openQuickAddDialog();
      });

      act(() => {
        result.current.handleQuickAddSuccess();
      });

      expect(result.current.isQuickAddDialogOpen).toBe(false);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
