import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Wallet,
  Package,
  Clock,
  Star,
  Plus,
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

  const load = async () => {
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
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingState message="Memuat ringkasan toko..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const stats = data?.stats || {};
  const cards = [
    { label: 'Total Pendapatan Kotor', value: formatIDR(stats.grossRevenue), icon: Wallet, color: 'text-primary-600 bg-primary-50' },
    { label: 'Total Pesanan', value: stats.totalOrders || 0, icon: ShoppingBag, color: 'text-sky-600 bg-sky-50' },
    { label: 'Perlu Diproses', value: stats.pendingOrders || 0, icon: Clock, color: 'text-amber-600 bg-amber-50' },
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
          <p className="text-sm text-slate-500">Pantau penjualan, pesanan masuk, dan performa toko Anda.</p>
        </div>
        <Link to="/seller/products" className="btn-primary">
          <Plus className="h-4 w-4" /> Tambah Produk Baru
        </Link>
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
