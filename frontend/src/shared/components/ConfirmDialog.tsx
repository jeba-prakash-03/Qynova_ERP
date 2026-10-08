import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle, Trash2, Check } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const iconConfig = {
    danger: {
      icon: Trash2,
      bgColor: 'bg-rose-100',
      textColor: 'text-rose-600',
      btnColor: 'bg-rose-600 hover:bg-rose-700 text-white',
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-600',
      btnColor: 'bg-amber-600 hover:bg-amber-700 text-white',
    },
    primary: {
      icon: Check,
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-600',
      btnColor: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    },
  }[variant];

  const Icon = iconConfig.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg shadow-sm transition disabled:opacity-50 ${iconConfig.btnColor}`}
          >
            {isLoading ? 'Processing...' : confirmText}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        <div className={`p-3 rounded-xl shrink-0 ${iconConfig.bgColor} ${iconConfig.textColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-sm text-slate-600 leading-relaxed pt-1">{message}</div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
