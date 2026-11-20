import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Package,
  Store,
  Upload,
  QrCode,
  Eye,
  Wallet,
  Truck,
  Star,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ListChecks,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import {
  LoadingState,
  EmptyState,
  ErrorState,
  StatusBadge,
  Pagination,
} from '../../components/common/UIStates';
import OrderProgressStepper from '../../components/marketplace/OrderProgressStepper';
import { formatIDR, formatDate } from '../../utils/format';

const STATUS_TABS = [
  { key: 'ALL', label: 'Semua', countKey: 'total', icon: ListChecks },
  { key: 'BELUM_BAYAR', label: 'Belum Bayar', countKey: 'belumBayar', icon: Wallet },
  { key: 'DIKEMAS', label: 'Dikemas', countKey: 'dikemas', icon: Package },
  { key: 'DIKIRIM', label: 'Dikirim', countKey: 'dikirim', icon: Truck },
  { key: 'BERI_PENILAIAN', label: 'Beri Penilaian', countKey: 'beriPenilaian', icon: Star },
  { key: 'SELESAI', label: 'Selesai', countKey: 'selesai', icon: CheckCircle2 },
  { key: 'DIBATALKAN', label: 'Dibatalkan', countKey: 'dibatalkan', icon: XCircle },
];

const VALID_TABS = new Set(STATUS_TABS.map((t) => t.key));

export default function OrdersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshOrderSummary } = useSocket() || {};

  const initialTab = VALID_TABS.has(searchParams.get('tab')) ? searchParams.get('tab') : 'ALL';

  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    belumBayar: 0,
    dikemas: 0,
    dikirim: 0,
    beriPenilaian: 0,
    selesai: 0,
    dibatalkan: 0,
  });
  const [status, setStatus] = useState(initialTab);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [completingId, setCompletingId] = useState(null);

  // Instant Review modal directly from Pesanan Saya
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Sync URL ?tab=... when user navigates from Profile/Home quick links
  useEffect(() => {
    const paramTab = searchParams.get('tab');
    const resolved = VALID_TABS.has(paramTab) ? paramTab : 'ALL';
    if (resolved !== status) {
      setStatus(resolved);
      setPage(1);
    }
  }, [searchParams, status]);

  const handleTabChange = (nextKey) => {
    setStatus(nextKey);
    setPage(1);
    if (nextKey === 'ALL') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: nextKey });
    }
  };

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/orders', { params: { status, page, limit: 10 } });
      setOrders(res.data.data.items || []);
      if (res.data.data.counts) {
        setCounts(res.data.data.counts);
      }
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

  // Auto-refresh when realtime status notification arrives (Admin approves / Seller packs or ships)
  useEffect(() => {
    const onOrderUpdated = () => {
      loadOrders();
    };
    window.addEventListener('fm:order-updated', onOrderUpdated);
    return () => window.removeEventListener('fm:order-updated', onOrderUpdated);
  }, [loadOrders]);

  const handleConfirmReceived = async (sellerOrderId) => {
    setCompletingId(sellerOrderId);
    try {
      const res = await api.post(`/orders/seller-orders/${sellerOrderId}/complete`);
      toast.success(res.data.message);
      await Promise.all([loadOrders(), refreshOrderSummary?.()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCompletingId(null);
    }
  };

  const handleChatSeller = async (sellerId, orderId) => {
    try {
      const res = await api.post('/chat/conversations', { sellerId, orderId });
      navigate(`/chat?conversationId=${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewItem) return;
    setSubmittingReview(true);
    try {
      await api.post('/reviews', {
        orderItemId: reviewItem.id,
        productId: reviewItem.productId,
        rating: reviewRating,
        comment: reviewComment,
      });
      toast.success('Terima kasih! Penilaian produk Anda berhasil dikirim.');
      setReviewItem(null);
      setReviewComment('');
      await Promise.all([loadOrders(), refreshOrderSummary?.()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900">Pesanan Saya</h1>
          <p className="text-sm text-slate-500">
            Pantau status Belum Bayar, Dikemas, Dikirim, hingga Beri Penilaian secara realtime.
          </p>
        </div>
        <Link to="/profile" className="btn-outline px-3.5 py-2 text-xs">
          Kembali ke Halaman Saya
        </Link>
      </div>

      {/* Shopee-Style 4-Status Summary Strip */}
      <div className="card mb-5 grid grid-cols-4 gap-2 p-3 sm:p-4">
        {STATUS_TABS.slice(1, 5).map((t) => {
          const Icon = t.icon;
          const badgeCount = counts[t.countKey] || 0;
          const isActive = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`group flex flex-col items-center rounded-xl py-2.5 text-center transition ${
                isActive ? 'bg-primary-50 ring-1 ring-primary-300' : 'hover:bg-slate-50'
              }`}
            >
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition ${
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 text-navy-800 group-hover:bg-primary-100 group-hover:text-primary-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                {badgeCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#EE4D2D] px-1 text-[10px] font-extrabold text-white">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span
                className={`mt-1.5 text-[11px] font-bold sm:text-xs ${
                  isActive ? 'text-primary-700' : 'text-slate-700'
                }`}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Shopee-Style Filter Tabs with Live Counts */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
        {STATUS_TABS.map((t) => {
          const badgeCount = counts[t.countKey] || 0;
          const isActive = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => handleTabChange(t.key)}
              className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition ${
                isActive
                  ? 'bg-primary-500 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{t.label}</span>
              {badgeCount > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                    isActive ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-700'
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={loadOrders} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Belum Ada Pesanan"
          description="Belum ada pesanan pada kategori status ini."
          action={
            <Link to="/products" className="btn-primary">
              Jelajahi Produk
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const hasUnreviewed = order.sellerOrders?.some(
              (so) =>
                ['DELIVERED', 'COMPLETED'].includes(so.status) &&
                so.items?.some((item) => !item.review)
            );
            return (
              <div key={order.id} className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2.5 text-xs">
                    <span className="font-mono font-bold text-navy-900">{order.orderNumber}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-500">{formatDate(order.createdAt)}</span>
                    <StatusBadge status={order.status} />
                    {order.payment && <StatusBadge status={order.payment.status} />}
                  </div>
                  <div className="flex items-center gap-2">
                    {['PENDING', 'REJECTED'].includes(order.payment?.status) &&
                      order.status !== 'CANCELLED' && (
                        <Link to={`/orders/${order.id}`} className="btn-primary px-3 py-1.5 text-xs">
                          <Upload className="h-3.5 w-3.5" /> Bayar / Upload Bukti
                        </Link>
                      )}
                    <Link to={`/orders/${order.id}`} className="btn-outline px-3 py-1.5 text-xs">
                      <Eye className="h-3.5 w-3.5" /> Detail & QR
                    </Link>
                  </div>
                </div>

                {/* Live Visual Stepper */}
                <div className="border-b border-slate-100 bg-white px-5 py-2">
                  <OrderProgressStepper
                    status={order.status}
                    hasUnreviewedItems={hasUnreviewed}
                    compact
                  />
                </div>

                <div className="divide-y divide-slate-100 p-5">
                  {order.sellerOrders?.map((so) => (
                    <div key={so.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-navy-900">
                            <Store className="h-4 w-4 text-primary-500" /> {so.seller?.storeName}
                            <span className="font-mono text-slate-400">({so.subOrderNumber})</span>
                          </span>
                          <StatusBadge status={so.status} />
                        </div>
                        {so.seller?.id && (
                          <button
                            type="button"
                            onClick={() => handleChatSeller(so.seller.id, order.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700"
                          >
                            <MessageSquare className="h-3 w-3 text-primary-500" /> Chat Seller
                          </button>
                        )}
                      </div>

                      <div className="space-y-2.5">
                        {so.items?.map((item) => (
                          <div key={item.id} className="flex flex-wrap items-center gap-3 text-sm">
                            <img
                              src={
                                item.productImageSnapshot ||
                                'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'
                              }
                              alt={item.productNameSnapshot}
                              className="h-14 w-14 rounded-lg border object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-semibold text-slate-800">
                                {item.productNameSnapshot}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.variantNameSnapshot ? `${item.variantNameSnapshot} • ` : ''}
                                {item.quantity} × {formatIDR(item.unitPrice)}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className="font-bold text-navy-900">{formatIDR(item.totalPrice)}</p>
                              {['DELIVERED', 'COMPLETED'].includes(so.status) && !item.review && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReviewItem(item);
                                    setReviewRating(5);
                                    setReviewComment('');
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-600"
                                >
                                  <Star className="h-3.5 w-3.5 fill-white" /> Beri Penilaian
                                </button>
                              )}
                              {item.review && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />{' '}
                                  {item.review.rating}/5
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Shipment Banner & Quick Confirm Delivery right on card */}
                      {['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(so.status) && (
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs">
                          <div className="flex items-center gap-2 text-slate-700">
                            {['SHIPPED', 'DELIVERED'].includes(so.status) ? (
                              <Truck className="h-4 w-4 text-sky-600" />
                            ) : (
                              <Package className="h-4 w-4 text-indigo-600" />
                            )}
                            <span>
                              {['SHIPPED', 'DELIVERED'].includes(so.status) ? (
                                <>
                                  Dikirim via{' '}
                                  <strong>{so.shipment?.courierName || so.shippingMethod?.name}</strong>
                                  {so.shipment?.trackingNumber && (
                                    <>
                                      {' '}• Resi:{' '}
                                      <strong className="font-mono text-primary-600">
                                        {so.shipment.trackingNumber}
                                      </strong>
                                    </>
                                  )}
                                </>
                              ) : (
                                <>
                                  Seller sedang menyiapkan & mengemas paket Anda ({so.shippingMethod?.name})
                                </>
                              )}
                            </span>
                          </div>
                          {['SHIPPED', 'DELIVERED'].includes(so.status) && (
                            <button
                              type="button"
                              disabled={completingId === so.id}
                              onClick={() => handleConfirmReceived(so.id)}
                              className="btn-primary px-3 py-1.5 text-xs"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {completingId === so.id ? 'Memproses...' : 'Pesanan Diterima'}
                            </button>
                          )}
                        </div>
                      )}
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
            );
          })}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Quick Review Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleSubmitReview} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-navy-900">Beri Penilaian Produk</h3>
            <p className="mt-1 text-xs text-slate-500">{reviewItem.productNameSnapshot}</p>
            <div className="my-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    className={`h-8 w-8 ${
                      star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-amber-600">{reviewRating}/5</span>
            </div>
            <textarea
              rows={3}
              required
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Bagaimana kualitas produk, pengemasan, dan pengiriman dari seller?"
              className="input-field"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setReviewItem(null)} className="btn-outline">
                Batal
              </button>
              <button type="submit" disabled={submittingReview} className="btn-primary">
                {submittingReview ? 'Mengirim...' : 'Kirim Penilaian'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
