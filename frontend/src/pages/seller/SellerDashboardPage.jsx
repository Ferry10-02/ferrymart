import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Wallet,
  Package,
  Clock,
  Star,
  Plus,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import api, { getErrorMessage } from '../../services/api';
import { LoadingState, ErrorState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

export default function SellerDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/sellers/dashboard');
      setData(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh when payout is approved/rejected or order status changes
  useEffect(() => {
    const onUpdated = () => load();
    window.addEventListener('fm:order-updated', onUpdated);
    return () => window.removeEventListener('fm:order-updated', onUpdated);
  }, [load]);

  if (loading) return <LoadingState message="Memuat ringkasan toko..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const stats = data?.stats || {};
  const cards = [
    { label: 'Omzet Penjualan (Akumulasi)', value: formatIDR(stats.grossRevenue), icon: TrendingUp, color: 'text-primary-600 bg-primary-50' },
    { label: 'Total Pesanan', value: stats.totalOrders || 0, icon: ShoppingBag, color: 'text-sky-600 bg-sky-50' },
    { label: 'Perlu Dikemas', value: stats.pendingOrders || 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
    { label: 'Total Produk', value: stats.totalProducts || 0, icon: Package, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Rating Toko', value: `${Number(stats.ratingAvg || 0).toFixed(1)} / 5`, icon: Star, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900">
            Ringkasan Toko: {data?.sellerProfile?.storeName}
          </h2>
          <p className="text-sm text-slate-500">Pantau saldo aktif, pencairan dana, pesanan masuk, dan performa toko Anda.</p>
        </div>
        <Link to="/seller/products" className="btn-primary">
          <Plus className="h-4 w-4" /> Tambah Produk Baru
        </Link>
      </div>

      {/* Live Seller Wallet Strip (Auto-deducts / resets to Rp 0 when withdrawn!) */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-900 to-navy-800 p-5 text-white shadow-md md:grid-cols-12 md:items-center">
        <div className="md:col-span-5">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary-400">
            <Wallet className="h-4 w-4" /> Saldo Toko Aktif (Siap Ditarik)
          </p>
          <p className="mt-1.5 text-3xl font-extrabold text-white">
            {formatIDR(stats.availableBalance)}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            Otomatis berkurang / kembali Rp 0 saat saldo dicairkan ke rekening Anda.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-5">
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] text-slate-300">Sedang Dicairkan</p>
            <p className="mt-0.5 text-base font-extrabold text-amber-300">
              {formatIDR(stats.lockedPendingAmount)}
            </p>
          </div>
          <div className="rounded-xl bg-white/10 p-3">
            <p className="text-[11px] text-slate-300">Total Sudah Dicairkan</p>
            <p className="mt-0.5 text-base font-extrabold text-emerald-300">
              {formatIDR(stats.withdrawnTotal)}
            </p>
          </div>
        </div>

        <div className="flex md:col-span-2 md:justify-end">
          <Link
            to="/seller/transactions"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-xs font-bold text-white shadow transition hover:bg-primary-600 md:w-auto"
          >
            <ArrowUpRight className="h-4 w-4" /> Tarik Saldo
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{c.label}</span>
                <div className={`rounded-lg p-2 ${c.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xl font-extrabold text-navy-900">{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* Sales Chart */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">Grafik Penjualan 14 Hari Terakhir</h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.salesChart || []}>
              <defs>
                <linearGradient id="sellerRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val) => formatIDR(val)} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Pendapatan"
                stroke="#f97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#sellerRevGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-navy-900">Pesanan Terbaru</h3>
          <Link to="/seller/orders" className="text-xs font-semibold text-primary-600 hover:underline">
            Kelola Semua Pesanan
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">No. Sub-Pesanan</th>
                <th className="px-5 py-3">Pembeli</th>
                <th className="px-5 py-3">Subtotal</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.recentOrders || []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                    Belum ada pesanan masuk.
                  </td>
                </tr>
              ) : (
                data.recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-navy-900">
                      {ord.subOrderNumber}
                    </td>
                    <td className="px-5 py-3">{ord.order?.buyer?.fullName}</td>
                    <td className="px-5 py-3 font-semibold text-primary-600">
                      {formatIDR(ord.subtotal)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={ord.status} />
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(ord.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
