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
      <Loader2 className={`${sizeClasses[size]} animate-spin text-[#14776b]`} />
      {text && <span className="text-sm font-semibold text-[#6b7663]">{text}</span>}
    </div>
  );
};

export default Loader;
