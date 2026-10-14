import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
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
      bgColor: 'bg-[#f6dfd8] border border-[#e8beae]',
      textColor: 'text-[#8a3114]',
      btnVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-[#f7efdd] border border-[#e6d4a8]',
      textColor: 'text-[#855b11]',
      btnVariant: 'danger' as const,
    },
    primary: {
      icon: Check,
      bgColor: 'bg-[#d8ebd9] border border-[#b8d6ba]',
      textColor: 'text-[#1e5725]',
      btnVariant: 'primary' as const,
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
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={iconConfig.btnVariant}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 py-2">
        <div className={`p-3 rounded-2xl shrink-0 shadow-[inset_1px_1px_3px_rgba(88,104,84,0.15)] ${iconConfig.bgColor} ${iconConfig.textColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-sm text-[#35422d] leading-relaxed pt-1 font-medium">{message}</div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
