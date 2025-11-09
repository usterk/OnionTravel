import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { ExpenseCard } from './ExpenseCard';
import { ExpenseForm } from './ExpenseForm';
import { getExpenses, deleteExpense } from '@/lib/expenses-api';
import { Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Expense, Category } from '@/types/models';
import type { ExpenseFilters } from '@/lib/expenses-api';

interface ExpenseListProps {
  tripId: number;
  tripCurrency: string;
  categories: Category[];
  onExpenseUpdated?: () => void;
  autoRefresh?: boolean;
}

const ITEMS_PER_PAGE = 10;
const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Mobile Payment', 'Other'];

export function ExpenseList({
  tripId,
  tripCurrency,
  categories,
  onExpenseUpdated,
  autoRefresh = false,
}: ExpenseListProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({
    limit: ITEMS_PER_PAGE,
    skip: 0,
  });
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Dialog state
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load expenses
  useEffect(() => {
    loadExpenses();
  }, [tripId, filters]);

  const loadExpenses = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getExpenses(tripId, filters);
      setExpenses(data);
      setHasMore(data.length === ITEMS_PER_PAGE);
    } catch (err: any) {
      console.error('Failed to load expenses:', err);
      setError(err.response?.data?.detail || 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyFilters = () => {
    setCurrentPage(1);
    setFilters({
      category_id: categoryFilter ? parseInt(categoryFilter) : undefined,
      payment_method: paymentMethodFilter || undefined,
      start_date: startDateFilter || undefined,
      end_date: endDateFilter || undefined,
      skip: 0,
      limit: ITEMS_PER_PAGE,
    });
  };

  const handleClearFilters = () => {
    setCategoryFilter('');
    setPaymentMethodFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCurrentPage(1);
    setFilters({
      skip: 0,
      limit: ITEMS_PER_PAGE,
    });
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    setFilters((prev) => ({
      ...prev,
      skip: (newPage - 1) * ITEMS_PER_PAGE,
    }));
  };

  const handleDelete = async () => {
    if (!deletingExpense) return;

    setIsDeleting(true);
    try {
      await deleteExpense(tripId, deletingExpense.id);
      setDeletingExpense(null);
      loadExpenses();
      onExpenseUpdated?.();
    } catch (err: any) {
      console.error('Failed to delete expense:', err);
      alert(err.response?.data?.detail || 'Failed to delete expense. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExpenseUpdated = () => {
    setEditingExpense(null);
    loadExpenses();
    onExpenseUpdated?.();
  };

  const activeFilterCount = [
    categoryFilter,
    paymentMethodFilter,
    startDateFilter,
    endDateFilter,
  ].filter(Boolean).length;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Expenses ({expenses.length})</CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Filter */}
                <div>
                  <Label htmlFor="category-filter">Category</Label>
                  <Select
                    id="category-filter"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">All categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Payment Method Filter */}
                <div>
                  <Label htmlFor="payment-filter">Payment Method</Label>
                  <Select
                    id="payment-filter"
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  >
                    <option value="">All payment methods</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Start Date Filter */}
                <div>
                  <Label htmlFor="start-date-filter">From Date</Label>
                  <Input
                    id="start-date-filter"
                    type="date"
                    value={startDateFilter}
                    onChange={(e) => setStartDateFilter(e.target.value)}
                  />
                </div>

                {/* End Date Filter */}
                <div>
                  <Label htmlFor="end-date-filter">To Date</Label>
                  <Input
                    id="end-date-filter"
                    type="date"
                    value={endDateFilter}
                    onChange={(e) => setEndDateFilter(e.target.value)}
                  />
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2">
                <Button onClick={handleApplyFilters} size="sm">
                  Apply Filters
                </Button>
                <Button onClick={handleClearFilters} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading expenses...</p>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && expenses.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No expenses found.</p>
              {activeFilterCount > 0 ? (
                <p className="text-sm mt-1">Try adjusting your filters.</p>
              ) : (
                <p className="text-sm mt-1">Add your first expense to get started.</p>
              )}
            </div>
          )}

          {/* Expense List */}
          {!isLoading && expenses.length > 0 && (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  tripCurrency={tripCurrency}
                  onEdit={setEditingExpense}
                  onDelete={setDeletingExpense}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && expenses.length > 0 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Page {currentPage} {hasMore && '(more available)'}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader onClose={() => setEditingExpense(null)}>
            <DialogTitle>Edit Expense</DialogTitle>
            <DialogDescription>Update the expense details.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {editingExpense && (
              <ExpenseForm
                tripId={tripId}
                tripCurrency={tripCurrency}
                categories={categories}
                expense={editingExpense}
                onSuccess={handleExpenseUpdated}
                onCancel={() => setEditingExpense(null)}
              />
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingExpense}
        onOpenChange={(open) => !open && setDeletingExpense(null)}
      >
        <DialogContent>
          <DialogHeader onClose={() => setDeletingExpense(null)}>
            <DialogTitle>Delete Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {deletingExpense && (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>Title:</strong> {deletingExpense.title}
                </p>
                <p className="text-sm">
                  <strong>Amount:</strong> {deletingExpense.currency_code}{' '}
                  {deletingExpense.amount.toFixed(2)}
                </p>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingExpense(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
