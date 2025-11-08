import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TripResponse, TripDetailResponse } from '@/types/trip';

interface TripState {
  trips: TripResponse[];
  currentTrip: TripDetailResponse | null;
  selectedTripId: number | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTrips: (trips: TripResponse[]) => void;
  setCurrentTrip: (trip: TripDetailResponse | null) => void;
  setSelectedTripId: (tripId: number | null) => void;
  addTrip: (trip: TripResponse) => void;
  updateTrip: (tripId: number, updates: Partial<TripResponse>) => void;
  removeTrip: (tripId: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearTrips: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set) => ({
      trips: [],
      currentTrip: null,
      selectedTripId: null,
      isLoading: false,
      error: null,

      setTrips: (trips) => set({ trips }),

      setCurrentTrip: (trip) => set({ currentTrip: trip }),

      setSelectedTripId: (tripId) => set({ selectedTripId: tripId }),

      addTrip: (trip) =>
        set((state) => ({
          trips: [...state.trips, trip],
        })),

      updateTrip: (tripId, updates) =>
        set((state) => ({
          trips: state.trips.map((trip) =>
            trip.id === tripId ? { ...trip, ...updates } : trip
          ),
          currentTrip:
            state.currentTrip?.id === tripId
              ? { ...state.currentTrip, ...updates }
              : state.currentTrip,
        })),

      removeTrip: (tripId) =>
        set((state) => ({
          trips: state.trips.filter((trip) => trip.id !== tripId),
          currentTrip: state.currentTrip?.id === tripId ? null : state.currentTrip,
          selectedTripId: state.selectedTripId === tripId ? null : state.selectedTripId,
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      clearTrips: () =>
        set({
          trips: [],
          currentTrip: null,
          selectedTripId: null,
          error: null,
        }),
    }),
    {
      name: 'trip-storage',
      partialize: (state) => ({
        selectedTripId: state.selectedTripId,
        // Don't persist trips array - always fetch fresh from API
      }),
    }
  )
);
