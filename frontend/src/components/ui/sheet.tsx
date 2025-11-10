import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

interface SheetContentProps {
  side?: 'left' | 'right';
  className?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

interface SheetHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface SheetTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function Sheet({ open, onOpenChange, children }: SheetProps) {
  useEffect(() => {
    // Lock body scroll when sheet is open
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    // Handle ESC key
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-300"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Content */}
      {children}
    </>
  );
}

export function SheetContent({ side = 'left', className = '', children, onClose }: SheetContentProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus first focusable element when opened
    const focusableElements = contentRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements && focusableElements.length > 0) {
      (focusableElements[0] as HTMLElement).focus();
    }
  }, []);

  const sideClasses = {
    left: 'left-0',
    right: 'right-0',
  };

  return (
    <div
      ref={contentRef}
      className={`fixed inset-y-0 ${sideClasses[side]} w-80 md:w-96 bg-white shadow-xl z-50
        flex flex-col animate-slide-in ${className}`}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>
  );
}

export function SheetHeader({ children, className = '' }: SheetHeaderProps) {
  return (
    <div className={`px-6 py-4 border-b ${className}`}>
      {children}
    </div>
  );
}

export function SheetTitle({ children, className = '' }: SheetTitleProps) {
  return (
    <h2 className={`text-lg font-semibold ${className}`}>
      {children}
    </h2>
  );
}

export function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClose}
      className="absolute right-4 top-4 h-8 w-8 p-0"
    >
      <X className="h-4 w-4" />
      <span className="sr-only">Close</span>
    </Button>
  );
}
