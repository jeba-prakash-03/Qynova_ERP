import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    if (!message) return;
    const cleanMsg = message.trim();

    setToasts((prev) => {
      // Deduplicate: Don't stack identical toasts
      const isDuplicate = prev.some((t) => t.message === cleanMsg && t.type === type);
      if (isDuplicate) return prev;

      const id = Math.random().toString(36).substring(2, 9);
      // Cap at 3 active toasts
      const capped = prev.length >= 3 ? prev.slice(1) : prev;
      return [...capped, { id, type, message: cleanMsg }];
    });
  }, []);

  // Auto-remove individual toasts after 4500ms
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  const success = useCallback((message: string) => addToast(message, 'success'), [addToast]);
  const error = useCallback((message: string) => addToast(message, 'error'), [addToast]);
  const info = useCallback((message: string) => addToast(message, 'info'), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, info }}>
      {children}
      {/* Toast Render Area */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-[20px] shadow-[8px_10px_24px_rgba(88,104,84,0.30),-4px_-4px_12px_rgba(255,255,255,0.85)] border border-[rgba(76,91,70,0.18)] bg-[#e2e8dc] text-sm transition-all duration-300 animate-slide-in ${
              t.type === 'success'
                ? 'text-[#1e5725]'
                : t.type === 'error'
                ? 'text-[#8a3114]'
                : 'text-[#14776b]'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#3f8f4a] shrink-0 mt-0.5" />}
            {t.type === 'error' && <AlertCircle className="w-5 h-5 text-[#c4643f] shrink-0 mt-0.5" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-[#14776b] shrink-0 mt-0.5" />}

            <div className="flex-1 font-semibold leading-snug">{t.message}</div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-[#6b7663] hover:text-[#26301f] p-1 rounded-full hover:bg-[#dbe2d5] transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
