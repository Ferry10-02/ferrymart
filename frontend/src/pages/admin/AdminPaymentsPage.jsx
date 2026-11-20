import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, XCircle, RotateCcw, ExternalLink } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge, Pagination } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function AdminPaymentsPage({
  defaultStatus = 'ALL',
  title = 'Daftar Pembayaran Manual',
}) {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [status, setStatus] = useState(defaultStatus);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStatus(defaultStatus);
    setPage(1);
  }, [defaultStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/payments', { params: { status, page, limit: 20 } });
      setPayments(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerify = async (paymentId, nextStatus) => {
    let rejectionReason = null;
    if (nextStatus === 'REJECTED') {
      rejectionReason = window.prompt('Masukkan alasan penolakan bukti pembayaran:');
      if (!rejectionReason) return;
    }
    if (nextStatus === 'REFUNDED' && !window.confirm('Proses refund untuk pembayaran ini? Stok produk akan dikembalikan.')) {
      return;
    }
    try {
      const res = await api.put(`/admin/payments/${paymentId}/verify`, {
        status: nextStatus,
        rejectionReason,
      });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">{title}</h2>
        <p className="text-sm text-slate-500">
          Periksa bukti transfer pembeli secara manual sebelum menyetujui pembayaran ke seller.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'WAITING_VERIFICATION', 'APPROVED', 'REJECTED', 'REFUNDED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              setStatus(st);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === st
                ? 'bg-primary-500 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : payments.length === 0 ? (
        <EmptyState title="Tidak Ada Data Pembayaran" description="Belum ada data pembayaran pada status ini." />
      ) : (
        <div className="space-y-4">
          {payments.map((p) => {
            const latestProof = p.proofs?.[0];
            return (
              <div key={p.id} className="card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-navy-900">{p.order?.orderNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span>{p.order?.buyer?.fullName} ({p.order?.buyer?.email})</span>
                    <StatusBadge status={p.status} />
                  </div>
                  <span className="text-base font-extrabold text-primary-600">{formatIDR(p.amount)}</span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-12">
                  <div className="text-xs space-y-1 md:col-span-6">
                    <p><strong>Metode:</strong> {p.paymentMethodName}</p>
                    <p><strong>Tujuan:</strong> {p.paymentDestination}</p>
                    <p><strong>Dibuat:</strong> {formatDate(p.createdAt)}</p>
                    {p.verifiedAt && (
                      <p className="text-emerald-700">
                        <strong>Diverifikasi oleh:</strong> {p.verifier?.fullName} pada {formatDate(p.verifiedAt)}
                      </p>
                    )}
                    {p.rejectionReason && (
                      <p className="text-red-600"><strong>Alasan Ditolak:</strong> {p.rejectionReason}</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs md:col-span-6">
                    {latestProof ? (
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <p className="font-bold text-navy-900">Bukti Transfer Terakhir</p>
                          <p>Pengirim: {latestProof.senderName} ({latestProof.senderBank})</p>
                          <p>Nominal: <strong className="text-primary-600">{formatIDR(latestProof.transferAmount)}</strong></p>
                          <p className="text-slate-500">Diunggah: {formatDate(latestProof.createdAt)}</p>
                          {latestProof.notes && <p className="italic">Catatan: {latestProof.notes}</p>}
                        </div>
                        <a
                          href={latestProof.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-navy shrink-0 px-3 py-2 text-xs"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Lihat Bukti
                        </a>
                      </div>
                    ) : (
                      <p className="text-slate-500">Pembeli belum mengunggah bukti pembayaran.</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
                  {p.status !== 'APPROVED' && p.status !== 'REFUNDED' && (
                    <button
                      type="button"
                      onClick={() => handleVerify(p.id, 'APPROVED')}
                      className="btn-primary px-3.5 py-1.5 text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Setujui Pembayaran
                    </button>
                  )}
                  {p.status === 'WAITING_VERIFICATION' && (
                    <button
                      type="button"
                      onClick={() => handleVerify(p.id, 'REJECTED')}
                      className="btn-danger px-3.5 py-1.5 text-xs"
                    >
                      <XCircle className="h-4 w-4" /> Tolak Bukti
                    </button>
                  )}
                  {p.status === 'APPROVED' && (
                    <button
                      type="button"
                      onClick={() => handleVerify(p.id, 'REFUNDED')}
                      className="btn-outline px-3.5 py-1.5 text-xs text-purple-700"
                    >
                      <RotateCcw className="h-4 w-4" /> Tandai Refund
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
