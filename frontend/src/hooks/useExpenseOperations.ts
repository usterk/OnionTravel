import { useState, useCallback } from 'react';
import { deleteExpense } from '@/lib/expenses-api';
import type { Expense } from '@/types/models';

export interface UseExpenseOperationsOptions {
  tripId: number;
  onSuccess?: () => void;
}

export interface UseExpenseOperationsReturn {
  // Edit expense state
  editingExpense: Expense | null;
  isEditDialogOpen: boolean;
  openEditDialog: (expense: Expense) => void;
  closeEditDialog: () => void;
  handleEditSuccess: () => void;

  // Delete expense state
  deletingExpense: Expense | null;
  isDeleteDialogOpen: boolean;
  isDeleting: boolean;
  openDeleteDialog: (expense: Expense) => void;
  closeDeleteDialog: () => void;
  handleDeleteConfirm: () => Promise<void>;

  // Quick add expense state
  isQuickAddDialogOpen: boolean;
  openQuickAddDialog: () => void;
  closeQuickAddDialog: () => void;
  handleQuickAddSuccess: () => void;

  // Expanded expense state
  expandedExpenseId: number | null;
  setExpandedExpenseId: (id: number | null) => void;
}

/**
 * Custom hook for managing expense operations (edit, delete, add)
 *
 * Handles:
 * - Edit expense dialog state and callbacks
 * - Delete expense dialog state and deletion logic
 * - Quick add expense dialog state
 * - Expanded expense state for list items
 * - Success callbacks for data reloading
 */
export function useExpenseOperations({
  tripId,
  onSuccess,
}: UseExpenseOperationsOptions): UseExpenseOperationsReturn {
  // Edit expense
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const openEditDialog = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setIsEditDialogOpen(true);
  }, []);

  const closeEditDialog = useCallback(() => {
    setIsEditDialogOpen(false);
    setEditingExpense(null);
  }, []);

  const handleEditSuccess = useCallback(() => {
    closeEditDialog();
    onSuccess?.();
  }, [closeEditDialog, onSuccess]);

  // Delete expense
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const openDeleteDialog = useCallback((expense: Expense) => {
    setDeletingExpense(expense);
    setIsDeleteDialogOpen(true);
  }, []);

  const closeDeleteDialog = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingExpense(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    try {
      await deleteExpense(tripId, deletingExpense.id);
      closeDeleteDialog();
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingExpense, tripId, closeDeleteDialog, onSuccess]);

  // Quick add expense
  const [isQuickAddDialogOpen, setIsQuickAddDialogOpen] = useState(false);

  const openQuickAddDialog = useCallback(() => {
    setIsQuickAddDialogOpen(true);
  }, []);

  const closeQuickAddDialog = useCallback(() => {
    setIsQuickAddDialogOpen(false);
  }, []);

  const handleQuickAddSuccess = useCallback(() => {
    closeQuickAddDialog();
    onSuccess?.();
  }, [closeQuickAddDialog, onSuccess]);

  // Expanded expense
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  return {
    editingExpense,
    isEditDialogOpen,
    openEditDialog,
    closeEditDialog,
    handleEditSuccess,
    deletingExpense,
    isDeleteDialogOpen,
    isDeleting,
    openDeleteDialog,
    closeDeleteDialog,
    handleDeleteConfirm,
    isQuickAddDialogOpen,
    openQuickAddDialog,
    closeQuickAddDialog,
    handleQuickAddSuccess,
    expandedExpenseId,
    setExpandedExpenseId,
  };
}
