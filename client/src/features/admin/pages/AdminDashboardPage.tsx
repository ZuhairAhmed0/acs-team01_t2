import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../../app/providers/LanguageProvider.js';
import { CongestionBadge } from '../../../components/shared/StatusBadge.js';
import { Badge } from '../../../components/ui/Badge.js';
import { Button } from '../../../components/ui/Button.js';
import { Card } from '../../../components/ui/Card.js';
import {
  ActivityIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  EditIcon,
  PlusCircleIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '../../../components/ui/Icons.js';
import { Input } from '../../../components/ui/Input.js';
import { extractApiError } from '../../../lib/axios.js';
import { formatDateTime } from '../../../lib/format.js';
import type { StationDto, UserStatus } from '../../../types/api.types.js';
import { useCurrentUser } from '../../auth/hooks/useCurrentUser.js';
import { StationFormModal } from '../../stations/components/StationFormModal.js';
import {
  useDeleteStationMutation,
  useStationsQuery,
} from '../../stations/hooks/useStations.js';
import {
  useAdminBankStatusQuery,
  useAdminReconcileQuery,
  useToggleStationActiveMutation,
  useUpdateBankStatusMutation,
  useUpdateUserStatusMutation,
} from '../hooks/useAdmin.js';

export function AdminDashboardPage() {
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const { user } = useCurrentUser();

  const bankStatusQuery = useAdminBankStatusQuery();
  const updateBankMutation = useUpdateBankStatusMutation();
  const reconcileQuery = useAdminReconcileQuery();
  const stationsQuery = useStationsQuery();
  const toggleStationMutation = useToggleStationActiveMutation();
  const deleteStationMutation = useDeleteStationMutation();
  const updateUserMutation = useUpdateUserStatusMutation();

  const [targetUserId, setTargetUserId] = useState(() => user?.id ?? '');
  const [userActionSuccess, setUserActionSuccess] = useState<string | null>(
    null,
  );
  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<StationDto | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const bankStatus = bankStatusQuery.data?.status ?? 'UP';
  const recon = reconcileQuery.data;
  const stations = stationsQuery.data ?? [];

  const handleUserStatusUpdate = (status: UserStatus, e: FormEvent) => {
    e.preventDefault();
    setUserActionSuccess(null);
    const trimmed = targetUserId.trim();
    if (!trimmed) return;

    updateUserMutation.mutate(
      { userId: trimmed, status },
      {
        onSuccess: (res) => {
          setUserActionSuccess(
            lang === 'ar'
              ? `تم تحديث حالة المستخدم (${res.id.slice(0, 8)}...) إلى ${res.status}`
              : `User (${res.id.slice(0, 8)}...) updated to ${res.status}`,
          );
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-content-primary sm:text-2xl">
          {t.admin.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-content-secondary">
          {t.admin.subtitle}
        </p>
      </div>

      {/* Top Row: Bank Gateway Switch & Double-Entry Ledger Reconciliation */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bank Gateway Simulator Switch */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-content-primary">
              {t.admin.bankGatewayTitle}
            </h2>
            <Badge tone={bankStatus === 'UP' ? 'success' : 'danger'}>
              {bankStatus === 'UP' ? t.admin.bankUp : t.admin.bankDown}
            </Badge>
          </div>

          <p className="text-xs text-content-secondary">{t.admin.bankNote}</p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              variant={bankStatus === 'UP' ? 'danger' : 'success'}
              isLoading={updateBankMutation.isPending}
              onClick={() =>
                updateBankMutation.mutate(bankStatus === 'UP' ? 'DOWN' : 'UP')
              }
            >
              {bankStatus === 'UP'
                ? t.admin.toggleBankDown
                : t.admin.toggleBankUp}
            </Button>
          </div>
        </Card>

        {/* Double-Entry Ledger Reconciliation */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheckIcon size={19} className="text-brand-primary" />
              <h2 className="text-base font-bold text-content-primary">
                {t.admin.reconcileTitle}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              isLoading={reconcileQuery.isFetching}
              onClick={() => {
                void reconcileQuery.refetch();
              }}
              leftIcon={<RefreshCwIcon size={14} />}
            >
              {t.admin.runReconcile}
            </Button>
          </div>

          {recon && (
            <div
              className={`rounded-xl border p-4 text-xs sm:text-sm space-y-2 ${
                recon.ok
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600'
                  : 'border-red-500/40 bg-red-500/10 text-red-500'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {recon.ok ? (
                  <CheckCircleIcon size={18} />
                ) : (
                  <AlertTriangleIcon size={18} />
                )}
                <span>
                  {recon.ok ? t.admin.reconcileOk : t.admin.reconcileIssues}
                </span>
              </div>
              <p className="font-mono text-xs opacity-80">
                Checked At: {formatDateTime(recon.checkedAt, lang)} • Issues:{' '}
                {recon.issues.length}
              </p>

              {recon.issues.length > 0 && (
                <ul className="list-disc ps-5 space-y-1 text-xs">
                  {recon.issues.map((issue, idx) => (
                    <li key={idx}>
                      <strong>{issue.kind}</strong>: {issue.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Stations Management & Station Revenue Inspection */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-content-primary">
            {t.admin.stationsManagement}
          </h2>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              setEditingStation(null);
              setIsStationModalOpen(true);
            }}
            leftIcon={<PlusCircleIcon size={15} />}
          >
            {lang === 'ar' ? 'إضافة محطة جديدة' : 'Add Station'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {stations.map((st) => (
            <div
              key={st.id}
              className="flex flex-col justify-between gap-4 rounded-xl border border-surface-border bg-surface-elevated p-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-extrabold text-content-primary">
                    {st.name}
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={st.isActive ? 'success' : 'danger'}>
                      {st.isActive ? t.stations.active : t.stations.inactive}
                    </Badge>
                    <CongestionBadge level={st.congestion} />
                  </div>
                </div>
                <p className="text-xs text-content-secondary">
                  {st.city} {st.address ? `• ${st.address}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-surface-border pt-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant={st.isActive ? 'danger' : 'success'}
                    isLoading={
                      toggleStationMutation.isPending &&
                      toggleStationMutation.variables?.stationId === st.id
                    }
                    onClick={() =>
                      toggleStationMutation.mutate({
                        stationId: st.id,
                        isActive: !st.isActive,
                      })
                    }
                  >
                    {st.isActive
                      ? t.admin.deactivateStation
                      : t.admin.activateStation}
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/operator?stationId=${st.id}`)}
                    leftIcon={<ActivityIcon size={14} />}
                  >
                    {t.admin.inspectStationOperatorView}
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingStation(st);
                      setIsStationModalOpen(true);
                    }}
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
                        onClick={() =>
                          deleteStationMutation.mutate(st.id, {
                            onSuccess: () => setConfirmDeleteId(null),
                          })
                        }
                      >
                        {lang === 'ar' ? 'تأكيد' : 'Confirm'}
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
            </div>
          ))}
        </div>
      </Card>

      {/* User Status Management (ACTIVE / FROZEN) */}
      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-content-primary">
            {t.admin.userManagementTitle}
          </h2>
          <p className="mt-0.5 text-xs text-content-secondary">
            Endpoint: <code>PATCH /api/admin/users/:id</code>
          </p>
        </div>

        <div className="space-y-3">
          <Input
            label={t.admin.userIdLabel}
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="font-mono"
          />

          <div className="flex flex-wrap gap-3">
            <Button
              variant="danger"
              size="sm"
              isLoading={
                updateUserMutation.isPending &&
                updateUserMutation.variables?.status === 'FROZEN'
              }
              onClick={(e) => handleUserStatusUpdate('FROZEN', e)}
            >
              {t.admin.freezeUser}
            </Button>

            <Button
              variant="success"
              size="sm"
              isLoading={
                updateUserMutation.isPending &&
                updateUserMutation.variables?.status === 'ACTIVE'
              }
              onClick={(e) => handleUserStatusUpdate('ACTIVE', e)}
            >
              {t.admin.activateUser}
            </Button>
          </div>

          {userActionSuccess && (
            <p className="text-xs font-bold text-emerald-500">
              {userActionSuccess}
            </p>
          )}

          {updateUserMutation.isError && (
            <p className="text-xs font-bold text-red-500">
              {extractApiError(updateUserMutation.error).message}
            </p>
          )}
        </div>
      </Card>

      <StationFormModal
        isOpen={isStationModalOpen}
        onClose={() => {
          setIsStationModalOpen(false);
          setEditingStation(null);
        }}
        station={editingStation}
      />
    </div>
  );
}
