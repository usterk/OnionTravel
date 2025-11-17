import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDateNavigation } from './useDateNavigation';

// Mock react-swipeable
vi.mock('react-swipeable', () => ({
  useSwipeable: (options: any) => {
    // Store the handlers so we can test them
    return {
      onSwipedLeft: options.onSwipedLeft,
      onSwipedRight: options.onSwipedRight,
      ref: vi.fn(),
    };
  },
}));

describe('useDateNavigation', () => {
  const tripStartDate = '2025-11-01';
  const tripEndDate = '2025-11-10';

  beforeEach(() => {
    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
    });

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      value: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with today if trip is ongoing', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { result } = renderHook(() =>
        useDateNavigation({
          tripStartDate: yesterday.toISOString().split('T')[0],
          tripEndDate: tomorrow.toISOString().split('T')[0],
        })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(today);
      });
    });

    it('should initialize with trip start if trip hasnt started', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { result } = renderHook(() =>
        useDateNavigation({
          tripStartDate: tomorrow.toISOString().split('T')[0],
          tripEndDate: nextWeek.toISOString().split('T')[0],
        })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(tomorrow.toISOString().split('T')[0]);
      });
    });

    it('should initialize with trip end if trip has ended', async () => {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const { result } = renderHook(() =>
        useDateNavigation({
          tripStartDate: lastWeek.toISOString().split('T')[0],
          tripEndDate: yesterday.toISOString().split('T')[0],
        })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(yesterday.toISOString().split('T')[0]);
      });
    });

    it('should show hints on touch devices', () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate })
      );

      expect(result.current.showHints).toBe(true);
    });
  });

  describe('changeDay', () => {
    it('should navigate to next day', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate: '2025-11-05', tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      act(() => {
        result.current.changeDay(1);
      });

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-06');
      });
    });

    it('should navigate to previous day', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate: '2025-11-05' })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      act(() => {
        result.current.changeDay(-1);
      });

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-04');
      });
    });

    it('should not navigate beyond trip start', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate: '2025-11-05', tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      act(() => {
        result.current.changeDay(-1);
      });

      // Should stay at trip start
      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });
    });

    it('should not navigate beyond trip end', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate: '2025-11-05' })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      act(() => {
        result.current.changeDay(1);
      });

      // Should stay at trip end
      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });
    });

    it('should set swipe direction when changing day', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate: '2025-11-05', tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      act(() => {
        result.current.changeDay(1);
      });

      // Direction should be set immediately
      expect(result.current.swipeDirection).toBe('left');

      // Wait for animation to complete (300ms timeout)
      await waitFor(
        () => {
          expect(result.current.swipeDirection).toBeNull();
        },
        { timeout: 500 }
      );
    });

    it('should hide hints on first swipe', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate: '2025-11-05', tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      expect(result.current.showHints).toBe(true);

      act(() => {
        result.current.changeDay(1);
      });

      await waitFor(() => {
        expect(result.current.showHints).toBe(false);
      });
    });
  });

  describe('Navigation Functions', () => {
    it('should navigate to today with goToToday', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { result } = renderHook(() =>
        useDateNavigation({
          tripStartDate: yesterday.toISOString().split('T')[0],
          tripEndDate: nextWeek.toISOString().split('T')[0],
        })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(today);
      });

      // Change to a different date
      act(() => {
        result.current.setSelectedDate('2025-11-05');
      });

      await waitFor(() => {
        expect(result.current.selectedDate).toBe('2025-11-05');
      });

      // Go back to today
      act(() => {
        result.current.goToToday();
      });

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(today);
      });
    });

    it('should navigate to trip start with goToStart', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).not.toBe('');
      });

      act(() => {
        result.current.goToStart();
      });

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(tripStartDate);
      });
    });

    it('should navigate to trip end with goToEnd', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).not.toBe('');
      });

      act(() => {
        result.current.goToEnd();
      });

      await waitFor(() => {
        expect(result.current.selectedDate).toBe(tripEndDate);
      });
    });
  });

  describe('Computed Values', () => {
    it('should correctly compute isAtTripStart', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).not.toBe('');
      });

      act(() => {
        result.current.goToStart();
      });

      await waitFor(() => {
        expect(result.current.isAtTripStart).toBe(true);
        expect(result.current.isAtTripEnd).toBe(false);
      });
    });

    it('should correctly compute isAtTripEnd', async () => {
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).not.toBe('');
      });

      act(() => {
        result.current.goToEnd();
      });

      await waitFor(() => {
        expect(result.current.isAtTripStart).toBe(false);
        expect(result.current.isAtTripEnd).toBe(true);
      });
    });

    it('should correctly compute isTodayInTripRange', () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { result } = renderHook(() =>
        useDateNavigation({
          tripStartDate: yesterday.toISOString().split('T')[0],
          tripEndDate: tomorrow.toISOString().split('T')[0],
        })
      );

      expect(result.current.isTodayInTripRange).toBe(true);
    });
  });

  describe('onDateChange callback', () => {
    it('should call onDateChange when date changes', async () => {
      const onDateChange = vi.fn();
      const { result } = renderHook(() =>
        useDateNavigation({ tripStartDate, tripEndDate, onDateChange })
      );

      await waitFor(() => {
        expect(result.current.selectedDate).not.toBe('');
      });

      // onDateChange should be called with initial date
      expect(onDateChange).toHaveBeenCalled();

      const callCount = onDateChange.mock.calls.length;

      act(() => {
        result.current.changeDay(1);
      });

      await waitFor(() => {
        expect(onDateChange).toHaveBeenCalledTimes(callCount + 1);
      });
    });
  });
});
