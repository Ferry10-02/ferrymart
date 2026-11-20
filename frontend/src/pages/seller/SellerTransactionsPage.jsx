import { useState, useEffect } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function SellerTransactionsPage() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/sellers/transactions')
      .then((res) => setData(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) return <LoadingState message="Memuat riwayat transaksi..." />;

  const summary = data?.summary || {};
  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Riwayat Transaksi Toko</h2>
        <p className="text-sm text-slate-500">Rincian pendapatan, komisi platform, dan payout seller.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Penjualan Produk</p>
          <p className="mt-1 text-xl font-extrabold text-navy-900">{formatIDR(summary.grossTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Total Ongkir</p>
          <p className="mt-1 text-xl font-extrabold text-slate-700">{formatIDR(summary.shippingTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Komisi Layanan Platform</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">{formatIDR(summary.serviceFeeTotal)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500">Estimasi Payout Bersih</p>
          <p className="mt-1 text-xl font-extrabold text-emerald-600">{formatIDR(summary.netPayoutTotal)}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Belum Ada Transaksi" description="Transaksi akan muncul setelah pembayaran pesanan disetujui Admin." />
      ) : (
        <div className="card overflow-hidden">
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
    </div>
  );
}
