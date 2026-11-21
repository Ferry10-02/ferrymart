import { useState, useEffect, useCallback } from 'react';
import { Wallet, ArrowUpRight, Building2, X, CheckCircle2, Clock } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function SellerTransactionsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [payoutData, setPayoutData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    bankName: '',
    bankAccountNumber: '',
    bankAccountHolder: '',
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, payoutRes] = await Promise.all([
        api.get('/sellers/transactions'),
        api.get('/sellers/payouts'),
      ]);
      setData(txRes.data.data);
      const p = payoutRes.data.data;
      setPayoutData(p);
      setWithdrawForm((prev) => ({
        ...prev,
        bankName: prev.bankName || p?.bankInfo?.bankName || '',
        bankAccountNumber: prev.bankAccountNumber || p?.bankInfo?.bankAccountNumber || '',
        bankAccountHolder: prev.bankAccountHolder || p?.bankInfo?.bankAccountHolder || '',
      }));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleOpenWithdraw = () => {
    const avail = Number(payoutData?.availableBalance || 0);
    setWithdrawForm({
      amount: avail >= 10000 ? String(Math.floor(avail)) : '',
      bankName: payoutData?.bankInfo?.bankName || '',
      bankAccountNumber: payoutData?.bankInfo?.bankAccountNumber || '',
      bankAccountHolder: payoutData?.bankInfo?.bankAccountHolder || '',
      note: '',
    });
    setWithdrawOpen(true);
  };

  const handleRequestWithdraw = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/sellers/payouts', {
        ...withdrawForm,
        amount: Number(withdrawForm.amount),
      });
      toast.success(res.data.message);
      setWithdrawOpen(false);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Memuat saldo & riwayat transaksi..." />;

  const summary = data?.summary || {};
  const items = data?.items || [];
  const payoutRequests = payoutData?.requests || [];
  const availableBalance = Number(payoutData?.availableBalance || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900">Saldo Toko, Pencairan & Transaksi</h2>
          <p className="text-sm text-slate-500">
            Kelola pendapatan bersih dari pesanan selesai dan ajukan pencairan saldo langsung ke rekening bank Anda.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenWithdraw}
          disabled={availableBalance < 10000}
          className="btn-primary"
        >
          <ArrowUpRight className="h-4 w-4" /> Ajukan Tarik Saldo
        </button>
      </div>

      {/* Wallet / Payout Highlight Banner */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl bg-gradient-to-r from-navy-900 to-navy-800 p-6 text-white shadow-md lg:col-span-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-400">
            <Wallet className="h-4 w-4" /> Saldo Siap Ditarik (Pesanan Selesai)
          </p>
          <p className="mt-2 text-3xl font-extrabold">{formatIDR(availableBalance)}</p>
          <p className="mt-2 text-xs text-slate-300">
            Minimal penarikan Rp 10.000. Saldo otomatis bertambah saat pembeli mengonfirmasi pesanan selesai.
          </p>
          <button
            type="button"
            onClick={handleOpenWithdraw}
            disabled={availableBalance < 10000}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUpRight className="h-4 w-4" /> Tarik ke Rekening Bank
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:col-span-7">
          <div className="card p-4">
            <p className="text-xs text-slate-500">Sedang Diproses Admin</p>
            <p className="mt-1 text-xl font-extrabold text-amber-600">
              {formatIDR(payoutData?.lockedPendingAmount)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Total Sudah Dicairkan</p>
            <p className="mt-1 text-xl font-extrabold text-emerald-600">
              {formatIDR(payoutData?.withdrawnTotal)}
            </p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Total Penjualan Produk</p>
            <p className="mt-1 text-xl font-extrabold text-navy-900">{formatIDR(summary.grossTotal)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-slate-500">Komisi Platform</p>
            <p className="mt-1 text-xl font-extrabold text-slate-700">{formatIDR(summary.serviceFeeTotal)}</p>
          </div>
        </div>
      </div>

      {/* Payout Request History */}
      {payoutRequests.length > 0 && (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-sm font-extrabold text-navy-900">
              <Clock className="h-4 w-4 text-primary-500" /> Riwayat Pengajuan Pencairan Saldo
            </h3>
          </div>
          <div className="divide-y divide-slate-100">
            {payoutRequests.map((reqItem) => (
              <div key={reqItem.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-navy-900">{formatIDR(reqItem.amount)}</span>
                    <StatusBadge status={reqItem.status} />
                  </div>
                  <p className="flex items-center gap-1 text-slate-600">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {reqItem.bankName} • <span className="font-mono">{reqItem.bankAccountNumber}</span> a.n.{' '}
                    {reqItem.bankAccountHolder}
                  </p>
                  {reqItem.transferRef && (
                    <p className="font-semibold text-emerald-600">Ref Transfer: {reqItem.transferRef}</p>
                  )}
                  {reqItem.adminNote && <p className="text-slate-500">Catatan Admin: {reqItem.adminNote}</p>}
                </div>
                <span className="text-slate-400">{formatDate(reqItem.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction Table */}
      {items.length === 0 ? (
        <EmptyState
          title="Belum Ada Transaksi"
          description="Transaksi akan muncul setelah pembayaran pesanan disetujui Admin."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3.5">
            <h3 className="text-sm font-extrabold text-navy-900">Rincian Transaksi Pesanan</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Sub-Order</th>
                  <th className="px-5 py-3">Pembeli</th>
                  <th className="px-5 py-3">Subtotal</th>
                  <th className="px-5 py-3">Komisi</th>
                  <th className="px-5 py-3">Payout Bersih</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-bold">{t.subOrderNumber}</td>
                    <td className="px-5 py-3">{t.order?.buyer?.fullName}</td>
                    <td className="px-5 py-3">{formatIDR(t.subtotal)}</td>
                    <td className="px-5 py-3 text-amber-700">-{formatIDR(t.serviceFee)}</td>
                    <td className="px-5 py-3 font-bold text-emerald-600">{formatIDR(t.sellerPayout)}</td>
                    <td className="px-5 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(t.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Withdraw Request Modal */}
      {withdrawOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleRequestWithdraw} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">Ajukan Tarik Saldo Seller</h3>
              <button type="button" onClick={() => setWithdrawOpen(false)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900">
              Saldo tersedia untuk ditarik: <strong className="text-sm">{formatIDR(availableBalance)}</strong>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nominal Penarikan (Rp) *</label>
              <input
                required
                type="number"
                min={10000}
                max={Math.floor(availableBalance)}
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Bank / E-Wallet *</label>
                <input
                  required
                  placeholder="Contoh: BCA / Mandiri / DANA"
                  value={withdrawForm.bankName}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor Rekening *</label>
                <input
                  required
                  placeholder="1234567890"
                  value={withdrawForm.bankAccountNumber}
                  onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccountNumber: e.target.value })}
                  className="input-field font-mono"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Pemilik Rekening *</label>
              <input
                required
                placeholder="Sesuai buku tabungan"
                value={withdrawForm.bankAccountHolder}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, bankAccountHolder: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Catatan (opsional)</label>
              <input
                value={withdrawForm.note}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, note: e.target.value })}
                placeholder="Catatan tambahan untuk Admin"
                className="input-field"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setWithdrawOpen(false)} className="btn-outline">
                Batal
              </button>
              <button type="submit" disabled={submitting} className="btn-primary">
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
