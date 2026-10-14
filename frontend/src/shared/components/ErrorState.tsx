import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'We encountered an error while loading this data. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center rounded-[24px] bg-[#f6dfd8]/75 border border-[#e8beae] shadow-[6px_8px_20px_rgba(196,100,63,0.18)] ${className}`}>
      <div className="w-12 h-12 rounded-2xl bg-[#e8beae] text-[#8a3114] flex items-center justify-center mb-3 shadow-[inset_1px_1px_3px_rgba(88,104,84,0.15)]">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h3 className="font-display text-base font-bold text-[#8a3114] mb-1">{title}</h3>
      <p className="text-sm text-[#8a3114] max-w-md mb-4 leading-relaxed">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-[#8a3114] bg-[#e2e8dc] border border-[#e8beae] hover:bg-[#dbe2d5] rounded-full shadow-[2px_3px_8px_rgba(88,104,84,0.18)] transition"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      )}
    </div>
  );
};

export default ErrorState;
