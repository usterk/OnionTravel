import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Plus } from 'lucide-react';
import { VoiceExpenseButton } from './VoiceExpenseButton';
import { QuickExpenseEntry } from './QuickExpenseEntry';
import { DailyBudgetHeader } from './DailyBudgetHeader';
import { BudgetMetricsCard } from './BudgetMetricsCard';
import { ExpenseListCard } from './ExpenseListCard';
import { CategoryBreakdownCard } from './CategoryBreakdownCard';
import { BudgetDetailsCard } from './BudgetDetailsCard';
import { useDateNavigation } from '@/hooks/useDateNavigation';
import { useDailyBudgetData } from '@/hooks/useDailyBudgetData';
import { useExpenseOperations } from '@/hooks/useExpenseOperations';
import { formatCurrency, formatDate } from '@/lib/daily-budget-utils';

interface DailyBudgetViewProps {
  tripId: number;
  currencyCode: string;
  tripStartDate: string;
  tripEndDate: string;
}

export function DailyBudgetView({ tripId, currencyCode, tripStartDate, tripEndDate }: DailyBudgetViewProps) {
  // Category breakdown collapse state (default: collapsed)
  const [showCategoryBreakdown, setShowCategoryBreakdown] = useState(false);

  // Expenses collapse state (default: expanded)
  const [showExpenses, setShowExpenses] = useState(true);

  // Ref for scrolling to "Remaining Today" section
  const remainingTodayRef = useRef<HTMLDivElement>(null);

  // Date navigation hook
  const {
    selectedDate,
    setSelectedDate,
    swipeDirection,
    showHints,
    isAtTripStart,
    isAtTripEnd,
    isTodayInTripRange,
    changeDay,
    goToToday,
    goToStart,
    goToEnd,
    swipeHandlers,
  } = useDateNavigation({ tripStartDate, tripEndDate });

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
    refreshAll,
  } = useDailyBudgetData({ tripId, selectedDate });

  // Expense operations hook
  const {
    expandedExpenseId,
    setExpandedExpenseId,
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
    confirmDelete,
    isQuickAddDialogOpen,
    openQuickAddDialog,
    closeQuickAddDialog,
    handleQuickAddSuccess,
  } = useExpenseOperations({ tripId, onSuccess: refreshAll });

  /**
   * Refresh all data and scroll to "Remaining Today" section
   * Called after creating expense via voice input
   */
  const handleExpenseAdded = async () => {
    // Reload statistics and expenses
    await refreshAll();

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

  // No statistics loaded
  if (!statistics) {
    return null;
  }

  // No daily budget set
  if (!statistics.daily_budget) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg md:text-2xl">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Daily Budget
            </CardTitle>
            <Badge variant="secondary">
              Day {statistics.days_into_trip} of {statistics.total_days}
            </Badge>
          </div>
          <CardDescription>{formatDate(statistics.date)}</CardDescription>
        </CardHeader>
        <CardContent>
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

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDate}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="space-y-4 touch-pan-y"
          style={{ touchAction: 'pan-y' }}
          {...swipeHandlers}
        >
          {/* Header with Date Navigation */}
          <DailyBudgetHeader
            statistics={statistics}
            selectedDate={selectedDate}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            isAtTripStart={isAtTripStart}
            isAtTripEnd={isAtTripEnd}
            isTodayInTripRange={isTodayInTripRange}
            isRefreshing={isRefreshing}
            showHints={showHints}
            onChangeDay={changeDay}
            onDateSelect={setSelectedDate}
            onGoToToday={goToToday}
            onGoToStart={goToStart}
            onGoToEnd={goToEnd}
          />

          {/* Main Metrics */}
          <BudgetMetricsCard
            ref={remainingTodayRef}
            statistics={statistics}
            currencyCode={currencyCode}
            selectedDate={selectedDate}
          />

          {/* Expenses for the Day */}
          <ExpenseListCard
            statistics={statistics}
            dayExpenses={dayExpenses}
            currencyCode={currencyCode}
            isLoadingExpenses={isLoadingExpenses}
            showExpenses={showExpenses}
            expandedExpenseId={expandedExpenseId}
            onToggleExpenses={() => setShowExpenses(!showExpenses)}
            onToggleExpand={(id) => setExpandedExpenseId(expandedExpenseId === id ? null : id)}
            onEdit={openEditDialog}
            onDelete={openDeleteDialog}
          />

          {/* Category Breakdown */}
          <CategoryBreakdownCard
            statistics={statistics}
            currencyCode={currencyCode}
            showCategoryBreakdown={showCategoryBreakdown}
            onToggle={() => setShowCategoryBreakdown(!showCategoryBreakdown)}
          />

          {/* Budget Details */}
          <BudgetDetailsCard
            statistics={statistics}
            tripStatistics={tripStatistics}
            currencyCode={currencyCode}
            selectedDate={selectedDate}
          />
        </motion.div>
      </AnimatePresence>

      {/* Quick Add Button (Floating Action Button) */}
      <button
        onClick={openQuickAddDialog}
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
        currentDate={selectedDate}
        onExpenseAdded={handleExpenseAdded}
      />

      {/* Edit Expense Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={closeEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={closeEditDialog}>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            {editingExpense && (
              <QuickExpenseEntry
                tripId={tripId}
                tripCurrency={currencyCode}
                tripStartDate={tripStartDate}
                tripEndDate={tripEndDate}
                categories={categories}
                expense={editingExpense}
                onExpenseCreated={handleEditSuccess}
                onCancel={closeEditDialog}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={closeDeleteDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader onClose={closeDeleteDialog}>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-gray-700">Are you sure you want to delete this expense?</p>
              {deletingExpense && (
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="font-medium text-gray-900">{deletingExpense.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrency(deletingExpense.amount_in_trip_currency, currencyCode)}
                  </p>
                </div>
              )}
              <p className="text-sm text-red-600">This action cannot be undone.</p>
            </div>
          </DialogBody>
          <DialogFooter className="justify-center gap-3">
            <Button
              variant="outline"
              onClick={closeDeleteDialog}
              disabled={isDeleting}
              className="min-w-[120px]"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="min-w-[120px] bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Expense Dialog */}
      <Dialog open={isQuickAddDialogOpen} onOpenChange={closeQuickAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={closeQuickAddDialog}>
            <DialogTitle>Quick Add Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <QuickExpenseEntry
              tripId={tripId}
              tripCurrency={currencyCode}
              tripStartDate={tripStartDate}
              tripEndDate={tripEndDate}
              categories={categories}
              initialDate={selectedDate}
              onExpenseCreated={handleQuickAddSuccess}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
