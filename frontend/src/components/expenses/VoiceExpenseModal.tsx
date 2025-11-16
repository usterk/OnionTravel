import React, { useState, useRef, useEffect } from 'react';
import { Mic, Loader2, CheckCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { parseAndCreateVoiceExpense } from '@/lib/ai-expenses-api';

interface VoiceExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: number;
  expenseDate: string; // YYYY-MM-DD
  onSuccess: () => void;
}

type ProcessingStep =
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'saving'
  | 'success'
  | 'error';

export const VoiceExpenseModal: React.FC<VoiceExpenseModalProps> = ({
  isOpen,
  onClose,
  tripId,
  expenseDate,
  onSuccess,
}) => {
  const [step, setStep] = useState<ProcessingStep>('recording');
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioBlobRef = useRef<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const shouldProcessRef = useRef<boolean>(false);

  // Auto-start recording when modal opens
  useEffect(() => {
    if (isOpen && !isRecording) {
      startRecording();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
    audioBlobRef.current = null;
    shouldProcessRef.current = false;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Try to use a compatible audio format
      // Prefer webm with opus, but fallback to browser default
      let mediaRecorder: MediaRecorder;
      let mimeType = 'audio/webm;codecs=opus';

      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Try other common formats
        const formats = [
          'audio/webm',
          'audio/mp4',
          'audio/ogg;codecs=opus',
          'audio/ogg',
        ];

        mimeType = formats.find(fmt => MediaRecorder.isTypeSupported(fmt)) || '';
        console.log('Using MIME type:', mimeType);
      }

      mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Use the actual MIME type from the recorder
        const actualMimeType = mediaRecorder.mimeType || 'audio/webm';
        console.log('Recording finished with MIME type:', actualMimeType);

        const blob = new Blob(audioChunksRef.current, { type: actualMimeType });
        audioBlobRef.current = blob;
        stream.getTracks().forEach((track) => track.stop());

        // If we should process, do it now
        if (shouldProcessRef.current) {
          shouldProcessRef.current = false;
          processAudio();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStep('recording');
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError('Nie można uzyskać dostępu do mikrofonu. Upewnij się, że przeglądarka ma uprawnienia do mikrofonu i że mikrofon jest podłączony.');
      setStep('error');
    }
  };

  const handleSend = () => {
    if (mediaRecorderRef.current && isRecording) {
      shouldProcessRef.current = true; // Flag to process when onstop fires
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const processAudio = async () => {
    const blob = audioBlobRef.current;

    if (!blob) {
      setError('Brak nagrania audio');
      setStep('error');
      return;
    }

    setStep('transcribing');
    setError(null);

    try {
      const createdExpense = await parseAndCreateVoiceExpense(
        tripId,
        blob,
        expenseDate
      );

      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error('Voice expense processing failed:', err);
      const errorMessage =
        err.response?.data?.detail ||
        err.message ||
        'Nie udało się przetworzyć nagrania';
      setError(errorMessage);
      setStep('error');
    }
  };

  const handleCancel = () => {
    cleanup();
    onClose();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStepMessage = (): string => {
    switch (step) {
      case 'recording':
        return 'Nagrywanie...';
      case 'transcribing':
        return 'Transkrypcja...';
      case 'parsing':
        return 'Parsowanie AI...';
      case 'saving':
        return 'Zapisywanie...';
      case 'success':
        return 'Gotowe!';
      case 'error':
        return error || 'Wystąpił błąd';
      default:
        return '';
    }
  };

  const renderIcon = () => {
    switch (step) {
      case 'recording':
        return <Mic className="h-8 w-8 text-red-500 animate-pulse" />;
      case 'transcribing':
      case 'parsing':
      case 'saving':
        return <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'error':
        return <XCircle className="h-8 w-8 text-red-500" />;
    }
  };

  const isProcessing = ['transcribing', 'parsing', 'saving'].includes(step);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader onClose={handleCancel}>
          <DialogTitle>Nagrywanie wydatku</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {/* Icon */}
            {renderIcon()}

            {/* Status message */}
            <p className="text-base font-medium text-gray-900">
              {getStepMessage()}
            </p>

            {/* Timer for recording */}
            {step === 'recording' && (
              <p className="text-2xl font-mono text-gray-700">
                {formatTime(recordingTime)}
              </p>
            )}

            {/* Error message */}
            {step === 'error' && error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 w-full">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          {step === 'recording' && (
            <>
              <Button
                onClick={handleSend}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Wyślij
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Anuluj
              </Button>
            </>
          )}

          {isProcessing && (
            <Button disabled className="bg-gray-400 w-full">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Przetwarzanie...
            </Button>
          )}

          {step === 'error' && (
            <>
              <Button onClick={() => { cleanup(); startRecording(); }} className="bg-blue-600 hover:bg-blue-700">
                Spróbuj ponownie
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Zamknij
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
