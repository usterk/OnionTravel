import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { TripResponse } from '@/types/trip';
import { Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

interface TripCardProps {
  trip: TripResponse;
  onClick?: () => void;
}

export function TripCard({ trip, onClick }: TripCardProps) {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getDuration = () => {
    try {
      const start = new Date(trip.start_date);
      const end = new Date(trip.end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return `${days} day${days !== 1 ? 's' : ''}`;
    } catch {
      return 'N/A';
    }
  };

  const getTripStatus = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(trip.start_date);
    const endDate = new Date(trip.end_date);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today >= startDate && today <= endDate) {
      return { label: 'Active', variant: 'default' as const, className: 'bg-green-600 hover:bg-green-700' };
    } else if (today < startDate) {
      return { label: 'Upcoming', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800 hover:bg-blue-200' };
    } else {
      return { label: 'Completed', variant: 'outline' as const, className: 'bg-gray-100 text-gray-700' };
    }
  };

  const status = getTripStatus();

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl">{trip.name}</CardTitle>
            <CardDescription className="mt-1">
              {trip.description || 'No description'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Badge variant={status.variant} className={status.className}>
              {status.label}
            </Badge>
            <Badge variant="secondary">{trip.currency_code}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-4 w-4 mr-2" />
            <span>
              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            </span>
            <span className="ml-2 text-xs">({getDuration()})</span>
          </div>
          {trip.total_budget && (
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-2" />
              <span>
                Budget: {trip.currency_code} {trip.total_budget.toLocaleString()}
              </span>
              {trip.daily_budget && (
                <span className="ml-2 text-xs">
                  ({trip.currency_code} {trip.daily_budget.toLocaleString()}/day)
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
