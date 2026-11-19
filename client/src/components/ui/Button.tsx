import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Reusable Financial UI Button Component.
 *
 * Automatically disables interaction when `isLoading` is true to prevent
 * duplicate form submissions (critical for financial operations like top-ups, payments, and transfers).
 */

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-primary hover:bg-brand-primary/90 text-white shadow-sm shadow-brand-primary/20',
  secondary:
    'bg-brand-secondary hover:bg-brand-secondary/90 text-white shadow-sm shadow-brand-secondary/20',
  outline:
    'border border-surface-border bg-surface-card hover:bg-surface-elevated text-content-primary',
  ghost:
    'bg-transparent hover:bg-surface-elevated text-content-secondary hover:text-content-primary',
  danger: 'bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-600/20',
  success:
    'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-xl gap-2',
  lg: 'px-5 py-3 text-base rounded-xl gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = Boolean(disabled || isLoading);

  return (
    <button
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-55 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
}

