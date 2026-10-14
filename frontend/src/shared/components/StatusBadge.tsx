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
    bg: 'bg-[#dbe2d5]',
    text: 'text-[#3c4535]',
    border: 'border-[#c0cbba]',
    dot: 'bg-[#6b7663]',
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
        bg: 'bg-[#d8ebd9]',
        text: 'text-[#1e5725]',
        border: 'border-[#b8d6ba]',
        dot: 'bg-[#3f8f4a]',
      };
      break;

    // 2. Absent / Rejected / LOP / Inactive / Cancelled / Failed
    case 'ABSENT':
    case 'REJECTED':
    case 'LOP':
    case 'INACTIVE':
    case 'CANCELLED':
    case 'FAILED':
    case 'A':
      styleConfig = {
        bg: 'bg-[#f6dfd8]',
        text: 'text-[#8a3114]',
        border: 'border-[#e8beae]',
        dot: 'bg-[#c4643f]',
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
        bg: 'bg-[#f7efdd]',
        text: 'text-[#855b11]',
        border: 'border-[#e6d4a8]',
        dot: 'bg-[#cf9b34]',
      };
      break;

    // 4. Leave / Resigned
    case 'LEAVE':
    case 'ON_LEAVE':
    case 'RESIGNED':
    case 'L':
      styleConfig = {
        bg: 'bg-[#dde5f0]',
        text: 'text-[#1c2a42]',
        border: 'border-[#b5c7db]',
        dot: 'bg-[#22304a]',
      };
      break;

    // 5. Holiday
    case 'HOLIDAY':
    case 'H':
      styleConfig = {
        bg: 'bg-[#eadef2]',
        text: 'text-[#44295c]',
        border: 'border-[#d2bfe3]',
        dot: 'bg-[#60437a]',
      };
      break;

    // 6. WFH
    case 'WFH':
    case 'WORK_FROM_HOME':
      styleConfig = {
        bg: 'bg-[#d3ebe7]',
        text: 'text-[#0e5950]',
        border: 'border-[#a9d6cf]',
        dot: 'bg-[#14776b]',
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
        bg: 'bg-[#dbe2d5]',
        text: 'text-[#3c4535]',
        border: 'border-[#c0cbba]',
        dot: 'bg-[#6b7663]',
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
      ? 'px-2 py-0.5 text-[11px] font-semibold gap-1'
      : 'px-2.5 py-1 text-xs font-bold gap-1.5';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-[inset_1px_1px_2px_rgba(88,104,84,0.12),1px_1px_3px_rgba(255,255,255,0.7)] ${styleConfig.bg} ${styleConfig.text} ${styleConfig.border} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span className={`rounded-full ${styleConfig.dot} ${dotSize} shrink-0`} />
      )}
      <span className="truncate">{formatText(status)}</span>
    </span>
  );
};

export default StatusBadge;
