import React from 'react';

export type StatusType =
  | 'PRESENT' | 'PRESENT_FULL' | 'APPROVED' | 'PAID' | 'ACTIVE' | 'CONFIRMED' | 'COMPLETED'
  | 'ABSENT' | 'REJECTED' | 'LOP' | 'INACTIVE' | 'CANCELLED' | 'FAILED'
  | 'HALF_DAY' | 'PENDING' | 'WARNING' | 'PROBATION' | 'NOTICE_PERIOD' | 'PARTIAL' | 'SUBMITTED'
  | 'LEAVE' | 'ON_LEAVE' | 'RESIGNED'
  | 'HOLIDAY'
  | 'WFH' | 'WORK_FROM_HOME'
  | 'WEEKEND' | 'NOT_JOINED' | 'DISABLED' | 'RELIEVED' | 'OFF' | 'DRAFT'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  className = '',
  size = 'md',
  showDot = true,
}) => {
  const normalized = (status || '').toUpperCase().trim().replace(/[\s_-]+/g, '_');

  let styleConfig = {
    bg: 'bg-[#F1F5F9]',
    text: 'text-[#475569]',
    border: 'border-[#E2E8F0]',
    dot: 'bg-[#94A3B8]',
  };

  switch (normalized) {
    // 1. Present / Approved / Paid / Active / Confirmed
    case 'PRESENT':
    case 'PRESENT_FULL':
    case 'APPROVED':
    case 'PAID':
    case 'ACTIVE':
    case 'CONFIRMED':
    case 'COMPLETED':
    case 'P':
      styleConfig = {
        bg: 'bg-[#DCFCE7]',
        text: 'text-[#15803D]',
        border: 'border-[#BBF7D0]',
        dot: 'bg-[#16A34A]',
      };
      break;

    // 2. Absent / Rejected / LOP / Inactive / Cancelled
    case 'ABSENT':
    case 'REJECTED':
    case 'LOP':
    case 'INACTIVE':
    case 'CANCELLED':
    case 'FAILED':
    case 'A':
      styleConfig = {
        bg: 'bg-[#FEE2E2]',
        text: 'text-[#B91C1C]',
        border: 'border-[#FECACA]',
        dot: 'bg-[#DC2626]',
      };
      break;

    // 3. Half-Day / Pending / Warning / Probation / Notice Period
    case 'HALF_DAY':
    case 'HALFDAY':
    case 'PENDING':
    case 'WARNING':
    case 'PROBATION':
    case 'NOTICE_PERIOD':
    case 'NOTICEPERIOD':
    case 'PARTIAL':
    case 'SUBMITTED':
    case 'HD':
      styleConfig = {
        bg: 'bg-[#FEF3C7]',
        text: 'text-[#B45309]',
        border: 'border-[#FDE68A]',
        dot: 'bg-[#D97706]',
      };
      break;

    // 4. Leave / Resigned
    case 'LEAVE':
    case 'ON_LEAVE':
    case 'RESIGNED':
    case 'L':
      styleConfig = {
        bg: 'bg-[#E0F2FE]',
        text: 'text-[#0369A1]',
        border: 'border-[#BAE6FD]',
        dot: 'bg-[#0284C7]',
      };
      break;

    // 5. Holiday
    case 'HOLIDAY':
    case 'H':
      styleConfig = {
        bg: 'bg-[#EDE9FE]',
        text: 'text-[#6D28D9]',
        border: 'border-[#DDD6FE]',
        dot: 'bg-[#7C3AED]',
      };
      break;

    // 6. WFH
    case 'WFH':
    case 'WORK_FROM_HOME':
      styleConfig = {
        bg: 'bg-[#CCFBF1]',
        text: 'text-[#0F766E]',
        border: 'border-[#99F6E4]',
        dot: 'bg-[#0D9488]',
      };
      break;

    // 7. Weekend / Not Joined / Disabled / Relieved / Off / Draft
    case 'WEEKEND':
    case 'NOT_JOINED':
    case 'NOTJOINED':
    case 'DISABLED':
    case 'RELIEVED':
    case 'OFF':
    case 'DRAFT':
    case 'WO':
    case 'WEEK_OFF':
    default:
      styleConfig = {
        bg: 'bg-[#F1F5F9]',
        text: 'text-[#475569]',
        border: 'border-[#E2E8F0]',
        dot: 'bg-[#94A3B8]',
      };
      break;
  }

  const formatText = (val: string) => {
    if (label) return label;
    if (!val) return '';
    if (val === 'WFH') return 'WFH';
    if (val === 'LOP') return 'LOP';
    if (val === 'P') return 'Present';
    if (val === 'A') return 'Absent';
    if (val === 'HD') return 'Half Day';
    if (val === 'L') return 'Leave';
    if (val === 'H') return 'Holiday';
    if (val === 'WO') return 'Weekend Off';

    return val
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-xs font-medium gap-1'
      : 'px-2.5 py-1 text-xs font-semibold gap-1.5';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${styleConfig.bg} ${styleConfig.text} ${styleConfig.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`rounded-full ${styleConfig.dot} ${dotSize} shrink-0`} />
      )}
      <span>{formatText(status)}</span>
    </span>
  );
};

export default StatusBadge;
