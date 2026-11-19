import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
  helperText?: string;
  leftAdornment?: ReactNode;
  rightAdornment?: ReactNode;
}

export function Input({
  label,
  error,
  helperText,
  leftAdornment,
  rightAdornment,
  className = '',
  id: providedId,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const inputId = providedId ?? generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-content-primary"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftAdornment && (
          <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-content-muted">
            {leftAdornment}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full rounded-xl border bg-surface-elevated px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-muted transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-surface-border focus:border-brand-primary focus:ring-brand-primary/30'
          } ${leftAdornment ? 'ps-10' : ''} ${rightAdornment ? 'pe-12' : ''} disabled:opacity-60 ${className}`}
          {...rest}
        />
        {rightAdornment && (
          <div className="absolute inset-y-0 end-0 flex items-center pe-3 text-content-secondary">
            {rightAdornment}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      ) : (
        helperText && (
          <p className="text-xs text-content-muted">{helperText}</p>
        )
      )}
    </div>
  );
}

