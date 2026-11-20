import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Printer,
  ShoppingBag,
  CheckCircle2,
  Wallet,
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
} from 'recharts';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';
import { exportAdminReportExcel } from '../../utils/excelReport';

const toYmd = (dateObj) => {
  const shifted = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

export default function AdminReportsPage() {
  const toast = useToast();
  const [startDate, setStartDate] = useState(() =>
    toYmd(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  );
  const [endDate, setEndDate] = useState(() => toYmd(new Date()));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/admin', { params: { startDate, endDate } });
      setReport(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (days) => {
    const today = new Date();
    setEndDate(toYmd(today));
    if (days === 'month') {
      setStartDate(toYmd(new Date(today.getFullYear(), today.getMonth(), 1)));
    } else {
      setStartDate(toYmd(new Date(Date.now() - days * 24 * 60 * 60 * 1000)));
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportAdminReportExcel(report, startDate, endDate);
      toast.success('Laporan Marketplace Excel (.xlsx) rapi berhasil diunduh!');
    } catch (err) {
      toast.error(err.message || 'Gagal mengekspor Excel.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <LoadingState message="Menyusun laporan marketplace..." />;

  const s = report?.summary || {};
  const orders = report?.orders || [];

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-navy-900">Laporan Penjualan Marketplace</h2>
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
            <button type="button" onClick={() => window.print()} className="btn-navy py-2 text-xs">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Pesanan</span>
            <ShoppingBag className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-navy-900">{s.totalOrders || 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pesanan Terbayar</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-600">{s.paidOrdersCount || 0}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total GMV</span>
            <TrendingUp className="h-4 w-4 text-primary-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-primary-600">{formatIDR(s.totalGMV)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Biaya Layanan</span>
            <Wallet className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-indigo-600">{formatIDR(s.totalServiceFee)}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">Pendapatan Harian Marketplace (GMV)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={report?.dailySeries || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `Rp${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(val) => formatIDR(val)} />
              <Bar dataKey="revenue" name="GMV" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Orders Table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-base font-bold text-navy-900">
            Rincian Transaksi Marketplace ({orders.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-900 text-white uppercase">
              <tr>
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">No. Pesanan</th>
                <th className="px-4 py-3">Pembeli</th>
                <th className="px-4 py-3">Seller</th>
                <th className="px-4 py-3">Pembayaran</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Belum ada transaksi pada periode ini.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-navy-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 font-medium">{o.buyerName}</td>
                    <td className="px-4 py-3 text-slate-600">{o.sellers}</td>
                    <td className="px-4 py-3"><StatusBadge status={o.paymentStatus} /></td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600">{formatIDR(o.grandTotal)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products & Sellers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-navy-900">Top 10 Produk Terlaris</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {(report?.topProducts || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-navy-900">{p.name}</p>
                  <p className="text-slate-500">{p.seller?.storeName}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">{p.soldCount} terjual</p>
                  <p className="text-slate-500">{formatIDR(p.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-navy-900">Top 10 Seller</h3>
          <div className="divide-y divide-slate-100 text-xs">
            {(report?.topSellers || []).map((sl) => (
              <div key={sl.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="font-semibold text-navy-900">{sl.storeName}</p>
                  <p className="text-slate-500">{sl.city || 'Indonesia'}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-emerald-600">{sl.totalSales} unit terjual</p>
                  <p className="text-slate-500">Rating {Number(sl.ratingAvg || 0).toFixed(1)} ★</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
