import * as React from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog content */}
      <div className="relative z-50 w-full max-w-2xl">{children}</div>
    </div>
  );
};

interface DialogContentProps {
  children: React.ReactNode;
  className?: string;
}

const DialogContent: React.FC<DialogContentProps> = ({ children, className }) => {
  return (
    <div
      className={`relative bg-white rounded-lg shadow-lg w-full max-h-[90vh] overflow-y-auto ${
        className || ''
      }`}
    >
      {children}
    </div>
  );
};

interface DialogHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
}

const DialogHeader: React.FC<DialogHeaderProps> = ({ children, onClose }) => {
  return (
    <div className="flex items-center justify-between p-6 border-b">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
}

const DialogTitle: React.FC<DialogTitleProps> = ({ children, className }) => {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className || ''}`}>
      {children}
    </h2>
  );
};

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

const DialogDescription: React.FC<DialogDescriptionProps> = ({ children, className }) => {
  return (
    <p className={`text-sm text-gray-500 mt-1 ${className || ''}`}>{children}</p>
  );
};

interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

const DialogBody: React.FC<DialogBodyProps> = ({ children, className }) => {
  return <div className={`p-6 ${className || ''}`}>{children}</div>;
};

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

const DialogFooter: React.FC<DialogFooterProps> = ({ children, className }) => {
  return (
    <div
      className={`flex items-center justify-end gap-2 p-6 border-t bg-gray-50 ${
        className || ''
      }`}
    >
      {children}
    </div>
  );
};

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
};
