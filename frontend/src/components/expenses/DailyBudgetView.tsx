import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceExpenseButton } from './VoiceExpenseButton';
import { QuickExpenseEntry } from './QuickExpenseEntry';
import { useDateNavigation } from '@/hooks/useDateNavigation';
import { useDailyBudgetData } from '@/hooks/useDailyBudgetData';
import { useExpenseOperations } from '@/hooks/useExpenseOperations';
import { DailyBudgetHeader } from './DailyBudgetHeader';
import { BudgetMetricsCard } from './BudgetMetricsCard';
import { ExpensesList } from './ExpensesList';
import { CategoryBreakdown } from './CategoryBreakdown';
import { BudgetDetails } from './BudgetDetails';
import { formatCurrency, formatDate } from '@/lib/budget-utils';

interface DailyBudgetViewProps {
  tripId: number;
  currencyCode: string;
  tripStartDate: string;
  tripEndDate: string;
}

/**
 * Daily Budget View Component (Refactored)
 *
 * This is now a lean "orchestrator" component that:
 * - Uses custom hooks for business logic
 * - Composes smaller UI components
 * - Manages dialogs and floating action buttons
 *
 * Business logic is extracted to:
 * - useDateNavigation: Date selection and navigation
 * - useDailyBudgetData: API data fetching
 * - useExpenseOperations: Edit/delete/add operations
 *
 * UI is extracted to:
 * - DailyBudgetHeader: Date navigation header
 * - BudgetMetricsCard: Main metrics display
 * - ExpensesList: Expenses section
 * - CategoryBreakdown: Category breakdown
 * - BudgetDetails: Budget details section
 */
export function DailyBudgetView({ tripId, currencyCode, tripStartDate, tripEndDate }: DailyBudgetViewProps) {
  // Ref for scrolling to "Remaining Today" section
  const remainingTodayRef = useRef<HTMLDivElement>(null);

  // Date navigation hook
  const dateNav = useDateNavigation({
    tripStartDate,
    tripEndDate,
  });

  // Data fetching hook
  const {
    statistics,
    tripStatistics,
    dayExpenses,
    categories,
    isLoading,
    isRefreshing,
    isLoadingExpenses,
    error,
    reloadAll,
  } = useDailyBudgetData({
    tripId,
    selectedDate: dateNav.selectedDate,
  });

  // Expense operations hook
  const expenseOps = useExpenseOperations({
    tripId,
    onSuccess: () => {
      reloadAll();
    },
  });

  /**
   * Refresh all data and scroll to "Remaining Today" section
   * Called after creating expense via voice input
   */
  const handleExpenseAdded = async () => {
    await reloadAll();

    // Scroll to "Remaining Today" section with offset for header
    if (remainingTodayRef.current) {
      const headerHeight = 64; // h-16 in Tailwind = 64px
      const elementPosition = remainingTodayRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-gray-600">Loading daily budget...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // No statistics loaded yet
  if (!statistics) {
    return null;
  }

  // No daily budget configured
  if (!statistics.daily_budget) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center py-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No daily budget set for this trip</p>
            <p className="text-sm text-gray-500">
              Spent today: {formatCurrency(statistics.total_spent_today, currencyCode)} (
              {statistics.expense_count_today} expenses)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main render - compose UI components
  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={dateNav.selectedDate}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="space-y-4 touch-pan-y"
          style={{ touchAction: 'pan-y' }}
          {...dateNav.swipeHandlers}
        >
          {/* Header with Date Navigation */}
          <DailyBudgetHeader
            statistics={statistics}
            selectedDate={dateNav.selectedDate}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            isAtTripStart={dateNav.isAtTripStart}
            isAtTripEnd={dateNav.isAtTripEnd}
            isTodayInTripRange={dateNav.isTodayInTripRange}
            isRefreshing={isRefreshing}
            showHints={dateNav.showHints}
            onChangeDay={dateNav.changeDay}
            onSetDate={dateNav.setSelectedDate}
            onGoToToday={dateNav.goToToday}
            onGoToStart={dateNav.goToStart}
            onGoToEnd={dateNav.goToEnd}
          />

          {/* Main Metrics */}
          <BudgetMetricsCard
            ref={remainingTodayRef}
            statistics={statistics}
            currencyCode={currencyCode}
          />

          {/* Expenses List */}
          <ExpensesList
            expenses={dayExpenses}
            statistics={statistics}
            currencyCode={currencyCode}
            isLoading={isLoadingExpenses}
            expandedExpenseId={expenseOps.expandedExpenseId}
            onToggleExpand={expenseOps.setExpandedExpenseId}
            onEdit={expenseOps.openEditDialog}
            onDelete={expenseOps.openDeleteDialog}
          />

          {/* Category Breakdown */}
          <CategoryBreakdown statistics={statistics} currencyCode={currencyCode} />

          {/* Budget Details */}
          <BudgetDetails
            statistics={statistics}
            tripStatistics={tripStatistics}
            currencyCode={currencyCode}
          />
        </motion.div>
      </AnimatePresence>

      {/* Quick Add Button (Floating Action Button) */}
      <button
        onClick={expenseOps.openQuickAddDialog}
        className="fixed bottom-20 right-4 z-50 m-0 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white rounded-full p-4 shadow-lg transition-colors duration-200 focus:outline-none"
        style={{ touchAction: 'manipulation', margin: 0 }}
        aria-label="Quick add expense"
        title="Dodaj wydatek"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Voice Expense Button (Floating Action Button) */}
      <VoiceExpenseButton
        tripId={tripId}
        currentDate={dateNav.selectedDate}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* Edit Expense Dialog */}
      <Dialog open={expenseOps.isEditDialogOpen} onOpenChange={expenseOps.closeEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={expenseOps.closeEditDialog}>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {expenseOps.editingExpense && (
              <QuickExpenseEntry
                tripId={tripId}
                tripCurrency={currencyCode}
                tripStartDate={tripStartDate}
                tripEndDate={tripEndDate}
                categories={categories}
                expense={expenseOps.editingExpense}
                onExpenseCreated={expenseOps.handleEditSuccess}
                onCancel={expenseOps.closeEditDialog}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={expenseOps.isDeleteDialogOpen} onOpenChange={expenseOps.closeDeleteDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader onClose={expenseOps.closeDeleteDialog}>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-gray-700">Are you sure you want to delete this expense?</p>
              {expenseOps.deletingExpense && (
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="font-medium text-gray-900">{expenseOps.deletingExpense.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(expenseOps.deletingExpense.amount_in_trip_currency, currencyCode)}
                  </p>
                </div>
              )}
              <p className="text-sm text-red-600">This action cannot be undone.</p>
            </div>
          </DialogBody>
          <DialogFooter className="justify-center gap-3">
            <Button
              variant="outline"
              onClick={expenseOps.closeDeleteDialog}
              disabled={expenseOps.isDeleting}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              onClick={expenseOps.handleDeleteConfirm}
              disabled={expenseOps.isDeleting}
              className="min-w-[120px] bg-red-600 hover:bg-red-700 text-white"
            >
              {expenseOps.isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Expense Dialog */}
      <Dialog open={expenseOps.isQuickAddDialogOpen} onOpenChange={expenseOps.closeQuickAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={expenseOps.closeQuickAddDialog}>
            <DialogTitle>Quick Add Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <QuickExpenseEntry
              tripId={tripId}
              tripCurrency={currencyCode}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              categories={categories}
              initialDate={dateNav.selectedDate}
              onExpenseCreated={expenseOps.handleQuickAddSuccess}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
