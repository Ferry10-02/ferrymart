import { useState, useEffect, useCallback } from 'react';
import { Wallet, CheckCircle2, XCircle, Building2, X } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function AdminPayoutsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0, pendingAmount: 0, approvedAmount: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState(null); // { payout, action }
  const [transferRef, setTransferRef] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadPayouts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payouts', { params: { status: statusFilter } });
      setItems(res.data.data.items || []);
      setSummary(res.data.data.summary || {});
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadPayouts();
  }, [loadPayouts]);

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!activeModal) return;
    setProcessing(true);
    try {
      const res = await api.put(`/admin/payouts/${activeModal.payout.id}/process`, {
        action: activeModal.action,
        transferRef,
        adminNote,
      });
      toast.success(res.data.message);
      setActiveModal(null);
      setTransferRef('');
      setAdminNote('');
      loadPayouts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Pencairan Saldo Seller (Payout)</h2>
        <p className="text-sm text-slate-500">
          Verifikasi & transfer pengajuan penarikan saldo dari toko seller. Notifikasi otomatis dikirim ke Seller saat disetujui.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Menunggu Transfer ({summary.pending || 0})</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{formatIDR(summary.pendingAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Sudah Ditransfer ({summary.approved || 0})</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">{formatIDR(summary.approvedAmount)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Ditolak</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-700">{summary.rejected || 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'Semua' },
          { key: 'PENDING', label: 'Menunggu Transfer' },
          { key: 'APPROVED', label: 'Selesai Ditransfer' },
          { key: 'REJECTED', label: 'Ditolak' },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatusFilter(t.key)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              statusFilter === t.key
                ? 'bg-primary-500 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Belum Ada Pengajuan Pencairan"
          description="Pengajuan tarik saldo dari Seller akan muncul di sini."
        />
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-navy-900">{p.storeName}</span>
                  <StatusBadge status={p.status} />
                  <span className="text-xs text-slate-400">{formatDate(p.createdAt)}</span>
                </div>
                <p className="text-xl font-extrabold text-primary-600">{formatIDR(p.amount)}</p>
                <p className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <strong>{p.bankName}</strong> • <span className="font-mono">{p.bankAccountNumber}</span> a.n.{' '}
                  <strong>{p.bankAccountHolder}</strong>
                </p>
                {p.note && <p className="text-xs text-slate-500">Catatan Seller: {p.note}</p>}
                {p.transferRef && (
                  <p className="text-xs font-semibold text-emerald-700">Ref Transfer: {p.transferRef}</p>
                )}
                {p.adminNote && <p className="text-xs text-slate-500">Catatan Admin: {p.adminNote}</p>}
              </div>

              {p.status === 'PENDING' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal({ payout: p, action: 'APPROVE' });
                      setTransferRef('');
                      setAdminNote('');
                    }}
                    className="btn-primary px-3.5 py-2 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Setujui & Tandai Ditransfer
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal({ payout: p, action: 'REJECT' });
                      setTransferRef('');
                      setAdminNote('');
                    }}
                    className="btn-danger px-3.5 py-2 text-xs"
                  >
                    <XCircle className="h-4 w-4" /> Tolak
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleProcess} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">
                {activeModal.action === 'APPROVE' ? 'Konfirmasi Transfer Payout' : 'Tolak Pengajuan Payout'}
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-xs">
              <p className="font-bold text-navy-900">{activeModal.payout.storeName}</p>
              <p className="mt-0.5 text-base font-extrabold text-primary-600">
                {formatIDR(activeModal.payout.amount)}
              </p>
              <p className="mt-1 text-slate-600">
                {activeModal.payout.bankName} • {activeModal.payout.bankAccountNumber} a.n.{' '}
                {activeModal.payout.bankAccountHolder}
              </p>
            </div>

            {activeModal.action === 'APPROVE' && (
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  No. Referensi / Bukti Transfer (opsional)
                </label>
                <input
                  value={transferRef}
                  onChange={(e) => setTransferRef(e.target.value)}
                  placeholder="Contoh: TRF-BCA-20261121-001"
                  className="input-field"
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                {activeModal.action === 'APPROVE' ? 'Catatan Admin (opsional)' : 'Alasan Penolakan *'}
              </label>
              <textarea
                rows={3}
                required={activeModal.action === 'REJECT'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={
                  activeModal.action === 'APPROVE'
                    ? 'Dana telah ditransfer ke rekening toko.'
                    : 'Tuliskan alasan penolakan...'
                }
                className="input-field"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setActiveModal(null)} className="btn-outline">
                Batal
              </button>
              <button
                type="submit"
                disabled={processing}
                className={activeModal.action === 'APPROVE' ? 'btn-primary' : 'btn-danger'}
              >
                {processing ? 'Memproses...' : activeModal.action === 'APPROVE' ? 'Konfirmasi Selesai' : 'Tolak Pengajuan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
