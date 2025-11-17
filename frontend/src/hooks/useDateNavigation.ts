import { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';
import { getInitialTripDate } from '@/lib/daily-budget-utils';

export interface UseDateNavigationOptions {
  tripStartDate: string;
  tripEndDate: string;
  onDateChange?: (date: string) => void;
}

export interface UseDateNavigationReturn {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  swipeDirection: 'left' | 'right' | null;
  showHints: boolean;
  isAtTripStart: boolean;
  isAtTripEnd: boolean;
  isTodayInTripRange: boolean;
  changeDay: (days: number) => void;
  goToToday: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  swipeHandlers: ReturnType<typeof useSwipeable>;
}

/**
 * Custom hook for managing date navigation in the daily budget view
 * Handles swipe gestures, button navigation, and date selection
 */
export function useDateNavigation({
  tripStartDate,
  tripEndDate,
  onDateChange,
}: UseDateNavigationOptions): UseDateNavigationReturn {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Visual hints state - only on mobile/touch devices
  const [showHints, setShowHints] = useState(() => {
    // Check if device has touch support
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  // Set initial date based on trip range
  useEffect(() => {
    const initialDate = getInitialTripDate(tripStartDate, tripEndDate);
    setSelectedDate(initialDate);
  }, [tripStartDate, tripEndDate]);

  // Hide hints after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHints(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Notify parent of date changes
  useEffect(() => {
    if (selectedDate && onDateChange) {
      onDateChange(selectedDate);
    }
  }, [selectedDate, onDateChange]);

  /**
   * Change date by a number of days
   */
  const changeDay = (days: number) => {
    const currentDate = new Date(selectedDate);
    currentDate.setDate(currentDate.getDate() + days);
    const newDate = currentDate.toISOString().split('T')[0];

    // Check if new date is within trip range
    if (newDate >= tripStartDate && newDate <= tripEndDate) {
      // Set animation direction
      setSwipeDirection(days > 0 ? 'left' : 'right');

      // Hide hints on first swipe
      setShowHints(false);

      // Haptic feedback (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      setSelectedDate(newDate);

      // Reset direction after animation
      setTimeout(() => setSwipeDirection(null), 300);
    }
  };

  /**
   * Navigate to today (or closest date within trip range)
   */
  const goToToday = () => {
    const today = new Date().toISOString().split('T')[0];

    // Only go to today if it's within trip range
    if (today >= tripStartDate && today <= tripEndDate) {
      setSelectedDate(today);
    } else if (today < tripStartDate) {
      // If today is before trip, go to trip start
      setSelectedDate(tripStartDate);
    } else {
      // If today is after trip, go to trip end
      setSelectedDate(tripEndDate);
    }
  };

  /**
   * Navigate to trip start date
   */
  const goToStart = () => {
    setSelectedDate(tripStartDate);
  };

  /**
   * Navigate to trip end date
   */
  const goToEnd = () => {
    setSelectedDate(tripEndDate);
  };

  // Computed values
  const isAtTripStart = selectedDate === tripStartDate;
  const isAtTripEnd = selectedDate === tripEndDate;
  const today = new Date().toISOString().split('T')[0];
  const isTodayInTripRange = today >= tripStartDate && today <= tripEndDate;

  // Swipe handlers using react-swipeable
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isAtTripEnd) {
        changeDay(1); // Next day
      }
    },
    onSwipedRight: () => {
      if (!isAtTripStart) {
        changeDay(-1); // Previous day
      }
    },
    preventScrollOnSwipe: false, // Allow vertical scrolling
    trackMouse: false, // Only track touch, not mouse
    delta: 50, // Minimum distance to trigger swipe
  });

  return {
    selectedDate,
    setSelectedDate,
    swipeDirection,
    showHints,
    isAtTripStart,
    isAtTripEnd,
    isTodayInTripRange,
    changeDay,
    goToToday,
    goToStart,
    goToEnd,
    swipeHandlers,
  };
}
