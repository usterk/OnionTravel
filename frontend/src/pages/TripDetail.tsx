import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { tripApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { TripForm } from '@/components/trips/TripForm';
import { CategoryList, BudgetAllocation, CategoryPieChart } from '@/components/categories';
import { QuickExpenseEntry, ExpenseList } from '@/components/expenses';
import { BudgetOverviewCards } from '@/components/trip/BudgetOverviewCards';
import { TripMembers } from '@/components/trip/TripMembers';
import { getCategoriesWithStats } from '@/lib/categories-api';
import { getExpenseStatistics } from '@/lib/expenses-api';
import type { ExpenseStatistics } from '@/lib/expenses-api';
import { ArrowLeft, Calendar, DollarSign, Users, Settings as SettingsIcon, Trash2, Tag, Receipt, Info } from 'lucide-react';
import { format } from 'date-fns';
import type { TripUpdate, TripRole } from '@/types/trip';
import { getTripStatus } from '@/lib/tripUtils';
import type { CategoryWithStats, Category } from '@/types/models';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentTrip, setCurrentTrip, updateTrip, removeTrip } = useTripStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [plainCategories, setPlainCategories] = useState<Category[]>([]);
  const [expensesRefreshKey, setExpensesRefreshKey] = useState(0);
  const [statistics, setStatistics] = useState<ExpenseStatistics | null>(null);

  useEffect(() => {
    if (id) {
      loadTrip(parseInt(id));
    }
  }, [id]);

  // Refresh statistics when expenses change
  useEffect(() => {
    if (currentTrip && expensesRefreshKey > 0) {
      loadStatistics(currentTrip.id);
      loadCategories(currentTrip.id);
    }
  }, [expensesRefreshKey]);

  const loadTrip = async (tripId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const trip = await tripApi.getTrip(tripId);
      setCurrentTrip(trip);
      loadCategories(tripId);
      loadStatistics(tripId);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load trip');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async (tripId: number) => {
    try {
      const { getCategoriesWithStats, getCategories } = await import('@/lib/categories-api');
      const [categoriesData, plainCategoriesData] = await Promise.all([
        getCategoriesWithStats(tripId),
        getCategories(tripId),
      ]);
      setCategories(categoriesData);
      setPlainCategories(plainCategoriesData);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadStatistics = async (tripId: number) => {
    try {
      const stats = await getExpenseStatistics(tripId);
      setStatistics(stats);
    } catch (err: any) {
      console.error('Failed to load statistics:', err);
    }
  };

  const handleUpdate = async (data: TripUpdate) => {
    if (!currentTrip) return;

    setIsLoading(true);
    setError(null);

    try {
      const updated = await tripApi.updateTrip(currentTrip.id, data);
      updateTrip(currentTrip.id, updated);
      setCurrentTrip({ ...currentTrip, ...updated });
      setIsEditDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update trip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTrip) return;

    setIsLoading(true);
    setError(null);

    try {
      await tripApi.deleteTrip(currentTrip.id);
      removeTrip(currentTrip.id);
      navigate('/trips');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete trip');
      setIsLoading(false);
    }
  };

  const getUserRole = (): TripRole | null => {
    if (!currentTrip || !user) return null;
    const member = currentTrip.members.find((m) => m.user_id === user.id);
    return member?.role || null;
  };

  const canEdit = () => {
    const role = getUserRole();
    return role === 'owner' || role === 'admin';
  };

  const canDelete = () => {
    const role = getUserRole();
    return role === 'owner';
  };

  if (isLoading && !currentTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading trip...</p>
      </div>
    );
  }

  if (error && !currentTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={() => navigate('/trips')}>Back to Trips</Button>
        </div>
      </div>
    );
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Trip not found</p>
          <Button onClick={() => navigate('/trips')}>Back to Trips</Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getDuration = () => {
    try {
      const start = new Date(currentTrip.start_date);
      const end = new Date(currentTrip.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return days;
    } catch {
      return 0;
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="mb-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{currentTrip.name}</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 break-words">{currentTrip.description || 'No description'}</p>
            </div>
            <Badge variant="secondary" className="self-start">{currentTrip.currency_code}</Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="overview" className="text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2">
              <Tag className="h-4 w-4" />
              <span className="hidden sm:inline">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2">
              <SettingsIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            {/* Budget Overview Cards */}
            <BudgetOverviewCards
              statistics={statistics}
              totalBudget={currentTrip.total_budget || 0}
              currencyCode={currentTrip.currency_code}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{getDuration()} days</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {formatDate(currentTrip.start_date)} - {formatDate(currentTrip.end_date)}
                  </p>
                  {currentTrip.daily_budget && (
                    <p className="text-sm text-gray-600 mt-3">
                      <span className="font-medium">Daily budget:</span> {currentTrip.currency_code} {formatNumber(currentTrip.daily_budget)}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Trip Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1">
                        <Badge style={getTripStatus(currentTrip).style}>
                          {getTripStatus(currentTrip).label}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Your Role</dt>
                      <dd className="mt-1">
                        <Badge variant="outline">{getUserRole()}</Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatDate(currentTrip.created_at)}
                      </dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <div className="space-y-6">
              {/* Quick Expense Entry */}
              <QuickExpenseEntry
                tripId={currentTrip.id}
                tripCurrency={currentTrip.currency_code}
                categories={plainCategories}
                onExpenseCreated={() => {
                  loadCategories(currentTrip.id);
                  setExpensesRefreshKey((prev) => prev + 1);
                }}
              />

              {/* Expense List */}
              <ExpenseList
                key={expensesRefreshKey}
                tripId={currentTrip.id}
                tripCurrency={currentTrip.currency_code}
                categories={plainCategories}
                onExpenseUpdated={() => {
                  loadCategories(currentTrip.id);
                  setExpensesRefreshKey((prev) => prev + 1);
                }}
              />
            </div>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <div className="space-y-6">
              {/* Pie Chart */}
              <CategoryPieChart
                categories={categories}
                tripCurrency={currentTrip.currency_code}
              />

              {/* Budget Allocation Visualization */}
              <BudgetAllocation
                categories={categories}
                tripCurrency={currentTrip.currency_code}
                totalBudget={currentTrip.total_budget}
              />

              {/* Category List */}
              <CategoryList
                categories={categories}
                tripId={currentTrip.id}
                onCategoryUpdated={() => loadCategories(currentTrip.id)}
                showStats={true}
              />
            </div>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members">
            <TripMembers
              tripId={currentTrip.id}
              members={currentTrip.members}
              ownerId={currentTrip.owner_id}
              onMembersUpdated={() => loadTrip(currentTrip.id)}
            />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Trip Settings</CardTitle>
                <CardDescription>
                  Manage your trip settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {canEdit() && (
                  <div>
                    <h3 className="font-medium mb-2">Edit Trip</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Update trip name, dates, budget, and other details
                    </p>
                    <Button onClick={() => setIsEditDialogOpen(true)}>
                      Edit Trip Details
                    </Button>
                  </div>
                )}

                {canDelete() && (
                  <div className="pt-4 border-t">
                    <h3 className="font-medium mb-2 text-red-600">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Delete this trip permanently. This action cannot be undone.
                    </p>
                    <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Trip
                    </Button>
                  </div>
                )}

                {!canEdit() && !canDelete() && (
                  <p className="text-muted-foreground">
                    You don't have permission to modify this trip.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setIsEditDialogOpen(false)}>
            <DialogTitle>Edit Trip</DialogTitle>
            <DialogDescription>Update your trip details</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <TripForm
              initialData={currentTrip}
              onSubmit={handleUpdate}
              onCancel={() => setIsEditDialogOpen(false)}
              isLoading={isLoading}
              submitLabel="Save Changes"
            />
          </DialogBody>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader onClose={() => setIsDeleteDialogOpen(false)}>
            <DialogTitle>Delete Trip</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this trip? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm text-gray-600">
              Trip: <strong>{currentTrip.name}</strong>
            </p>
          </DialogBody>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading ? 'Deleting...' : 'Delete Trip'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
