import { useId, type SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string | null;
  helperText?: string;
}

export function Select({
  label,
  options,
  error,
  helperText,
  className = '',
  id: providedId,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const selectId = providedId ?? generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-content-primary"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`w-full rounded-xl border bg-surface-elevated px-3.5 py-2.5 text-sm text-content-primary transition-colors focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-500 focus:ring-red-500/30'
            : 'border-surface-border focus:border-brand-primary focus:ring-brand-primary/30'
        } disabled:opacity-60 ${className}`}
        {...rest}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs font-medium text-red-500" role="alert">
          {error}
        </p>
      ) : (
        helperText && <p className="text-xs text-content-muted">{helperText}</p>
      )}
    </div>
  );
}

