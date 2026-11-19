import { useEffect, type ReactNode } from 'react';
import { useLanguage } from '../../app/providers/LanguageProvider.js';
import { Button } from './Button.js';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-lg',
}: ModalProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-2xl border border-surface-border bg-surface-card p-6 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-surface-border pb-4 mb-5">
          <div>
            <h2
              id="modal-title"
              className="text-lg font-bold text-content-primary"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-content-secondary">{subtitle}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t.common.close}
          </Button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

