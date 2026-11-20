import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Package, Store, Upload, QrCode, Eye } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
  Pagination,
} from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

const STATUS_TABS = [
  { key: 'ALL', label: 'Semua' },
  { key: 'PENDING_PAYMENT', label: 'Belum Bayar' },
  { key: 'WAITING_VERIFICATION', label: 'Verifikasi' },
  { key: 'PAID', label: 'Dibayar' },
  { key: 'PROCESSING', label: 'Diproses' },
  { key: 'SHIPPED', label: 'Dikirim' },
  { key: 'COMPLETED', label: 'Selesai' },
  { key: 'CANCELLED', label: 'Dibatalkan' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/orders', { params: { status, page, limit: 10 } });
      setOrders(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Riwayat Pesanan Saya</h1>
          <p className="text-sm text-slate-500">
            Pantau status pembayaran manual, pengiriman per seller, dan QR verifikasi pesanan Anda.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
              status === t.key
                ? 'bg-primary-500 text-white shadow-xs'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Belum Ada Pesanan"
          description="Anda belum memiliki pesanan pada kategori status ini."
          action={
            <Link to="/products" className="btn-primary">
              Jelajahi Produk
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="font-mono font-bold text-navy-900">{order.orderNumber}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">{formatDate(order.createdAt)}</span>
                  <StatusBadge status={order.status} />
                  {order.payment && <StatusBadge status={order.payment.status} />}
                </div>
                <div className="flex items-center gap-2">
                  {order.payment?.status === 'PENDING' && (
                    <Link to={`/orders/${order.id}`} className="btn-primary px-3 py-1.5 text-xs">
                      <Upload className="h-3.5 w-3.5" /> Unggah Bukti Bayar
                    </Link>
                  )}
                  <Link to={`/orders/${order.id}`} className="btn-outline px-3 py-1.5 text-xs">
                    <Eye className="h-3.5 w-3.5" /> Detail & QR
                  </Link>
                </div>
              </div>

              <div className="divide-y divide-slate-100 p-5">
                {order.sellerOrders?.map((so) => (
                  <div key={so.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                        <Store className="h-4 w-4 text-primary-500" /> {so.seller?.storeName}
                        <span className="font-mono text-slate-400">({so.subOrderNumber})</span>
                      </span>
                      <StatusBadge status={so.status} />
                    </div>
                    <div className="space-y-2">
                      {so.items?.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          <img
                            src={
                              item.productImageSnapshot ||
                              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'
                            }
                            alt={item.productNameSnapshot}
                            className="h-12 w-12 rounded-lg border object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800">{item.productNameSnapshot}</p>
                            <p className="text-xs text-slate-500">
                              {item.variantNameSnapshot ? `${item.variantNameSnapshot} • ` : ''}
                              {item.quantity} × {formatIDR(item.unitPrice)}
                            </p>
                          </div>
                          <p className="font-semibold text-navy-900">{formatIDR(item.totalPrice)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  <QrCode className="h-3.5 w-3.5" /> QR Pesanan tersedia di halaman Detail
                </span>
                <p className="text-sm font-bold text-navy-900">
                  Total Pembayaran:{' '}
                  <span className="text-base text-primary-600">{formatIDR(order.grandTotal)}</span>
                </p>
              </div>
            </div>
          ))}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
