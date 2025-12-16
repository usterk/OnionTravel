import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useUIStore } from '@/store/uiStore';
import { useTripStore } from '@/store/tripStore';
import { tripApi } from '@/lib/api';
import { getTripStatus, formatTripDates, getDuration, sortTrips } from '@/lib/tripUtils';

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const { trips, selectedTripId, setSelectedTripId, setTrips, isLoading, setLoading } = useTripStore();

  // Close sidebar on route change
  useEffect(() => {
    closeSidebar();
  }, [location.pathname, closeSidebar]);

  // Load trips when sidebar opens and trips are empty
  useEffect(() => {
    if (isSidebarOpen && trips.length === 0 && !isLoading) {
      const loadTrips = async () => {
        setLoading(true);
        try {
          const data = await tripApi.getTrips();
          const sortedTrips = sortTrips(data);
          setTrips(sortedTrips);
        } catch (err) {
          console.error('Failed to load trips for sidebar:', err);
        } finally {
          setLoading(false);
        }
      };
      loadTrips();
    }
  }, [isSidebarOpen, trips.length, isLoading, setTrips, setLoading]);

  const handleTripClick = (tripId: number) => {
    setSelectedTripId(tripId);
    navigate('/');
    closeSidebar();
  };

  const handleCreateTrip = () => {
    navigate('/trips/new');
    closeSidebar();
  };

  return (
    <Sheet open={isSidebarOpen} onOpenChange={closeSidebar}>
      <SheetContent side="left">
        <SheetHeader>
          <SheetTitle>My Trips</SheetTitle>
          <SheetClose onClose={closeSidebar} />
        </SheetHeader>

        {/* Create New Trip Button */}
        <div className="px-6 py-4 border-b">
          <Button
            onClick={handleCreateTrip}
            className="w-full"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Trip
          </Button>
        </div>

        {/* Trip List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="text-center text-gray-500 py-8">
              Loading trips...
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No trips yet</p>
              <p className="text-sm text-gray-500">Create your first trip to get started</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trips.map((trip) => {
                const status = getTripStatus(trip);
                const isSelected = selectedTripId === trip.id;

                return (
                  <button
                    key={trip.id}
                    onClick={() => handleTripClick(trip.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-sm line-clamp-1 flex-1">
                        {trip.name}
                      </h3>
                      <Badge
                        style={status.style}
                        className="ml-2 text-xs shrink-0"
                      >
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span className="line-clamp-1">
                        {formatTripDates(trip.start_date, trip.end_date)}
                      </span>
                      <span className="ml-2 shrink-0">{trip.currency_code}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getDuration(trip.start_date, trip.end_date)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
