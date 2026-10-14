import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-[#dbe2d5] border border-[rgba(76,91,70,0.18)] shadow-[4px_5px_12px_rgba(88,104,84,0.22),-3px_-3px_9px_rgba(255,255,255,0.85)] flex items-center justify-center text-[#14776b] mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="font-display text-base font-bold text-[#26301f] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#6b7663] max-w-sm mb-5 leading-relaxed">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#14776b] hover:bg-[#106258] rounded-full shadow-[4px_6px_14px_rgba(20,119,107,0.32),-3px_-3px_9px_rgba(255,255,255,0.7)] active:shadow-[inset_2px_3px_6px_rgba(10,50,45,0.45)] transition"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
