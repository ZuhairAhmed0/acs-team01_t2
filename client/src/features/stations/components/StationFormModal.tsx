import { useState, type FormEvent } from 'react';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { Button } from '../../../components/ui/Button.js';
import { Input } from '../../../components/ui/Input.js';
import { Modal } from '../../../components/ui/Modal.js';
import { Select } from '../../../components/ui/Select.js';
import { extractApiError } from '../../../lib/axios.js';
import type { CongestionLevel, StationDto } from '../../../types/api.types.js';
import {
  useCreateStationMutation,
  useUpdateStationMutation,
} from '../hooks/useStations.js';

export interface StationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If provided, the modal edits this station; otherwise it creates a new station. */
  station: StationDto | null;
}

export function StationFormModal({
  isOpen,
  onClose,
  station,
}: StationFormModalProps) {
  const { lang } = useLanguage();
  const isEditing = Boolean(station);

  const title = isEditing
    ? lang === 'ar'
      ? 'تعديل بيانات المحطة'
      : 'Edit Fuel Station'
    : lang === 'ar'
      ? 'إضافة محطة وقود جديدة'
      : 'Add New Fuel Station';

  const subtitle = isEditing
    ? lang === 'ar'
      ? 'تحديث الاسم، المدينة، العنوان، حالة الازدحام، أو حالة التفعيل'
      : 'Update station name, city, address, congestion level, or active status'
    : lang === 'ar'
      ? 'سيتم إنشاء محطة جديدة مع محفظة إيرادات خاصة بها تلقائياً'
      : 'Creates a new participating station and its dedicated revenue wallet';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} subtitle={subtitle}>
      {isOpen && (
        <StationFormBody
          key={station?.id ?? 'new-station'}
          station={station}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function StationFormBody({
  station,
  onClose,
}: {
  station: StationDto | null;
  onClose: () => void;
}) {
  const { t, lang } = useLanguage();
  const createMutation = useCreateStationMutation();
  const updateMutation = useUpdateStationMutation();

  const [name, setName] = useState(station?.name ?? '');
  const [city, setCity] = useState(station?.city ?? '');
  const [address, setAddress] = useState(station?.address ?? '');
  const [congestion, setCongestion] = useState<CongestionLevel>(
    station?.congestion ?? 'LOW',
  );
  const [isActive, setIsActive] = useState<boolean>(station?.isActive ?? true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const isPending = createMutation.isPending || updateMutation.isPending;
  const activeError = createMutation.error ?? updateMutation.error;
  const apiError = activeError ? extractApiError(activeError) : null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedName = name.trim();
    const trimmedCity = city.trim();
    const trimmedAddress = address.trim();

    if (trimmedName.length < 2) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال اسم المحطة (حرفين على الأقل).'
          : 'Please enter a station name (at least 2 characters).',
      );
      return;
    }

    if (trimmedCity.length < 2) {
      setValidationError(
        lang === 'ar'
          ? 'يرجى إدخال اسم المدينة (حرفين على الأقل).'
          : 'Please enter a city name (at least 2 characters).',
      );
      return;
    }

    if (station) {
      updateMutation.mutate(
        {
          id: station.id,
          payload: {
            name: trimmedName,
            city: trimmedCity,
            address: trimmedAddress || null,
            congestion,
            isActive,
          },
        },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          name: trimmedName,
          city: trimmedCity,
          address: trimmedAddress || null,
          congestion,
          isActive,
        },
        {
          onSuccess: () => {
            onClose();
          },
        },
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={lang === 'ar' ? 'اسم المحطة' : 'Station Name'}
        placeholder={
          lang === 'ar' ? 'مثال: محطة النيل — الخرطوم' : 'e.g. Nile Station'
        }
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />

      <Input
        label={lang === 'ar' ? 'المدينة' : 'City'}
        placeholder={lang === 'ar' ? 'مثال: الخرطوم / بورتسودان' : 'e.g. Khartoum'}
        value={city}
        onChange={(e) => setCity(e.target.value)}
        required
      />

      <Input
        label={lang === 'ar' ? 'العنوان التفصيلي (اختياري)' : 'Address (Optional)'}
        placeholder={
          lang === 'ar' ? 'مثال: شارع المطار' : 'e.g. Airport Road'
        }
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label={lang === 'ar' ? 'مستوى الازدحام' : 'Congestion Level'}
          value={congestion}
          onChange={(e) => setCongestion(e.target.value as CongestionLevel)}
          options={[
            { value: 'LOW', label: t.stations.congestion_LOW },
            { value: 'MEDIUM', label: t.stations.congestion_MEDIUM },
            { value: 'HIGH', label: t.stations.congestion_HIGH },
          ]}
        />

        <Select
          label={lang === 'ar' ? 'حالة المحطة' : 'Station Status'}
          value={isActive ? 'ACTIVE' : 'INACTIVE'}
          onChange={(e) => setIsActive(e.target.value === 'ACTIVE')}
          options={[
            { value: 'ACTIVE', label: t.stations.active },
            { value: 'INACTIVE', label: t.stations.inactive },
          ]}
        />
      </div>

      {validationError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
          {validationError}
        </p>
      )}

      {apiError && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs font-semibold text-red-500">
          {apiError.message}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isPending}
        >
          {t.common.cancel}
        </Button>
        <Button type="submit" variant="primary" isLoading={isPending}>
          {station
            ? lang === 'ar'
              ? 'حفظ التعديلات'
              : 'Save Changes'
            : lang === 'ar'
              ? 'إضافة المحطة'
              : 'Create Station'}
        </Button>
      </div>
    </form>
  );
}

