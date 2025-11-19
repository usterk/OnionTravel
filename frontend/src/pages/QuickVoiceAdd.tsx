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
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      {/* Main Card */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          marginBottom: '10px',
          color: '#1f2937',
        }}>
          Szybkie dodawanie wydatków
        </h1>
        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '30px',
        }}>
          Nagraj swoją wiadomość głosową
        </p>

        {/* Trip Selection State */}
        {state === 'selecting-trip' && (
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '20px',
            }}>
              Wybierz wycieczkę
            </h2>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '20px',
                backgroundColor: 'white',
                color: '#1f2937',
                cursor: 'pointer',
              }}
            >
              <option value="">-- Wybierz wycieczkę --</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.name} ({trip.currency_code})
                </option>
              ))}
            </select>
            {error && (
              <p style={{
                color: '#ef4444',
                fontSize: '14px',
                marginBottom: '15px',
              }}>
                {error}
              </p>
            )}
            <button
              onClick={handleTripSelect}
              style={{
                width: '100%',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '14px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Kontynuuj
            </button>
          </div>
        )}

        {/* Recording State */}
        {state === 'requesting-permission' && (
          <div style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
            <p style={{ color: '#6b7280' }}>Czekam na dostęp do mikrofonu...</p>
          </div>
        )}

        {state === 'recording' && (
          <div style={{ padding: '40px 20px' }}>
            <div style={{
              fontSize: '72px',
              fontWeight: '700',
              color: '#ef4444',
              marginBottom: '20px',
              animation: 'pulse 1s infinite',
            }}>
              {timeLeft}
            </div>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎤</div>
            <progress
              value={progress}
              max={100}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                marginBottom: '20px',
              }}
            />
            <button
              onClick={stopRecording}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginTop: '10px',
              }}
            >
              ⏹️ Zatrzymaj i dodaj
            </button>
          </div>
        )}

        {state === 'processing' && (
          <div style={{ padding: '40px 20px' }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '20px',
              animation: 'spin 1s linear infinite',
            }}>
              ⏳
            </div>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>Przetwarzam nagranie...</p>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginTop: '10px' }}>
              To może potrwać 3-15 sekund
            </p>
          </div>
        )}

        {state === 'success' && (
          <div style={{ padding: '20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
            <p style={{
              color: '#10b981',
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '30px',
            }}>
              Wydatek dodany!
            </p>
            <button
              onClick={handleAddAnother}
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              ➕ Dodaj kolejny
            </button>
          </div>
        )}

        {state === 'error' && (
          <div style={{ padding: '40px 20px' }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>❌</div>
            <p style={{
              color: '#ef4444',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '10px',
            }}>
              Błąd
            </p>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '30px' }}>
              {error}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {error.includes('kategorii') ? (
                <button
                  onClick={() => window.location.href = '/OnionTravel'}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Wróć do głównej strony
                </button>
              ) : (
                <button
                  onClick={handleAddAnother}
                  style={{
                    background: '#667eea',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Spróbuj ponownie
                </button>
              )}
            </div>
          </div>
        )}

        {/* Added Expenses List */}
        {addedExpenses.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '15px',
              textAlign: 'left',
            }}>
              Dodane wydatki ({addedExpenses.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {addedExpenses.map((expense) => (
                <div
                  key={expense.id}
                  onClick={handleExpenseClick}
                  style={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  <div style={{ fontSize: '32px' }}>
                    {getCategoryEmoji(expense.category_id, expense.category_name)}
                  </div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{
                      fontWeight: '600',
                      fontSize: '16px',
                      marginBottom: '4px',
                    }}>
                      {expense.title}
                    </div>
                    <div style={{ fontSize: '14px', opacity: 0.9 }}>
                      {expense.amount.toFixed(2)} {expense.currency_code}
                    </div>
                  </div>
                  <div style={{ fontSize: '20px' }}>→</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
