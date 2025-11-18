import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDateNavigation } from './useDateNavigation';

// Mock react-swipeable
vi.mock('react-swipeable', () => ({
  useSwipeable: () => ({}),
}));

describe('useDateNavigation', () => {
  const tripStartDate = '2025-11-10';
  const tripEndDate = '2025-11-20';

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock navigator.vibrate
    vi.stubGlobal('navigator', {
      ...navigator,
      vibrate: vi.fn(),
      maxTouchPoints: 0,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should initialize with today if within trip range', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: yesterday, tripEndDate: tomorrow })
    );

    expect(result.current.selectedDate).toBe(today);
  });

  it('should initialize with trip start if today is before trip', () => {
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const futureEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: futureStart, tripEndDate: futureEnd })
    );

    expect(result.current.selectedDate).toBe(futureStart);
  });

  it('should initialize with trip end if today is after trip', () => {
    const pastStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: pastStart, tripEndDate: pastEnd })
    );

    expect(result.current.selectedDate).toBe(pastEnd);
  });

  it('should hide hints after 3 seconds', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      maxTouchPoints: 1, // Touch device
    });

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    expect(result.current.showHints).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.showHints).toBe(false);
  });

  it('should change day forward', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.setSelectedDate(tripStartDate);
    });

    act(() => {
      result.current.changeDay(1);
    });

    expect(result.current.selectedDate).toBe('2025-11-11');
  });

  it('should change day backward', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.setSelectedDate('2025-11-15');
    });

    act(() => {
      result.current.changeDay(-1);
    });

    expect(result.current.selectedDate).toBe('2025-11-14');
  });

  it('should not change day before trip start', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.setSelectedDate(tripStartDate);
    });

    act(() => {
      result.current.changeDay(-1);
    });

    expect(result.current.selectedDate).toBe(tripStartDate);
  });

  it('should not change day after trip end', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.setSelectedDate(tripEndDate);
    });

    act(() => {
      result.current.changeDay(1);
    });

    expect(result.current.selectedDate).toBe(tripEndDate);
  });

  it('should go to today when within trip range', () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: yesterday, tripEndDate: tomorrow })
    );

    act(() => {
      result.current.setSelectedDate(yesterday);
    });

    act(() => {
      result.current.goToToday();
    });

    expect(result.current.selectedDate).toBe(today);
  });

  it('should go to trip start when today is before trip', () => {
    const futureStart = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const futureEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: futureStart, tripEndDate: futureEnd })
    );

    act(() => {
      result.current.goToToday();
    });

    expect(result.current.selectedDate).toBe(futureStart);
  });

  it('should go to trip end when today is after trip', () => {
    const pastStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const pastEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: pastStart, tripEndDate: pastEnd })
    );

    act(() => {
      result.current.goToToday();
    });

    expect(result.current.selectedDate).toBe(pastEnd);
  });

  it('should go to trip start', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.goToStart();
    });

    expect(result.current.selectedDate).toBe(tripStartDate);
  });

  it('should go to trip end', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.goToEnd();
    });

    expect(result.current.selectedDate).toBe(tripEndDate);
  });

  it('should correctly identify trip boundaries', () => {
    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate, tripEndDate })
    );

    act(() => {
      result.current.setSelectedDate(tripStartDate);
    });

    expect(result.current.isAtTripStart).toBe(true);
    expect(result.current.isAtTripEnd).toBe(false);

    act(() => {
      result.current.setSelectedDate(tripEndDate);
    });

    expect(result.current.isAtTripStart).toBe(false);
    expect(result.current.isAtTripEnd).toBe(true);
  });

  it('should correctly identify if today is in trip range', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { result } = renderHook(() =>
      useDateNavigation({ tripStartDate: yesterday, tripEndDate: tomorrow })
    );

    expect(result.current.isTodayInTripRange).toBe(true);
  });
});
