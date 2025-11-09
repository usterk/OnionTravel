import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { tripApi } from '@/lib/api';
import { getExpenseStatistics } from '@/lib/expenses-api';
import type { ExpenseStatistics } from '@/lib/expenses-api';
import { formatNumber } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, CreditCard, Tag } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { trips, setTrips } = useTripStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<typeof trips[0] | null>(null);
  const [statistics, setStatistics] = useState<ExpenseStatistics | null>(null);

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedTrip) {
      loadStatistics(selectedTrip.id);
    }
  }, [selectedTrip]);

  const getTripStatus = (trip: typeof trips[0]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today >= startDate && today <= endDate) {
      return 'active';
    } else if (today < startDate) {
      return 'upcoming';
    } else {
      return 'completed';
    }
  };

  const sortTrips = (tripsData: typeof trips) => {
    return [...tripsData].sort((a, b) => {
      const statusA = getTripStatus(a);
      const statusB = getTripStatus(b);

      // Priority order: active > upcoming > completed
      const statusPriority = { active: 0, upcoming: 1, completed: 2 };

      if (statusA !== statusB) {
        return statusPriority[statusA] - statusPriority[statusB];
      }

      // Within same status, sort by date
      if (statusA === 'active' || statusA === 'upcoming') {
        // Sort by start_date ascending (nearest first)
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      } else {
        // For completed, sort by end_date descending (most recent first)
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      }
    });
  };

  const loadTrips = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await tripApi.getTrips();
      const sortedTrips = sortTrips(data);
      setTrips(sortedTrips);

      // If there's at least one trip and no trip selected, select the best match
      if (sortedTrips.length > 0 && !selectedTrip) {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison

        // Find currently active trip (today is between start_date and end_date)
        const activeTrip = sortedTrips.find((trip) => {
          const startDate = new Date(trip.start_date);
          const endDate = new Date(trip.end_date);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          return today >= startDate && today <= endDate;
        });

        if (activeTrip) {
          setSelectedTrip(activeTrip);
        } else {
          // If no active trip, find the nearest upcoming trip
          const upcomingTrips = sortedTrips.filter((trip) => {
            const startDate = new Date(trip.start_date);
            startDate.setHours(0, 0, 0, 0);
            return startDate > today;
          }).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

          if (upcomingTrips.length > 0) {
            setSelectedTrip(upcomingTrips[0]);
          } else {
            // If no upcoming trips, select the most recent past trip
            const pastTrips = sortedTrips.sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime());
            setSelectedTrip(pastTrips[0]);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load trips');
    } finally {
      setIsLoading(false);
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

  const handleTripChange = (tripId: number) => {
    const trip = trips.find(t => t.id === tripId);
    if (trip) {
      setSelectedTrip(trip);
    }
  };

  const formatCurrency = (amount: number | string | undefined | null) => {
    const value = Number(amount ?? 0);
    if (!selectedTrip) return formatNumber(value);
    return `${formatNumber(value)} ${selectedTrip.currency_code}`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBudgetStatusIcon = () => {
    if (!statistics) return null;
    if (statistics.percentage_used >= 100) {
      return <TrendingDown className="h-5 w-5 text-red-500" />;
    }
    return <TrendingUp className="h-5 w-5 text-green-500" />;
  };

  return (
    <>
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Trip Selector */}
        {trips && trips.length > 0 && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Trip
            </label>
            <div className="flex items-center gap-3">
              <select
                value={selectedTrip?.id || ''}
                onChange={(e) => handleTripChange(parseInt(e.target.value))}
                className="flex h-10 w-full max-w-md rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.name}
                  </option>
                ))}
              </select>
              <Button onClick={() => navigate('/trips/new')} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        )}

        {/* Empty State - No Trips */}
        {!isLoading && (!trips || trips.length === 0) && (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to OnionTravel!</h2>
            <p className="text-gray-600 mb-6">Create your first trip to start tracking your budget</p>
            <Button onClick={() => navigate('/trips/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Trip
            </Button>
          </div>
        )}

        {/* Dashboard Content */}
        {!isLoading && selectedTrip && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">{selectedTrip.name}</h2>
                <p className="text-gray-600 mt-1">Budget Dashboard</p>
              </div>
              <Button onClick={() => navigate(`/trips/${selectedTrip.id}`)}>
                View Trip Details
              </Button>
            </div>

            {/* Budget Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Budget */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Budget</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatCurrency(statistics?.total_budget || selectedTrip.total_budget || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1" />
                    <span>Allocated for trip</span>
                  </div>
                </CardContent>
              </Card>

              {/* Total Spent */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Spent</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatCurrency(statistics?.total_spent || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-600">
                    <CreditCard className="h-4 w-4 mr-1" />
                    <span>{statistics?.total_expenses || 0} expenses</span>
                  </div>
                </CardContent>
              </Card>

              {/* Remaining Budget */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Remaining</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatCurrency(statistics?.remaining_budget || selectedTrip.total_budget || 0)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm">
                    {getBudgetStatusIcon()}
                    <span className={`ml-1 ${
                      statistics && statistics.percentage_used >= 100 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {statistics && statistics.percentage_used >= 100 ? 'Over budget!' : 'Available'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Budget Usage */}
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Budget Used</CardDescription>
                  <CardTitle className="text-3xl">
                    {formatNumber(statistics?.percentage_used || 0, 1)}%
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Of total budget</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Progress Bar */}
            {statistics && (
              <Card>
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                  <CardDescription>
                    {formatNumber(statistics.percentage_used, 1)}% of budget used
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${getProgressColor(statistics.percentage_used)}`}
                      style={{ width: `${Math.min(statistics.percentage_used, 100)}%` }}
                    />
                  </div>
                  {statistics.percentage_used >= 100 && (
                    <p className="text-sm text-red-600 mt-2 font-medium">
                      You have exceeded your budget by {formatCurrency(Math.abs(statistics.remaining_budget))}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Category Breakdown */}
            {statistics && statistics.by_category && statistics.by_category.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Tag className="h-5 w-5 mr-2" />
                    Spending by Category
                  </CardTitle>
                  <CardDescription>
                    Breakdown of expenses across categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statistics.by_category.map((category) => {
                      const percentage = statistics.total_spent > 0
                        ? (category.total_spent / statistics.total_spent) * 100
                        : 0;
                      return (
                        <div key={category.category_id}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{category.category_name}</span>
                            <span className="text-sm text-gray-600">
                              {formatCurrency(category.total_spent)} ({formatNumber(percentage, 1)}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Method Breakdown */}
            {statistics && statistics.by_payment_method && statistics.by_payment_method.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Spending by Payment Method
                  </CardTitle>
                  <CardDescription>
                    How you've been paying for expenses
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {statistics.by_payment_method.map((method, index) => (
                      <div
                        key={index}
                        className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm text-gray-600 mb-1">
                          {method.payment_method || 'Unknown'}
                        </div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(method.total_spent)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Daily Average */}
            {statistics && statistics.average_daily_spending > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Daily Average
                  </CardTitle>
                  <CardDescription>
                    Average spending per day
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(statistics.average_daily_spending)}
                  </div>
                  {selectedTrip.daily_budget && (
                    <p className="text-sm text-gray-600 mt-2">
                      Daily budget: {formatCurrency(selectedTrip.daily_budget)}
                      {statistics.average_daily_spending > selectedTrip.daily_budget && (
                        <span className="text-red-600 ml-2">
                          (Over by {formatCurrency(statistics.average_daily_spending - selectedTrip.daily_budget)})
                        </span>
                      )}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </>
  );
}
