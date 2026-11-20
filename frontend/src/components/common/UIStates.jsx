import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Inbox, AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { STATUS_LABELS } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function LoadingState({ message = 'Memuat data...' }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-3 py-12 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Belum ada data',
  description = 'Data yang Anda cari belum tersedia saat ini.',
  action = null,
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Gagal memuat data.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-red-200 bg-red-50/60 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 h-8 w-8 text-red-500" />
      <p className="text-sm font-medium text-red-800">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-outline mt-4">
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || {
    label: status || '-',
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.color}`}
    >
      {cfg.label}
    </span>
  );
}

export function ConfirmModal({
  open,
  title = 'Konfirmasi Tindakan',
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-bold text-navy-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        <div className="mt-6 flex justify-end gap-2.5">
          <button type="button" onClick={onClose} disabled={loading} className="btn-outline">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={danger ? 'btn-danger' : 'btn-primary'}
          >
            {loading ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Pagination({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
      <p className="text-xs text-slate-500">
        Halaman <span className="font-semibold text-slate-800">{page}</span> dari{' '}
        <span className="font-semibold text-slate-800">{totalPages}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="btn-outline px-3 py-1.5 text-xs"
        >
          <ChevronLeft className="h-4 w-4" /> Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="btn-outline px-3 py-1.5 text-xs"
        >
          Berikutnya <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingState message="Memeriksa sesi login..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  if (allowedRoles.length > 0) {
    const allowed = allowedRoles.some((r) => user?.roles?.includes(r));
    if (!allowed) {
      return (
        <div className="mx-auto max-w-lg px-4 py-20 text-center">
          <div className="card p-8">
            <AlertTriangle className="mx-auto mb-3 h-12 w-12 text-amber-500" />
            <h2 className="text-xl font-bold text-navy-900">Akses Ditolak</h2>
            <p className="mt-2 text-sm text-slate-600">
              Akun Anda tidak memiliki hak akses untuk membuka dashboard ini. Hanya role{' '}
              <span className="font-semibold">{allowedRoles.join(' / ')}</span> yang diperbolehkan.
            </p>
            <a href="/" className="btn-primary mt-6 inline-flex">
              Kembali ke Beranda
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
}
