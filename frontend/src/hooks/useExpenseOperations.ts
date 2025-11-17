import { useState } from 'react';
import { deleteExpense } from '@/lib/expenses-api';
import type { Expense } from '@/types/models';

export interface UseExpenseOperationsOptions {
  tripId: number;
  onSuccess?: () => void;
}

export interface UseExpenseOperationsReturn {
  // Expense expansion state
  expandedExpenseId: number | null;
  setExpandedExpenseId: (id: number | null) => void;

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
  confirmDelete: () => Promise<void>;

  // Quick add state
  isQuickAddDialogOpen: boolean;
  openQuickAddDialog: () => void;
  closeQuickAddDialog: () => void;
  handleQuickAddSuccess: () => void;
}

/**
 * Custom hook for managing expense operations (edit, delete, quick add)
 * Handles dialog state and API calls for expense CRUD operations
 */
export function useExpenseOperations({
  tripId,
  onSuccess,
}: UseExpenseOperationsOptions): UseExpenseOperationsReturn {
  // Expanded expense IDs
  const [expandedExpenseId, setExpandedExpenseId] = useState<number | null>(null);

  // Edit expense dialog
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Delete expense confirmation
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Quick Add expense dialog
  const [isQuickAddDialogOpen, setIsQuickAddDialogOpen] = useState(false);

  /**
   * Open edit expense dialog
   */
  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setIsEditDialogOpen(true);
  };

  /**
   * Close edit expense dialog
   */
  const closeEditDialog = () => {
    setIsEditDialogOpen(false);
    setEditingExpense(null);
  };

  /**
   * Handle successful expense edit
   */
  const handleEditSuccess = () => {
    closeEditDialog();
    if (onSuccess) {
      onSuccess();
    }
  };

  /**
   * Open delete confirmation dialog
   */
  const openDeleteDialog = (expense: Expense) => {
    setDeletingExpense(expense);
    setIsDeleteDialogOpen(true);
  };

  /**
   * Close delete confirmation dialog
   */
  const closeDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setDeletingExpense(null);
  };

  /**
   * Confirm and execute expense deletion
   */
  const confirmDelete = async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    try {
      await deleteExpense(tripId, deletingExpense.id);

      // Close dialog
      setIsDeleteDialogOpen(false);

      // Close the expanded view if this expense was expanded
      if (expandedExpenseId === deletingExpense.id) {
        setExpandedExpenseId(null);
      }

      setDeletingExpense(null);

      // Notify success
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      alert('Failed to delete expense. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Open quick add dialog
   */
  const openQuickAddDialog = () => {
    setIsQuickAddDialogOpen(true);
  };

  /**
   * Close quick add dialog
   */
  const closeQuickAddDialog = () => {
    setIsQuickAddDialogOpen(false);
  };

  /**
   * Handle successful quick add
   */
  const handleQuickAddSuccess = () => {
    closeQuickAddDialog();
    if (onSuccess) {
      onSuccess();
    }
  };

  return {
    // Expansion state
    expandedExpenseId,
    setExpandedExpenseId,

    // Edit expense
    editingExpense,
    isEditDialogOpen,
    openEditDialog,
    closeEditDialog,
    handleEditSuccess,

    // Delete expense
    deletingExpense,
    isDeleteDialogOpen,
    isDeleting,
    openDeleteDialog,
    closeDeleteDialog,
    confirmDelete,

    // Quick add
    isQuickAddDialogOpen,
    openQuickAddDialog,
    closeQuickAddDialog,
    handleQuickAddSuccess,
  };
}
