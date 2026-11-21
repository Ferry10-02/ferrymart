import { useState, useEffect, useCallback } from 'react';
import { RotateCcw, CheckCircle2, XCircle, X, Store, User } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function AdminRefundsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  const [activeModal, setActiveModal] = useState(null); // { refund, action }
  const [adminNote, setAdminNote] = useState('');
  const [restoreStock, setRestoreStock] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/refunds', { params: { status: statusFilter } });
      setItems(res.data.data.items || []);
      setSummary(res.data.data.summary || {});
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadRefunds();
  }, [loadRefunds]);

  const handleProcess = async (e) => {
    e.preventDefault();
    if (!activeModal) return;
    setProcessing(true);
    try {
      const res = await api.put(`/admin/refunds/${activeModal.refund.id}/process`, {
        action: activeModal.action,
        adminNote,
        restoreStock,
      });
      toast.success(res.data.message);
      setActiveModal(null);
      setAdminNote('');
      loadRefunds();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Komplain & Pengembalian Dana (Refund)</h2>
        <p className="text-sm text-slate-500">
          Tinjau komplain pembeli. Jika disetujui, status pesanan otomatis berubah menjadi REFUNDED dan notifikasi dikirim ke Pembeli & Seller.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Menunggu Keputusan</p>
          <p className="mt-1 text-2xl font-extrabold text-amber-600">{summary.pending || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Refund Disetujui</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-600">{summary.approved || 0}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold text-slate-500">Ditolak</p>
          <p className="mt-1 text-2xl font-extrabold text-slate-700">{summary.rejected || 0}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: 'Semua' },
          { key: 'PENDING', label: 'Menunggu Keputusan' },
          { key: 'APPROVED', label: 'Disetujui (Refund)' },
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
          icon={RotateCcw}
          title="Belum Ada Pengajuan Komplain / Refund"
          description="Semua transaksi berjalan lancar tanpa komplain saat ini."
        />
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="card p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-navy-900">{r.subOrderNumber}</span>
                  <span className="text-slate-400">({r.orderNumber})</span>
                  <StatusBadge status={r.status} />
                </div>
                <span className="text-xs text-slate-400">{formatDate(r.createdAt)}</span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 text-xs">
                <div className="space-y-1.5 md:col-span-7">
                  <p className="font-bold text-red-700">Alasan: {r.reason}</p>
                  {r.description && <p className="text-slate-700">{r.description}</p>}
                  <p className="text-slate-500">Produk: {r.itemsSummary}</p>
                  {r.refundAccount && (
                    <p className="font-semibold text-navy-900">Rekening Refund Pembeli: {r.refundAccount}</p>
                  )}
                  {r.adminNote && (
                    <p className="rounded-lg bg-slate-100 p-2 text-slate-700">
                      <strong>Catatan Admin:</strong> {r.adminNote}
                    </p>
                  )}
                </div>

                <div className="space-y-1 rounded-xl bg-slate-50 p-3 md:col-span-5">
                  <p className="flex items-center gap-1.5 font-semibold text-navy-900">
                    <User className="h-3.5 w-3.5 text-primary-500" /> {r.buyerName} ({r.buyerPhone})
                  </p>
                  <p className="flex items-center gap-1.5 text-slate-600">
                    <Store className="h-3.5 w-3.5 text-primary-500" /> Toko: {r.storeName}
                  </p>
                  <p className="pt-1 text-base font-extrabold text-primary-600">
                    Nilai Refund: {formatIDR(r.amount)}
                  </p>
                </div>
              </div>

              {r.status === 'PENDING' && (
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal({ refund: r, action: 'APPROVE' });
                      setAdminNote('');
                      setRestoreStock(true);
                    }}
                    className="btn-primary px-3.5 py-2 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Setujui Refund
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal({ refund: r, action: 'REJECT' });
                      setAdminNote('');
                    }}
                    className="btn-danger px-3.5 py-2 text-xs"
                  >
                    <XCircle className="h-4 w-4" /> Tolak Komplain
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
                {activeModal.action === 'APPROVE' ? 'Setujui Pengembalian Dana' : 'Tolak Pengajuan Refund'}
              </h3>
              <button type="button" onClick={() => setActiveModal(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Sub-Order <strong className="font-mono">{activeModal.refund.subOrderNumber}</strong> —{' '}
              <strong>{formatIDR(activeModal.refund.amount)}</strong>
            </p>

            {activeModal.action === 'APPROVE' && (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-navy-900">
                <input
                  type="checkbox"
                  checked={restoreStock}
                  onChange={(e) => setRestoreStock(e.target.checked)}
                  className="h-4 w-4 accent-primary-500"
                />
                Kembalikan stok produk ke toko Seller
              </label>
            )}

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                {activeModal.action === 'APPROVE' ? 'Catatan Keputusan Admin' : 'Alasan Penolakan *'}
              </label>
              <textarea
                rows={3}
                required={activeModal.action === 'REJECT'}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Tuliskan catatan untuk pembeli & seller..."
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
                {processing ? 'Memproses...' : activeModal.action === 'APPROVE' ? 'Setujui Refund' : 'Tolak Komplain'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
