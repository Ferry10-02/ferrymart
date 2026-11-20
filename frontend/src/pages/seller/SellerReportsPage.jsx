import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  Package,
  Wallet,
  Percent,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';
import { exportSellerReportExcel } from '../../utils/excelReport';

const toYmd = (dateObj) => {
  const shifted = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

export default function SellerReportsPage() {
  const toast = useToast();
  const [startDate, setStartDate] = useState(() =>
    toYmd(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(() => toYmd(new Date()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/seller', { params: { startDate, endDate } });
      setReport(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const applyPreset = (days) => {
    const today = new Date();
    setEndDate(toYmd(today));
    if (days === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(toYmd(firstOfMonth));
    } else {
      setStartDate(toYmd(new Date(Date.now() - days * 24 * 60 * 60 * 1000)));
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportSellerReportExcel(report, startDate, endDate);
      toast.success('Laporan Excel (.xlsx) rapi berhasil diunduh!');
    } catch (err) {
      toast.error(err.message || 'Gagal mengekspor Excel.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingState message="Menyusun laporan penjualan..." />;

  const summary = report?.summary || {};
  const orders = report?.orders || [];

  const kpiCards = [
    {
      label: 'Total Pesanan',
      value: summary.totalOrders || 0,
      sub: `${summary.paidOrdersCount || 0} sudah terbayar`,
      icon: ShoppingBag,
      color: 'text-sky-600 bg-sky-50',
      valueColor: 'text-navy-900',
    },
    {
      label: 'Unit Terjual',
      value: summary.totalUnitsSold || 0,
      sub: 'Dari pesanan terbayar',
      icon: Package,
      color: 'text-indigo-600 bg-indigo-50',
      valueColor: 'text-navy-900',
    },
    {
      label: 'Pendapatan Kotor',
      value: formatIDR(summary.grossRevenue),
      sub: 'Subtotal produk',
      icon: TrendingUp,
      color: 'text-primary-600 bg-primary-50',
      valueColor: 'text-primary-600',
    },
    {
      label: 'Komisi Platform',
      value: formatIDR(summary.totalCommission),
      sub: 'Biaya layanan seller',
      icon: Percent,
      color: 'text-amber-600 bg-amber-50',
      valueColor: 'text-amber-600',
    },
    {
      label: 'Payout Bersih',
      value: formatIDR(summary.netPayout),
      sub: 'Termasuk ongkir - komisi',
      icon: Wallet,
      color: 'text-emerald-600 bg-emerald-50',
      valueColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-navy-900">
              Laporan Penjualan — {report?.storeName || 'Toko Anda'}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Periode <strong>{startDate}</strong> s/d <strong>{endDate}</strong> (WIB)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting ? 'Menyusun Excel...' : 'Unduh Excel (.xlsx)'}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-navy py-2 text-xs"
            >
              <Printer className="h-4 w-4" /> Cetak / PDF
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 print:hidden">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
              <Calendar className="h-3.5 w-3.5" /> Cepat:
            </span>
            {[
              { label: 'Hari Ini', val: 0 },
              { label: '7 Hari', val: 7 },
              { label: '30 Hari', val: 30 },
              { label: 'Bulan Ini', val: 'month' },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p.val)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field w-auto py-1.5 text-xs"
            />
            <span className="text-xs text-slate-400">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field w-auto py-1.5 text-xs"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{c.label}</span>
                <div className={`rounded-lg p-2 ${c.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <p className={`mt-2.5 text-xl font-extrabold ${c.valueColor}`}>{c.value}</p>
              <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">
          Grafik Pendapatan Kotor & Payout Harian
        </h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report?.dailySeries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(val) => formatIDR(val)} />
              <Legend />
              <Bar dataKey="revenue" name="Pendapatan Kotor" fill="#f97316" radius={[6, 6, 0, 0]} />
              <Bar dataKey="payout" name="Payout Bersih" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Transactions Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-navy-900">
            Rincian Transaksi Pesanan ({orders.length})
          </h3>
          <span className="text-xs text-slate-500">
            Seluruh baris ini ikut terekspor rapi di sheet &ldquo;Detail Pesanan&rdquo; Excel
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-900 text-white uppercase">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">No. Sub-Pesanan</th>
                <th className="px-4 py-3">Pembeli</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">Kurir / Resi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3 text-right">Payout Bersih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Belum ada pesanan pada periode ini.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-navy-900">{o.subOrderNumber}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{o.buyerName}</td>
                    <td className="px-4 py-3 max-w-[220px] truncate text-slate-600">{o.itemsSummary}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {o.courier}
                      {o.trackingNumber && o.trackingNumber !== '-' ? (
                        <span className="block font-mono text-[11px] text-primary-600">{o.trackingNumber}</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-right font-semibold">{formatIDR(o.subtotal)}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatIDR(o.sellerPayout)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">Produk Terlaris Toko</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Produk</th>
                <th className="px-4 py-2.5">Harga</th>
                <th className="px-4 py-2.5">Stok Sisa</th>
                <th className="px-4 py-2.5">Terjual</th>
                <th className="px-4 py-2.5">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(report?.topProducts || []).map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2.5 font-semibold text-navy-900">{p.name}</td>
                  <td className="px-4 py-2.5">{formatIDR(p.price)}</td>
                  <td className="px-4 py-2.5">{p.stock}</td>
                  <td className="px-4 py-2.5 font-bold text-primary-600">{p.soldCount}</td>
                  <td className="px-4 py-2.5">{Number(p.ratingAvg || 0).toFixed(1)} ★</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
