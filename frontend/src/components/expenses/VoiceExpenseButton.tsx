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
        className="fixed bottom-4 right-4 z-50 m-0 bg-blue-600 hover:bg-blue-700 active:bg-blue-700 text-white rounded-full p-6 md:p-4 shadow-lg transition-colors duration-200 focus:outline-none"
        style={{ touchAction: 'manipulation', margin: 0 }}
        aria-label="Add expense with voice"
        title="Dodaj wydatek głosowo"
      >
        <Mic className="h-10 w-10 md:h-6 md:w-6" />
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
