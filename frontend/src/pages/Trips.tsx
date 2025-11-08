import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
import { tripApi } from '@/lib/api';
import { TripCard } from '@/components/trips/TripCard';
import { Button } from '@/components/ui/button';
import { Plus, LogOut } from 'lucide-react';

export default function Trips() {
  const navigate = useNavigate();
  const { trips, setTrips, setLoading, isLoading, error, setError } = useTripStore();
  const { user, logout } = useAuthStore();
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    loadTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTrips = async () => {
    if (isFetching) return; // Prevent multiple simultaneous loads

    setIsFetching(true);
    setLoading(true);
    setError(null);

    try {
      const data = await tripApi.getTrips();
      setTrips(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load trips');
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">OnionTravel</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome, {user?.full_name || user?.username}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">My Trips</h2>
            <p className="text-gray-600 mt-1">Manage your travel budgets</p>
          </div>
          <Button onClick={() => navigate('/trips/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isFetching && (!trips || trips.length === 0) && (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading trips...</p>
          </div>
        )}

        {/* Empty State */}
        {!isFetching && trips && trips.length === 0 && !error && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips yet</h3>
            <p className="text-gray-600 mb-6">Create your first trip to start tracking your budget</p>
            <Button onClick={() => navigate('/trips/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Trip
            </Button>
          </div>
        )}

        {/* Trip Grid */}
        {trips && trips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => navigate(`/trips/${trip.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
