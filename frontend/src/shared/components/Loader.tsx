import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', text = 'Loading...', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 gap-3 text-[#6b7663] ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[#dbe2d5] flex items-center justify-center border border-[rgba(76,91,70,0.14)] shadow-[inset_2px_2px_4px_rgba(104,118,100,0.18)]">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-[#14776b]`} />
      </div>
      {text && <span className="text-sm font-semibold text-[#6b7663] font-display">{text}</span>}
    </div>
  );
};

export const SkeletonCard: React.FC<{ lines?: number; className?: string }> = ({
  lines,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#e2e8dc] rounded-[22px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.22),-6px_-7px_18px_rgba(255,255,255,0.7)] flex flex-col justify-between gap-4 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-28 clay-skeleton" />
        <div className="w-9 h-9 rounded-[14px] clay-skeleton" />
      </div>
      <div className="space-y-2">
        <div className="h-7 w-20 clay-skeleton" />
        <div className="h-3 w-36 clay-skeleton" />
        {lines &&
          Array.from({ length: Math.max(0, lines - 2) }).map((_, idx) => (
            <div key={idx} className="h-3 w-4/5 clay-skeleton" />
          ))}
      </div>
      <div className="h-3 w-24 clay-skeleton" />
    </div>
  );
};

export const SkeletonTable: React.FC<{
  rows?: number;
  columns?: number;
  cols?: number;
  className?: string;
}> = ({ rows = 5, columns, cols, className = '' }) => {
  const columnCount = columns || cols || 5;

  return (
    <div
      className={`bg-[#e2e8dc] rounded-[26px] border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.28),-6px_-7px_18px_rgba(255,255,255,0.78)] overflow-hidden p-4 space-y-4 ${className}`}
    >
      <div className="flex justify-between items-center gap-4">
        <div className="h-9 w-64 clay-skeleton" />
        <div className="h-9 w-28 clay-skeleton" />
      </div>
      <div className="space-y-3">
        <div className="h-8 w-full clay-skeleton" />
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex gap-3">
            {Array.from({ length: columnCount }).map((_, cIdx) => (
              <div key={cIdx} className="h-7 flex-1 clay-skeleton" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonChart: React.FC<{ height?: string; className?: string }> = ({
  height = 'h-64',
  className = '',
}) => {
  return (
    <div
      className={`bg-[#e2e8dc] rounded-[26px] p-5 border border-[rgba(76,91,70,0.14)] shadow-[8px_10px_24px_rgba(88,104,84,0.24),-6px_-7px_18px_rgba(255,255,255,0.7)] space-y-4 ${className}`}
    >
      <div className="flex justify-between items-center">
        <div className="h-5 w-40 clay-skeleton" />
        <div className="h-4 w-20 clay-skeleton" />
      </div>
      <div className={`${height} w-full clay-skeleton`} />
    </div>
  );
};

export default Loader;
