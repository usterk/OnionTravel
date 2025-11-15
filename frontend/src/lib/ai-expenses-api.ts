import { api } from './api';
import type { Expense } from '@/types/models';

export interface VoiceExpenseRequest {
  audio_base64: string;
  expense_date: string; // YYYY-MM-DD
}

export interface ParsedExpenseData {
  title: string;
  amount: number;
  currency_code: string;
  category_id?: number;
  category_name?: string;
  notes?: string;
  location?: string;
}

export interface VoiceExpenseResponse {
  status: 'transcribing' | 'parsing' | 'retrying' | 'success' | 'error';
  transcribed_text?: string;
  parsed_data?: ParsedExpenseData;
  error_message?: string;
  retry_count: number;
  max_retries: number;
}

/**
 * Parse voice input and create expense using AI
 *
 * @param tripId - Trip ID
 * @param audioBlob - Audio blob from recording
 * @param expenseDate - Date for the expense (YYYY-MM-DD)
 * @returns Created expense
 */
export const parseAndCreateVoiceExpense = async (
  tripId: number,
  audioBlob: Blob,
  expenseDate: string
): Promise<Expense> => {
  // Convert Blob to base64
  const audio_base64 = await blobToBase64(audioBlob);

  const requestData: VoiceExpenseRequest = {
    audio_base64,
    expense_date: expenseDate,
  };

  const response = await api.post<Expense>(
    `/trips/${tripId}/expenses/voice-parse`,
    requestData
  );

  return response.data;
};

/**
 * Convert Blob to base64 string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};
