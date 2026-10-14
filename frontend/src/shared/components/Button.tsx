import React, { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className = '',
  disabled,
  type = 'button',
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-full border transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#14776b] focus:ring-offset-2 focus:ring-offset-[#c5d0be] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none select-none';

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  }[size];

  const variantClasses = {
    primary:
      'bg-[#14776b] hover:bg-[#106258] text-white border-transparent shadow-[4px_6px_14px_rgba(20,119,107,0.32),-3px_-3px_9px_rgba(255,255,255,0.70)] active:shadow-[inset_2px_3px_6px_rgba(10,50,45,0.45)]',
    secondary:
      'bg-[#e2e8dc] hover:bg-[#dbe2d5] text-[#26301f] border-[rgba(76,91,70,0.18)] shadow-[4px_5px_12px_rgba(88,104,84,0.22),-3px_-3px_9px_rgba(255,255,255,0.85)] active:shadow-[inset_2px_3px_6px_rgba(88,104,84,0.28)]',
    danger:
      'bg-[#c4643f] hover:bg-[#af5533] text-white border-transparent shadow-[4px_6px_14px_rgba(196,100,63,0.32),-3px_-3px_9px_rgba(255,255,255,0.70)] active:shadow-[inset_2px_3px_6px_rgba(120,40,20,0.45)]',
    success:
      'bg-[#3f8f4a] hover:bg-[#34783d] text-white border-transparent shadow-[4px_6px_14px_rgba(63,143,74,0.32),-3px_-3px_9px_rgba(255,255,255,0.70)] active:shadow-[inset_2px_3px_6px_rgba(30,80,35,0.45)]',
  }[variant];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};

export default Button;
