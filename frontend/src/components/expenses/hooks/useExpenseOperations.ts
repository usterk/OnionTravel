import { useState, useCallback } from 'react';
import { deleteExpense } from '@/lib/expenses-api';
import type { Expense } from '@/types/models';

export interface UseExpenseOperationsProps {
  tripId: number;
  onOperationSuccess: () => void;
}

export interface UseExpenseOperationsReturn {
  // Edit state
  editingExpense: Expense | null;
  isEditDialogOpen: boolean;
  handleEditExpense: (expense: Expense) => void;
  handleEditSuccess: () => void;
  handleEditCancel: () => void;

  // Delete state
  deletingExpense: Expense | null;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  handleDeleteExpense: (expense: Expense) => void;
  handleDeleteConfirm: () => Promise<void>;
  handleDeleteCancel: () => void;

  // Quick add state
  isQuickAddDialogOpen: boolean;
  handleQuickAddOpen: () => void;
  handleQuickAddSuccess: () => void;
  handleQuickAddCancel: () => void;

  // Expanded expense
  expandedExpenseId: number | null;
  setExpandedExpenseId: (id: number | null) => void;
}

/**
 * Custom hook for managing expense CRUD operations
 * Handles edit, delete, and quick add dialogs
 */
export function useExpenseOperations({
  tripId,
  onOperationSuccess,
}: UseExpenseOperationsProps): UseExpenseOperationsReturn {
  // Edit expense state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Delete expense state
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick add state
  const [isQuickAddDialogOpen, setIsQuickAddDialogOpen] = useState(false);

  // Expanded expense ID
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  /**
   * Open edit dialog for expense
   */
  const handleEditExpense = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setIsEditDialogOpen(true);
  }, []);

  /**
   * Handle successful expense edit
   */
  const handleEditSuccess = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingExpense(null);
    onOperationSuccess();
  }, [onOperationSuccess]);

  /**
   * Cancel expense edit
   */
  const handleEditCancel = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingExpense(null);
  }, []);

  /**
   * Open delete confirmation dialog
   */
  const handleDeleteExpense = useCallback((expense: Expense) => {
    setDeletingExpense(expense);
    setIsDeleteDialogOpen(true);
  }, []);

  /**
   * Confirm and execute expense deletion
   */
  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    try {
      await deleteExpense(tripId, deletingExpense.id);
      // Close dialog
      setIsDeleteDialogOpen(false);
      setDeletingExpense(null);
      // Close the expanded view if this expense was expanded
      if (expandedExpenseId === deletingExpense.id) {
        setExpandedExpenseId(null);
      }
      onOperationSuccess();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingExpense, tripId, expandedExpenseId, onOperationSuccess]);

  /**
   * Cancel expense deletion
   */
  const handleDeleteCancel = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingExpense(null);
  }, []);

  /**
   * Open quick add dialog
   */
  const handleQuickAddOpen = useCallback(() => {
    setIsQuickAddDialogOpen(true);
  }, []);

  /**
   * Handle successful quick add
   */
  const handleQuickAddSuccess = useCallback(() => {
    setIsQuickAddDialogOpen(false);
    onOperationSuccess();
  }, [onOperationSuccess]);

  /**
   * Cancel quick add
   */
  const handleQuickAddCancel = useCallback(() => {
    setIsQuickAddDialogOpen(false);
  }, []);

  return {
    editingExpense,
    isEditDialogOpen,
    handleEditExpense,
    handleEditSuccess,
    handleEditCancel,
    deletingExpense,
    isDeleteDialogOpen,
    isDeleting,
    handleDeleteExpense,
    handleDeleteConfirm,
    handleDeleteCancel,
    isQuickAddDialogOpen,
    handleQuickAddOpen,
    handleQuickAddSuccess,
    handleQuickAddCancel,
    expandedExpenseId,
    setExpandedExpenseId,
  };
}
