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
import { CategoryList, BudgetAllocation } from '@/components/categories';
import { QuickExpenseEntry, ExpenseList } from '@/components/expenses';
import { getCategoriesWithStats } from '@/lib/categories-api';
import { ArrowLeft, Calendar, DollarSign, Users, Settings as SettingsIcon, Trash2, Tag, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import type { TripUpdate, TripRole } from '@/types/trip';
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

  useEffect(() => {
    if (id) {
      loadTrip(parseInt(id));
    }
  }, [id]);

  const loadTrip = async (tripId: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const trip = await tripApi.getTrip(tripId);
      setCurrentTrip(trip);
      loadCategories(tripId);
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="outline"
            onClick={() => navigate('/trips')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{currentTrip.name}</h1>
              <p className="text-gray-600 mt-1">{currentTrip.description || 'No description'}</p>
            </div>
            <Badge variant="secondary">{currentTrip.currency_code}</Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="expenses">
              <Receipt className="h-4 w-4 mr-2" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="categories">
              <Tag className="h-4 w-4 mr-2" />
              Categories ({categories.length})
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members ({currentTrip.members.length})
            </TabsTrigger>
            <TabsTrigger value="settings">
              <SettingsIcon className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentTrip.total_budget ? (
                    <>
                      <p className="text-2xl font-bold">
                        {currentTrip.currency_code} {formatNumber(currentTrip.total_budget)}
                      </p>
                      {currentTrip.daily_budget && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {currentTrip.currency_code} {formatNumber(currentTrip.daily_budget)} per day
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">No budget set</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Trip Information</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <Badge>Active</Badge>
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
            <Card>
              <CardHeader>
                <CardTitle>Trip Members</CardTitle>
                <CardDescription>
                  People who have access to this trip
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {currentTrip.members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
                          {member.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{member.full_name || member.username}</p>
                          <p className="text-sm text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{member.role}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
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
      </main>

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
    </div>
  );
}
