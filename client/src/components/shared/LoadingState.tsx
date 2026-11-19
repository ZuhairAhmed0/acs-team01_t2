import { useLanguage } from '../../app/providers/LanguageProvider.js';

export function LoadingState({ message }: { message?: string }) {
  const { t } = useLanguage();

  return (
    <div
      className="flex flex-col items-center justify-center py-12 px-4 text-center"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-primary border-t-transparent mb-3" />
      <p className="text-sm font-medium text-content-secondary">
        {message ?? t.common.loading}
      </p>
    </div>
  );
}

