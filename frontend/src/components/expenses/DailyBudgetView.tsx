import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Calendar, AlertTriangle, Plus } from 'lucide-react';
import { VoiceExpenseButton } from './VoiceExpenseButton';
import { QuickExpenseEntry } from './QuickExpenseEntry';
import { useDateNavigation } from './hooks/useDateNavigation';
import { useDailyBudgetData } from './hooks/useDailyBudgetData';
import { useExpenseOperations } from './hooks/useExpenseOperations';
import { DailyBudgetHeader } from './components/DailyBudgetHeader';
import { BudgetMetricsCard } from './components/BudgetMetricsCard';
import { ExpensesList } from './components/ExpensesList';
import { CategoryBreakdown } from './components/CategoryBreakdown';
import { BudgetDetailsCard } from './components/BudgetDetailsCard';
import { formatCurrency, formatDateString, getDateTitle } from './utils/formatters';
import { getStatusBadge } from './utils/budgetCalculations';

interface DailyBudgetViewProps {
  tripId: number;
  currencyCode: string;
  tripStartDate: string;
  tripEndDate: string;
}

export function DailyBudgetView({ tripId, currencyCode, tripStartDate, tripEndDate }: DailyBudgetViewProps) {
  // Custom hooks
  const dateNav = useDateNavigation({ tripStartDate, tripEndDate });
  const budgetData = useDailyBudgetData({ tripId, selectedDate: dateNav.selectedDate });
  const expenseOps = useExpenseOperations({
    tripId,
    onOperationSuccess: budgetData.refreshAll,
  });

  // Ref for scrolling to "Remaining Today" section
  const remainingTodayRef = useRef<HTMLDivElement>(null);

  /**
   * Refresh all data and scroll to "Remaining Today" section
   * Called after creating expense via voice input
   */
  const handleExpenseAdded = async () => {
    await budgetData.refreshAll();

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

  // Helper to format currency with trip currency code
  const formatCurrencyWithCode = (amount: number) => formatCurrency(amount, currencyCode);

  // Loading state
  if (budgetData.isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-gray-600">Loading daily budget...</p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (budgetData.error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-center text-red-600">{budgetData.error}</p>
        </CardContent>
      </Card>
    );
  }

  // No statistics
  if (!budgetData.statistics) {
    return null;
  }

  const { statistics, tripStatistics, dayExpenses, categories } = budgetData;

  // If no daily budget is set
  if (!statistics.daily_budget) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center text-lg md:text-2xl">
              <Calendar className="h-5 w-5 mr-2" />
              Daily Budget
            </CardTitle>
            <Badge variant="secondary">
              Day {statistics.days_into_trip} of {statistics.total_days}
            </Badge>
          </div>
          <CardDescription>{formatDateString(statistics.date)}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-3" />
            <p className="text-gray-600 mb-2">No daily budget set for this trip</p>
            <p className="text-sm text-gray-500">
              Spent today: {formatCurrencyWithCode(statistics.total_spent_today)} ({statistics.expense_count_today}{' '}
              expenses)
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusBadge = getStatusBadge(
    statistics.date,
    statistics.is_over_budget,
    statistics.percentage_used_today,
    statistics.expense_count_today
  );

  const dateTitle = getDateTitle(statistics.date);

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
            selectedDate={dateNav.selectedDate}
            tripStartDate={tripStartDate}
            tripEndDate={tripEndDate}
            daysIntoTrip={statistics.days_into_trip}
            totalDays={statistics.total_days}
            statusBadge={statusBadge}
            isAtTripStart={dateNav.isAtTripStart}
            isAtTripEnd={dateNav.isAtTripEnd}
            isTodayInTripRange={dateNav.isTodayInTripRange}
            isRefreshing={budgetData.isRefreshing}
            showHints={dateNav.showHints}
            onPreviousDay={() => dateNav.changeDay(-1)}
            onNextDay={() => dateNav.changeDay(1)}
            onDateChange={(date) => dateNav.setSelectedDate(date.toISOString().split('T')[0])}
            onTodayClick={dateNav.goToToday}
            onStartClick={dateNav.goToStart}
            onEndClick={dateNav.goToEnd}
          />

          {/* Main Metrics */}
          <BudgetMetricsCard
            ref={remainingTodayRef}
            remainingToday={statistics.remaining_today}
            cumulativeSavingsPast={statistics.cumulative_savings_past}
            totalSpentToday={statistics.total_spent_today}
            percentageUsedToday={statistics.percentage_used_today}
            expenseCountToday={statistics.expense_count_today}
            isOverBudget={statistics.is_over_budget}
            selectedDate={dateNav.selectedDate}
            currencyCode={currencyCode}
            formatCurrency={formatCurrencyWithCode}
          />

          {/* Expenses for the Day */}
          <ExpensesList
            dateTitle={dateTitle}
            dateString={statistics.date}
            expenses={dayExpenses}
            statistics={statistics}
            isLoading={budgetData.isLoadingExpenses}
            expandedExpenseId={expenseOps.expandedExpenseId}
            currencyCode={currencyCode}
            formatCurrency={formatCurrencyWithCode}
            onToggleExpand={expenseOps.setExpandedExpenseId}
            onEditExpense={expenseOps.handleEditExpense}
            onDeleteExpense={expenseOps.handleDeleteExpense}
          />

          {/* Category Breakdown */}
          {statistics.by_category_today && statistics.by_category_today.length > 0 && (
            <CategoryBreakdown
              categories={statistics.by_category_today}
              formatCurrency={formatCurrencyWithCode}
            />
          )}

          {/* Budget Details */}
          <BudgetDetailsCard
            statistics={statistics}
            tripStatistics={tripStatistics}
            selectedDate={dateNav.selectedDate}
            formatCurrency={formatCurrencyWithCode}
          />
        </motion.div>
      </AnimatePresence>

      {/* Quick Add Button (Floating Action Button) */}
      <button
        onClick={expenseOps.handleQuickAddOpen}
        className="fixed bottom-20 right-4 z-50 m-0 bg-green-600 hover:bg-green-700 active:bg-green-700 text-white rounded-full p-4 shadow-lg transition-colors duration-200 focus:outline-none"
        style={{ touchAction: 'manipulation', margin: 0 }}
        aria-label="Quick add expense"
        title="Dodaj wydatek"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Voice Expense Button (Floating Action Button) */}
      <VoiceExpenseButton tripId={tripId} currentDate={dateNav.selectedDate} onExpenseAdded={handleExpenseAdded} />

      {/* Edit Expense Dialog */}
      <Dialog open={expenseOps.isEditDialogOpen} onOpenChange={expenseOps.handleEditCancel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={expenseOps.handleEditCancel}>
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
                onCancel={expenseOps.handleEditCancel}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={expenseOps.isDeleteDialogOpen} onOpenChange={expenseOps.handleDeleteCancel}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader onClose={expenseOps.handleDeleteCancel}>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="space-y-4">
              <p className="text-gray-700">Are you sure you want to delete this expense?</p>
              {expenseOps.deletingExpense && (
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="font-medium text-gray-900">{expenseOps.deletingExpense.title}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatCurrencyWithCode(expenseOps.deletingExpense.amount_in_trip_currency)}
                  </p>
                </div>
              )}
              <p className="text-sm text-red-600">This action cannot be undone.</p>
            </div>
          </DialogBody>
          <DialogFooter className="justify-center gap-3">
            <Button
              variant="outline"
              onClick={expenseOps.handleDeleteCancel}
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
      <Dialog open={expenseOps.isQuickAddDialogOpen} onOpenChange={expenseOps.handleQuickAddCancel}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={expenseOps.handleQuickAddCancel}>
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
