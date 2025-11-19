import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createVoiceExpense } from '@/lib/ai-expenses-api';
import { getDefaultTripId, tripApi } from '@/lib/api';

interface AddedExpense {
  id: number;
  title: string;
  amount: number;
  currency_code: string;
  category_id: number;
  category_name?: string;
  category_icon?: string;
}

interface Trip {
  id: number;
  name: string;
  currency_code: string;
}

type RecordingState = 'idle' | 'requesting-permission' | 'recording' | 'processing' | 'success' | 'error' | 'selecting-trip';

export default function QuickVoiceAdd() {
  const navigate = useNavigate();
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState<string>('');
  const [tripId, setTripId] = useState<number | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState<string>('');
  const [addedExpenses, setAddedExpenses] = useState<AddedExpense[]>([]);
  const [timeLeft, setTimeLeft] = useState(10);
  const [progress, setProgress] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Load trip ID on mount
  useEffect(() => {
    const loadTripId = async () => {
      try {
        // Check localStorage first
        const lastTripId = localStorage.getItem('lastViewedTripId');

        if (lastTripId) {
          // Have saved trip, use it
          const id = parseInt(lastTripId, 10);
          if (!isNaN(id)) {
            setTripId(id);
            return;
          }
        }

        // No saved trip, load all trips and show selector
        const allTrips = await tripApi.getTrips();

        if (allTrips.length === 0) {
          setError('Nie masz żadnych wycieczek. Najpierw utwórz wycieczkę na głównej stronie.');
          setState('error');
          return;
        }

        // Show trip selector
        setTrips(allTrips);
        setState('selecting-trip');
      } catch (err) {
        setError('Nie udało się załadować wycieczek. Sprawdź połączenie internetowe.');
        setState('error');
      }
    };
    loadTripId();
  }, []);

  // Auto-start recording when tripId is loaded
  useEffect(() => {
    if (tripId && state === 'idle') {
      startRecording();
    }
  }, [tripId, state]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setState('requesting-permission');
      setError('');
      chunksRef.current = [];
      setTimeLeft(10);
      setProgress(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Detect supported MIME type
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/mpeg',
      ];
      const supportedType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: supportedType,
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: supportedType });
        await processAudio(audioBlob);
        stopStream();
      };

      mediaRecorder.start();
      setState('recording');
      startTimeRef.current = Date.now();

      // Start 10-second timer
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const remaining = Math.max(0, 10 - elapsed);
        setTimeLeft(Math.ceil(remaining));
        setProgress((elapsed / 10) * 100);

        if (remaining <= 0) {
          stopRecording();
        }
      }, 100);

    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Nie udało się uzyskać dostępu do mikrofonu. Sprawdź uprawnienia.');
      setState('error');
      stopStream();
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!tripId) {
      setError('Brak ID wycieczki');
      setState('error');
      return;
    }

    setState('processing');

    try {
      // Convert blob to base64
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(audioBlob);
      });

      // Send to API
      const today = new Date().toISOString().split('T')[0];
      const expenses = await createVoiceExpense(tripId, {
        audio_base64: base64Audio,
        expense_date: today,
      });

      // Add to list
      if (expenses && expenses.length > 0) {
        setAddedExpenses(prev => [...prev, ...expenses]);
        setState('success');
      } else {
        setError('Nie udało się przetworzyć nagrania');
        setState('error');
      }
    } catch (err: any) {
      console.error('Failed to process audio:', err);
      let errorMsg = 'Błąd podczas przetwarzania nagrania';

      if (err.response?.data?.detail) {
        errorMsg = err.response.data.detail;

        // User-friendly message for common errors
        if (errorMsg.includes('no categories')) {
          errorMsg = 'Ta wycieczka nie ma kategorii. Wróć do głównej strony i utwórz kategorie.';
        } else if (errorMsg.includes('Transcription failed')) {
          errorMsg = 'Nie udało się rozpoznać nagrania. Spróbuj mówić wyraźniej.';
        } else if (errorMsg.includes('AI service not configured')) {
          errorMsg = 'Serwis AI nie jest skonfigurowany. Skontaktuj się z administratorem.';
        }
      }

      setError(errorMsg);
      setState('error');
    }
  };

  const handleTripSelect = () => {
    if (!selectedTripId) {
      setError('Wybierz wycieczkę');
      return;
    }

    const id = parseInt(selectedTripId, 10);
    if (isNaN(id)) {
      setError('Nieprawidłowe ID wycieczki');
      return;
    }

    // Save to localStorage
    localStorage.setItem('lastViewedTripId', id.toString());
    setTripId(id);
    setState('idle');
  };

  const handleAddAnother = () => {
    setState('idle');
    setError('');
    startRecording();
  };

  const handleExpenseClick = () => {
    window.location.href = '/OnionTravel';
  };

  const getCategoryEmoji = (categoryId: number, categoryName?: string) => {
    // Map common categories to emojis
    const categoryMap: Record<string, string> = {
      'accommodation': '🏨',
      'transport': '🚗',
      'food': '🍽️',
      'activities': '🎯',
      'shopping': '🛍️',
      'health': '💊',
      'entertainment': '🎬',
      'other': '💰',
    };

    if (categoryName) {
      const key = categoryName.toLowerCase();
      for (const [name, emoji] of Object.entries(categoryMap)) {
        if (key.includes(name)) {
          return emoji;
        }
      }
    }

    return '💰';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-5">
      {/* Main Card */}
      <div className="bg-white rounded-lg border shadow-sm p-10 max-w-md w-full text-center">
        {/* Title */}
        <h1 className="text-2xl font-bold mb-2 text-gray-800">
          Szybkie dodawanie wydatków
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Nagraj swoją wiadomość głosową
        </p>

        {/* Trip Selection State */}
        {state === 'selecting-trip' && (
          <div className="p-5">
            <div className="text-5xl mb-5">🗺️</div>
            <h2 className="text-xl font-semibold text-gray-800 mb-5">
              Wybierz wycieczkę
            </h2>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base mb-5 cursor-pointer"
            >
              <option value="">-- Wybierz wycieczkę --</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} ({trip.currency_code})
                </option>
              ))}
            </select>
            {error && (
              <p className="text-red-500 text-sm mb-4">
                {error}
              </p>
            )}
            <button
              onClick={handleTripSelect}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3.5 text-base font-semibold transition-colors"
            >
              Kontynuuj
            </button>
          </div>
        )}

        {/* Recording State */}
        {state === 'requesting-permission' && (
          <div className="py-10 px-5">
            <div className="text-5xl mb-5">🎤</div>
            <p className="text-gray-500">Czekam na dostęp do mikrofonu...</p>
          </div>
        )}

        {state === 'recording' && (
          <div className="py-10 px-5">
            <div className="text-7xl font-bold text-red-500 mb-5 animate-pulse">
              {timeLeft}
            </div>
            <div className="text-5xl mb-5">🎤</div>
            <progress
              value={progress}
              max={100}
              className="w-full h-2 rounded mb-5"
            />
            <button
              onClick={stopRecording}
              className="bg-red-500 hover:bg-red-600 text-white rounded-md px-6 py-3 text-base font-semibold transition-colors mt-2.5"
            >
              ⏹️ Zatrzymaj i dodaj
            </button>
          </div>
        )}

        {state === 'processing' && (
          <div className="py-10 px-5">
            <div className="text-5xl mb-5 animate-spin">
              ⏳
            </div>
            <p className="text-gray-500 text-lg">Przetwarzam nagranie...</p>
            <p className="text-gray-400 text-sm mt-2.5">
              To może potrwać 3-15 sekund
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="p-5">
            <div className="text-6xl mb-5">✅</div>
            <p className="text-green-600 text-xl font-semibold mb-8">
              Wydatek dodany!
            </p>
            <button
              onClick={handleAddAnother}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3 text-base font-semibold transition-colors"
            >
              ➕ Dodaj kolejny
            </button>
          </div>
        )}

        {state === 'error' && (
          <div className="py-10 px-5">
            <div className="text-6xl mb-5">❌</div>
            <p className="text-red-500 text-lg font-semibold mb-2.5">
              Błąd
            </p>
            <p className="text-gray-500 text-sm mb-8">
              {error}
            </p>
            <div className="flex flex-col gap-2.5">
              {error.includes('kategorii') ? (
                <button
                  onClick={() => window.location.href = '/OnionTravel'}
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-md px-6 py-3 text-base font-semibold transition-colors"
                >
                  Wróć do głównej strony
                </button>
              ) : (
                <button
                  onClick={handleAddAnother}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-6 py-3 text-base font-semibold transition-colors"
                >
                  Spróbuj ponownie
                </button>
              )}
            </div>
          </div>
        )}

        {/* Added Expenses List */}
        {addedExpenses.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 text-left">
              Dodane wydatki ({addedExpenses.length})
            </h2>
            <div className="flex flex-col gap-2.5">
              {addedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  onClick={handleExpenseClick}
                  className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow rounded-lg p-4 cursor-pointer flex items-center gap-3"
                >
                  <div className="text-3xl">
                    {getCategoryEmoji(expense.category_id, expense.category_name)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-base text-gray-800 mb-1">
                      {expense.title}
                    </div>
                    <div className="text-sm text-gray-600">
                      {expense.amount.toFixed(2)} {expense.currency_code}
                    </div>
                  </div>
                  <div className="text-xl text-gray-400">→</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
