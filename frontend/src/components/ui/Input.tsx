import React, { forwardRef } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold tracking-wider text-gov-slate uppercase"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm bg-white border rounded text-gov-dark placeholder-gov-muted transition-colors focus:outline-none focus:ring-1 focus:ring-gov-navy focus:border-gov-navy disabled:bg-slate-100 disabled:text-slate-400',
            error ? 'border-status-error focus:ring-status-error focus:border-status-error' : 'border-gov-border',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-status-error font-medium">{error}</p>}
        {!error && helperText && <p className="text-xs text-gov-muted">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
