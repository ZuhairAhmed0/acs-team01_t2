import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { EmptyState } from '../../../components/shared/EmptyState.js';
import { ErrorState } from '../../../components/shared/ErrorState.js';
import { LoadingState } from '../../../components/shared/LoadingState.js';
import { CongestionBadge } from '../../../components/shared/StatusBadge.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  ArrowLeftRightIcon,
  EditIcon,
  FuelIcon,
  PlusCircleIcon,
  ReceiptIcon,
  SearchIcon,
  TrashIcon,
} from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { Select } from '../../../components/ui/Select.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatMoney } from '../../../lib/format.js';
import type { StationDto } from '../../../types/api.types.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { StationFormModal } from '../components/StationFormModal.js';
import {
  useDeleteStationMutation,
  useStationsQuery,
} from '../hooks/useStations.js';

export function StationsPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { user, wallets } = useCurrentUser();

  const [selectedCity, setSelectedCity] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<StationDto | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Query all stations once to derive unique cities, and also query filtered by city when selected
  const allStationsQuery = useStationsQuery();
  const stationsQuery = useStationsQuery(selectedCity || undefined);
  const deleteStationMutation = useDeleteStationMutation();

  const cities = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStationsQuery.data ?? []) {
      if (s.city) set.add(s.city);
    }
    return Array.from(set);
  }, [allStationsQuery.data]);

  const filteredStations = useMemo(() => {
    const list = stationsQuery.data ?? [];
    const q = searchTerm.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        (s.address && s.address.toLowerCase().includes(q)),
    );
  }, [stationsQuery.data, searchTerm]);

  const isFrozen = user?.status === 'FROZEN';
  const mainWalletId = wallets?.main.id ?? '';

  const handleOpenCreate = () => {
    setEditingStation(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (station: StationDto) => {
    setEditingStation(station);
    setIsModalOpen(true);
  };

  const handleDeleteStation = (stationId: string) => {
    deleteStationMutation.mutate(stationId, {
      onSuccess: () => {
        setConfirmDeleteId(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
            {t.stations.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-content-secondary">
            {t.stations.subtitle}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          leftIcon={<PlusCircleIcon size={17} />}
        >
          {lang === 'ar' ? 'إضافة محطة جديدة' : 'Add Station'}
        </Button>
      </div>

      {/* Search & Backend City Filter Bar */}
      <Card className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            placeholder={t.stations.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftAdornment={<SearchIcon size={16} />}
          />
        </div>
        <div>
          <Select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            options={[
              { value: '', label: t.stations.allCities },
              ...cities.map((c) => ({ value: c, label: c })),
            ]}
          />
        </div>
      </Card>

      {stationsQuery.isLoading ? (
        <LoadingState />
      ) : stationsQuery.isError ? (
        <ErrorState
          message={extractApiError(stationsQuery.error).message}
          onRetry={() => {
            void stationsQuery.refetch();
          }}
        />
      ) : filteredStations.length === 0 ? (
        <EmptyState
          icon={<FuelIcon size={24} />}
          title={t.stations.noStations}
          action={
            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenCreate}
              leftIcon={<PlusCircleIcon size={15} />}
            >
              {lang === 'ar' ? 'إضافة محطة جديدة' : 'Add Station'}
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredStations.map((st) => (
            <Card key={st.id} className="flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-extrabold text-content-primary">
                        {st.name}
                      </h2>
                      <Badge tone={st.isActive ? 'success' : 'danger'}>
                        {st.isActive ? t.stations.active : t.stations.inactive}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-content-secondary">
                      {st.city} {st.address ? `• ${st.address}` : ''}
                    </p>
                  </div>
                  <CongestionBadge level={st.congestion} />
                </div>

                {/* Balances Breakdown at this Station */}
                <div className="grid grid-cols-3 gap-2 rounded-xl border border-surface-border bg-surface-elevated p-3 text-center">
                  <div>
                    <p className="text-[11px] text-content-secondary">
                      {t.stations.myStationBalance}
                    </p>
                    <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-brand-primary">
                      {formatMoney(st.myStationBalance, lang)}
                    </p>
                  </div>
                  <div className="border-x border-surface-border px-1">
                    <p className="text-[11px] text-content-secondary">
                      {t.stations.mainBalance}
                    </p>
                    <p className="mt-0.5 font-mono text-xs sm:text-sm font-bold text-content-primary">
                      {formatMoney(st.mainBalance, lang)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-content-secondary">
                      {t.stations.availableHere}
                    </p>
                    <p className="mt-0.5 font-mono text-xs sm:text-sm font-extrabold text-emerald-500">
                      {formatMoney(st.availableHere, lang)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={!st.isActive || isFrozen}
                    onClick={() =>
                      navigate(
                        `/pay?stationId=${st.id}${
                          st.myStationWalletId && st.myStationBalance > 0
                            ? `&walletId=${st.myStationWalletId}`
                            : mainWalletId
                              ? `&walletId=${mainWalletId}`
                              : ''
                        }`,
                      )
                    }
                    leftIcon={<ReceiptIcon size={15} />}
                  >
                    {t.stations.payHere}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!st.isActive || isFrozen}
                    onClick={() => navigate(`/transfer?toStationId=${st.id}`)}
                    leftIcon={<ArrowLeftRightIcon size={15} />}
                  >
                    {t.stations.transferHere}
                  </Button>
                </div>

                {/* Edit & Delete Station Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(st)}
                    leftIcon={<EditIcon size={14} />}
                  >
                    {lang === 'ar' ? 'تعديل' : 'Edit'}
                  </Button>

                  {confirmDeleteId === st.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="danger"
                        isLoading={
                          deleteStationMutation.isPending &&
                          deleteStationMutation.variables === st.id
                        }
                        onClick={() => handleDeleteStation(st.id)}
                      >
                        {lang === 'ar' ? 'تأكيد الحذف' : 'Confirm'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirmDeleteId(null)}
                      >
                        {t.common.cancel}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-500/10"
                      onClick={() => setConfirmDeleteId(st.id)}
                      leftIcon={<TrashIcon size={14} />}
                    >
                      {lang === 'ar' ? 'حذف' : 'Delete'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <StationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStation(null);
        }}
        station={editingStation}
      />
    </div>
  );
}
