import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
  className = '',
}) => {
  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background body scroll when modal is active, restore on unmount/close
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#26301f]/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Panel: strictly constrained to viewport with pinned header/footer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`relative z-10 flex flex-col w-full ${maxWidthClasses[maxWidth]} max-h-[calc(100vh-24px)] max-h-[calc(100dvh-24px)] sm:max-h-[calc(100dvh-32px)] rounded-[26px] bg-[#e2e8dc] text-left shadow-[14px_18px_36px_rgba(50,65,45,0.32),-10px_-10px_24px_rgba(255,255,255,0.85)] border border-[rgba(76,91,70,0.18)] overflow-hidden transition-all duration-180 animate-in fade-in zoom-in-95 ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Pinned at top */}
        <div className="flex items-center justify-between border-b border-[rgba(76,91,70,0.12)] px-5 sm:px-6 py-4 bg-[#dbe2d5]/80 shrink-0">
          <div className="min-w-0 pr-2">
            <h3 id="modal-title" className="font-display text-base sm:text-lg font-bold text-[#26301f] leading-snug truncate">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-[#6b7663] mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6b7663] hover:bg-[#dbe2d5] hover:text-[#26301f] transition shrink-0 active:scale-95"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 flex-1 min-h-0 overflow-y-auto text-[#26301f] overscroll-contain">
          {children}
        </div>

        {/* Footer - Pinned at bottom */}
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 border-t border-[rgba(76,91,70,0.12)] bg-[#dbe2d5]/80 px-5 sm:px-6 py-3.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default Modal;
