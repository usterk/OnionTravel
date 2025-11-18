import { useState, useEffect, useCallback } from 'react';
import { useSwipeable } from 'react-swipeable';
import { getInitialDate } from '../utils/budgetCalculations';

export interface UseDateNavigationProps {
  tripStartDate: string;
  tripEndDate: string;
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
 * Custom hook for managing date navigation in DailyBudgetView
 * Handles date selection, prev/next navigation, swipe gestures, and jump-to shortcuts
 */
export function useDateNavigation({
  tripStartDate,
  tripEndDate,
}: UseDateNavigationProps): UseDateNavigationReturn {
  // Initialize selected date immediately based on trip range
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getInitialDate(tripStartDate, tripEndDate)
  );
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [showHints, setShowHints] = useState(() => {
    // Check if device has touch support
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  });

  // Hide hints after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHints(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Check boundaries
  const isAtTripStart = selectedDate === tripStartDate;
  const isAtTripEnd = selectedDate === tripEndDate;

  // Check if today is within trip range
  const today = new Date().toISOString().split('T')[0];
  const isTodayInTripRange = today >= tripStartDate && today <= tripEndDate;

  /**
   * Change selected date by a number of days
   */
  const changeDay = useCallback(
    (days: number) => {
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
    },
    [selectedDate, tripStartDate, tripEndDate]
  );

  /**
   * Jump to today (or closest day within trip range)
   */
  const goToToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];

    if (today >= tripStartDate && today <= tripEndDate) {
      setSelectedDate(today);
    } else if (today < tripStartDate) {
      // If today is before trip, go to trip start
      setSelectedDate(tripStartDate);
    } else {
      // If today is after trip, go to trip end
      setSelectedDate(tripEndDate);
    }
  }, [tripStartDate, tripEndDate]);

  /**
   * Jump to trip start
   */
  const goToStart = useCallback(() => {
    setSelectedDate(tripStartDate);
  }, [tripStartDate]);

  /**
   * Jump to trip end
   */
  const goToEnd = useCallback(() => {
    setSelectedDate(tripEndDate);
  }, [tripEndDate]);

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
