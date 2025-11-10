import type { TripResponse } from '@/types/trip';
import { format } from 'date-fns';

interface TripStatus {
  label: string;
  style: {
    backgroundColor: string;
    color: string;
  };
}

export function getTripStatus(trip: TripResponse): TripStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(trip.start_date);
  const endDate = new Date(trip.end_date);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (today >= startDate && today <= endDate) {
    return {
      label: 'Active',
      style: { backgroundColor: '#16a34a', color: 'white' } // green-600
    };
  } else if (today < startDate) {
    return {
      label: 'Upcoming',
      style: { backgroundColor: '#dbeafe', color: '#1e40af' } // blue-100, blue-800
    };
  } else {
    return {
      label: 'Completed',
      style: { backgroundColor: '#f3f4f6', color: '#374151' } // gray-100, gray-700
    };
  }
}

export function getDuration(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days !== 1 ? 's' : ''}`;
  } catch {
    return 'N/A';
  }
}

export function formatTripDates(startDate: string, endDate: string): string {
  try {
    const start = format(new Date(startDate), 'MMM d');
    const end = format(new Date(endDate), 'MMM d, yyyy');
    return `${start} - ${end}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}

export function formatDate(dateString: string, dateFormat = 'MMM d, yyyy'): string {
  try {
    return format(new Date(dateString), dateFormat);
  } catch {
    return dateString;
  }
}
