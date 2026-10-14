import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[#26301f]/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className={`relative transform overflow-hidden rounded-[26px] bg-[#e2e8dc] text-left shadow-[14px_18px_36px_rgba(50,65,45,0.32),-10px_-10px_24px_rgba(255,255,255,0.85)] border border-[rgba(76,91,70,0.18)] transition-all sm:my-8 w-full ${maxWidthClasses[maxWidth]}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[rgba(76,91,70,0.12)] px-6 py-4 bg-[#dbe2d5]/60">
            <div>
              <h3 className="font-display text-lg font-bold text-[#26301f] leading-snug">{title}</h3>
              {subtitle && <p className="text-xs text-[#6b7663] mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-[#6b7663] hover:bg-[#dbe2d5] hover:text-[#26301f] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-5 max-h-[calc(85vh-120px)] overflow-y-auto text-[#26301f]">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 border-t border-[rgba(76,91,70,0.12)] bg-[#dbe2d5]/60 px-6 py-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
