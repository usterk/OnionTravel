import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTripStore } from '@/store/tripStore';
import { tripApi } from '@/lib/api';
import { TripForm } from '@/components/trips/TripForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { TripCreate } from '@/types/trip';

export default function CreateTrip() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: TripCreate) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Submitting trip data:', data);
      await tripApi.createTrip(data);
      console.log('Trip created successfully');
      // Navigate to trips - the Trips page will fetch fresh data from API
      navigate('/trips');
    } catch (err: any) {
      console.error('Error creating trip:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || err.message || 'Failed to create trip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Button
            variant="outline"
            onClick={() => navigate('/trips')}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Trips
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Trip</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Trip Details</CardTitle>
            <CardDescription>
              Enter the details for your new trip. You can add categories and expenses later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-800">{error}</p>
              </div>
            )}
            <TripForm
              onSubmit={handleSubmit}
              onCancel={() => navigate('/trips')}
              isLoading={isLoading}
              submitLabel="Create Trip"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
