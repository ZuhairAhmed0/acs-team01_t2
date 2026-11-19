import { useLanguage } from '../../app/providers/LanguageProvider.js';
import { Button } from '../ui/Button.js';
import { AlertTriangleIcon, RefreshCwIcon } from '../ui/Icons.js';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useLanguage();

  return (
    <div
      className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center"
      role="alert"
    >
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-500">
        <AlertTriangleIcon size={24} />
      </div>
      <h3 className="text-base font-bold text-content-primary">
        {title ?? t.common.errorOccurred}
      </h3>
      <p className="mt-1 text-sm text-content-secondary">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCwIcon size={16} />}
          >
            {t.common.retry}
          </Button>
        </div>
      )}
    </div>
  );
}

