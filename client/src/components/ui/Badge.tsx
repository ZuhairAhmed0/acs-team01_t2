import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

const toneClasses: Record<BadgeTone, string> = {
  success:
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  warning:
    'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  purple:
    'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  neutral:
    'bg-surface-elevated text-content-secondary border-surface-border',
};

export function Badge({
  tone = 'neutral',
  className = '',
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClasses[tone]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}

