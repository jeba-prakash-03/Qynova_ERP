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
      bgColor: 'bg-[#FEE2E2]',
      textColor: 'text-[#DC2626]',
      btnVariant: 'danger' as const,
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-[#FEF3C7]',
      textColor: 'text-[#D97706]',
      btnVariant: 'danger' as const,
    },
    primary: {
      icon: Check,
      bgColor: 'bg-[#EEF2FF]',
      textColor: 'text-[#4F46E5]',
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
        <div className={`p-3 rounded-xl shrink-0 ${iconConfig.bgColor} ${iconConfig.textColor}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="text-sm text-[#475569] leading-relaxed pt-1">{message}</div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
