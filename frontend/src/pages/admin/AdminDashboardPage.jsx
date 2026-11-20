import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Store,
  Package,
  ShoppingBag,
  Wallet,
  ShieldCheck,
  BadgeCheck,
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

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/admin/dashboard');
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

  if (loading) return <LoadingState message="Memuat statistik marketplace..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const s = data?.stats || {};
  const cards = [
    { label: 'Total GMV Terbayar', value: formatIDR(s.totalGMV), icon: Wallet, color: 'text-primary-600 bg-primary-50' },
    { label: 'Total Transaksi / Order', value: s.totalOrders || 0, icon: ShoppingBag, color: 'text-sky-600 bg-sky-50' },
    { label: 'Total Pembeli', value: s.totalBuyers || 0, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Total Seller', value: `${s.totalSellers || 0} (${s.pendingSellers || 0} pending)`, icon: Store, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Produk', value: `${s.totalProducts || 0} (${s.activeProducts || 0} aktif)`, icon: Package, color: 'text-purple-600 bg-purple-50' },
    { label: 'Verifikasi Pembayaran', value: s.pendingPayments || 0, icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900">Dashboard Marketplace FerryMarket</h2>
          <p className="text-sm text-slate-500">Ringkasan performa transaksi, verifikasi pembayaran, dan pertumbuhan pengguna.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/seller-verification" className="btn-outline text-xs">
            <BadgeCheck className="h-4 w-4 text-primary-500" /> Verifikasi Seller ({s.pendingSellers || 0})
          </Link>
          <Link to="/admin/payment-verification" className="btn-primary text-xs">
            <ShieldCheck className="h-4 w-4" /> Verifikasi Pembayaran ({s.pendingPayments || 0})
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{c.label}</span>
                <div className={`rounded-xl p-2.5 ${c.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-navy-900">{c.value}</p>
            </div>
          );
        })}
      </div>

      {/* GMV Chart */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">Grafik Penjualan Marketplace (14 Hari Terakhir)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.salesChart || []}>
              <defs>
                <linearGradient id="adminGmv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val) => formatIDR(val)} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="GMV"
                stroke="#0f172a"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#adminGmv)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pending Payment Queue & Recent Orders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Antrian Verifikasi Pembayaran</h3>
            <Link to="/admin/payment-verification" className="text-xs font-semibold text-primary-600 hover:underline">
              Lihat Semua
            </Link>
          </div>
          {(data?.pendingPaymentVerifications || []).length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Tidak ada bukti pembayaran yang menunggu verifikasi.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.pendingPaymentVerifications.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <p className="font-mono font-bold text-navy-900">{p.order?.orderNumber}</p>
                    <p className="text-slate-500">
                      {p.order?.buyer?.fullName} • {p.paymentMethodName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-600">{formatIDR(p.amount)}</p>
                    <Link to="/admin/payment-verification" className="text-[11px] font-semibold text-blue-600 hover:underline">
                      Periksa Bukti →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Pesanan Terbaru</h3>
            <Link to="/admin/orders" className="text-xs font-semibold text-primary-600 hover:underline">
              Semua Pesanan
            </Link>
          </div>
          {(data?.recentOrders || []).length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Belum ada pesanan.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-3 text-xs">
                  <div>
                    <p className="font-mono font-bold text-navy-900">{o.orderNumber}</p>
                    <p className="text-slate-500">
                      {o.buyer?.fullName} • {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-navy-900">{formatIDR(o.grandTotal)}</p>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
