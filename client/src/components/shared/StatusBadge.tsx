import { useLanguage } from '../../app/providers/LanguageProvider.js';
import type {
  CongestionLevel,
  TransactionStatus,
  TransactionType,
} from '../../types/api.types.js';
import { Badge, type BadgeTone } from '../ui/Badge.js';

export function TransactionStatusBadge({
  status,
}: {
  status: TransactionStatus;
}) {
  const { t } = useLanguage();
  const tone: BadgeTone =
    status === 'COMPLETED'
      ? 'success'
      : status === 'PENDING'
        ? 'warning'
        : 'danger';

  const label =
    status === 'COMPLETED'
      ? t.transactions.status_COMPLETED
      : status === 'PENDING'
        ? t.transactions.status_PENDING
        : t.transactions.status_FAILED;

  return <Badge tone={tone}>{label}</Badge>;
}

export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const { t } = useLanguage();
  const tone: BadgeTone =
    type === 'TOPUP' ? 'info' : type === 'PAYMENT' ? 'purple' : 'neutral';

  const label =
    type === 'TOPUP'
      ? t.transactions.type_TOPUP
      : type === 'PAYMENT'
        ? t.transactions.type_PAYMENT
        : t.transactions.type_TRANSFER;

  return <Badge tone={tone}>{label}</Badge>;
}

export function CongestionBadge({ level }: { level: CongestionLevel }) {
  const { t } = useLanguage();
  const tone: BadgeTone =
    level === 'LOW' ? 'success' : level === 'MEDIUM' ? 'warning' : 'danger';

  const label =
    level === 'LOW'
      ? t.stations.congestion_LOW
      : level === 'MEDIUM'
        ? t.stations.congestion_MEDIUM
        : t.stations.congestion_HIGH;

  return (
    <Badge tone={tone}>
      {t.stations.congestion}: {label}
    </Badge>
  );
}

