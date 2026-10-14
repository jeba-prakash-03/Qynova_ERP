import React from 'react';

interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  helperText,
  required = false,
  className = '',
  children,
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-xs font-bold uppercase tracking-wider text-[#6b7663] flex items-center gap-1 cursor-pointer select-none"
        >
          {label}
          {required && <span className="text-[#c4643f] font-bold" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error && <span className="text-xs text-[#c4643f] font-semibold">{error}</span>}
      {!error && helperText && <span className="text-xs text-[#6b7663]">{helperText}</span>}
    </div>
  );
};

export default FormField;
