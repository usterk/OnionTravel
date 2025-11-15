import React, { useState } from 'react';
import { Mic } from 'lucide-react';
import { VoiceExpenseModal } from './VoiceExpenseModal';

interface VoiceExpenseButtonProps {
  tripId: number;
  currentDate: string; // YYYY-MM-DD
  onExpenseAdded?: () => void;
}

export const VoiceExpenseButton: React.FC<VoiceExpenseButtonProps> = ({
  tripId,
  currentDate,
  onExpenseAdded,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSuccess = () => {
    if (onExpenseAdded) {
      onExpenseAdded();
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
        aria-label="Add expense with voice"
        title="Dodaj wydatek głosowo"
      >
        <Mic className="h-6 w-6" />
      </button>

      {/* Voice Expense Modal */}
      <VoiceExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tripId={tripId}
        expenseDate={currentDate}
        onSuccess={handleSuccess}
      />
    </>
  );
};
