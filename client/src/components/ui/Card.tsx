import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'hero';
  noPadding?: boolean;
}

export function Card({
  children,
  variant = 'default',
  noPadding = false,
  className = '',
  ...rest
}: CardProps) {
  const baseClass =
    variant === 'hero'
      ? 'wallet-hero-gradient text-white shadow-wallet border border-white/10'
      : variant === 'elevated'
        ? 'bg-surface-elevated border border-surface-border shadow-card'
        : 'bg-surface-card border border-surface-border shadow-card';

  const padClass = noPadding ? '' : 'p-5 sm:p-6';

  return (
    <div
      className={`rounded-2xl transition-colors duration-200 ${baseClass} ${padClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

