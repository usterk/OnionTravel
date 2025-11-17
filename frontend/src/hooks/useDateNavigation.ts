import { useState, useEffect } from 'react';
import { useSwipeable } from 'react-swipeable';

export interface UseDateNavigationOptions {
  tripStartDate: string;
  tripEndDate: string;
  initialDate?: string;
}

export interface UseDateNavigationReturn {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  changeDay: (days: number) => void;
  goToToday: () => void;
  goToStart: () => void;
  goToEnd: () => void;
  isAtTripStart: boolean;
  isAtTripEnd: boolean;
  isTodayInTripRange: boolean;
  showHints: boolean;
  swipeDirection: 'left' | 'right' | null;
  swipeHandlers: ReturnType<typeof useSwipeable>;
}

/**
 * Custom hook for managing date navigation in daily budget view
 *
 * Handles:
 * - Date selection and navigation (prev/next day)
 * - Swipe gestures for mobile
 * - Jump to today/start/end
 * - Visual hints for swipe gestures
 * - Trip date range validation
 */
export function useDateNavigation({
  tripStartDate,
  tripEndDate,
  initialDate,
}: UseDateNavigationOptions): UseDateNavigationReturn {
  // Initialize selected date immediately (not in useEffect) to avoid timing issues
  const getInitialDate = () => {
    if (initialDate) {
      return initialDate;
    }

    const today = new Date().toISOString().split('T')[0];

    if (today < tripStartDate) {
      return tripStartDate;
    } else if (today > tripEndDate) {
      return tripEndDate;
    } else {
      return today;
    }
  };

  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate);
  const [showHints, setShowHints] = useState(() => {
    // Check if device has touch support
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hide hints after 3 seconds
  useEffect(() => {
    if (!showHints) return;

    const timer = setTimeout(() => {
      setShowHints(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showHints]);

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
      setIsRefreshing(true);

      // Reset direction and refreshing state after animation
      setTimeout(() => {
        setSwipeDirection(null);
        setIsRefreshing(false);
      }, 300);
    }
  };

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

  const goToStart = () => {
    setSelectedDate(tripStartDate);
  };

  const goToEnd = () => {
    setSelectedDate(tripEndDate);
  };

  // Swipe handlers
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (!isRefreshing && !isAtTripEnd) {
        changeDay(1); // Next day
      }
    },
    onSwipedRight: () => {
      if (!isRefreshing && !isAtTripStart) {
        changeDay(-1); // Previous day
      }
    },
    preventScrollOnSwipe: false, // Allow vertical scrolling
    trackMouse: false, // Only track touch, not mouse
    delta: 50, // Minimum distance to trigger swipe
  });

  const isAtTripStart = selectedDate === tripStartDate;
  const isAtTripEnd = selectedDate === tripEndDate;

  // Check if today is within trip range
  const today = new Date().toISOString().split('T')[0];
  const isTodayInTripRange = today >= tripStartDate && today <= tripEndDate;

  return {
    selectedDate,
    setSelectedDate,
    changeDay,
    goToToday,
    goToStart,
    goToEnd,
    isAtTripStart,
    isAtTripEnd,
    isTodayInTripRange,
    showHints,
    swipeDirection,
    swipeHandlers,
  };
}
