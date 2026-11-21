import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  QrCode,
  Store,
  Truck,
  CheckCircle2,
  Star,
  CreditCard,
  XCircle,
  ExternalLink,
  MessageSquare,
  Copy,
  Clock,
  Printer,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { LoadingState, ErrorState, StatusBadge, ConfirmModal } from '../../components/common/UIStates';
import OrderProgressStepper from '../../components/marketplace/OrderProgressStepper';
import InvoiceModal from '../../components/marketplace/InvoiceModal';
import QrCodeModal from '../../components/qr/QrCodeModal';
import { formatIDR, formatDate } from '../../utils/format';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { refreshOrderSummary } = useSocket() || {};

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  // Payment proof upload form
  const [proofForm, setProofForm] = useState({
    senderName: '',
    senderBank: '',
    transferAmount: '',
    notes: '',
  });
  const [proofFile, setProofFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Cancel confirmation modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Review modal state
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/orders/${id}`);
      setData(res.data.data);
      setProofForm((prev) => ({
        ...prev,
        transferAmount: prev.transferAmount || String(Number(res.data.data.order.grandTotal || 0)),
      }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    const onOrderUpdated = () => loadOrder();
    window.addEventListener('fm:order-updated', onOrderUpdated);
    return () => window.removeEventListener('fm:order-updated', onOrderUpdated);
  }, [loadOrder]);

  const handleUploadProof = async (e) => {
    e.preventDefault();
    if (!proofFile) return toast.error('Pilih gambar bukti transfer terlebih dahulu.');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('proof', proofFile);
      fd.append('senderName', proofForm.senderName);
      fd.append('senderBank', proofForm.senderBank);
      fd.append('transferAmount', proofForm.transferAmount);
      if (proofForm.notes) fd.append('notes', proofForm.notes);

      const res = await api.post(`/payments/${data.order.id}/proof`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success(res.data.message);
      setProofFile(null);
      await Promise.all([loadOrder(), refreshOrderSummary?.()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmReceived = async (sellerOrderId) => {
    try {
      const res = await api.post(`/orders/seller-orders/${sellerOrderId}/complete`);
      toast.success(res.data.message);
      await Promise.all([loadOrder(), refreshOrderSummary?.()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      const res = await api.post(`/orders/${data.order.id}/cancel`);
      toast.success(res.data.message);
      setCancelOpen(false);
      await Promise.all([loadOrder(), refreshOrderSummary?.()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
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
      toast.success('Terima kasih! Ulasan Anda berhasil dikirim.');
      setReviewItem(null);
      setReviewComment('');
      await Promise.all([loadOrder(), refreshOrderSummary?.()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleChatSeller = async (sellerId) => {
    try {
      const res = await api.post('/chat/conversations', {
        sellerId,
        orderId: data?.order?.id,
      });
      navigate(`/chat?conversationId=${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memuat detail pesanan..." />;
  if (error || !data?.order) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <ErrorState message={error || 'Pesanan tidak ditemukan.'} onRetry={loadOrder} />
      </div>
    );
  }

  const { order, qr } = data;
  const payment = order.payment;
  const canUploadProof =
    payment && ['PENDING', 'REJECTED', 'WAITING_VERIFICATION'].includes(payment.status);
  const canCancel = ['PENDING_PAYMENT', 'WAITING_VERIFICATION'].includes(order.status);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary-600">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Riwayat Pesanan
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setInvoiceOpen(true)} className="btn-outline px-3.5 py-2 text-xs">
            <Printer className="h-4 w-4 text-primary-600" /> Cetak / PDF Invoice
          </button>
          <button type="button" onClick={() => setQrOpen(true)} className="btn-navy px-3.5 py-2 text-xs">
            <QrCode className="h-4 w-4" /> Tampilkan QR Pesanan
          </button>
          {canCancel && (
            <button type="button" onClick={() => setCancelOpen(true)} className="btn-danger px-3.5 py-2 text-xs">
              <XCircle className="h-4 w-4" /> Batalkan Pesanan
            </button>
          )}
        </div>
      </div>

      {/* Header Summary */}
      <div className="card mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-slate-500">Nomor Pesanan Induk</p>
            <h1 className="font-mono text-2xl font-extrabold text-navy-900">{order.orderNumber}</h1>
            <p className="mt-1 text-xs text-slate-500">Dibuat pada {formatDate(order.createdAt)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            {payment && <StatusBadge status={payment.status} />}
          </div>
        </div>

        {/* Live Order Progress Stepper */}
        <div className="mt-5 border-t border-slate-100 pt-4">
          <OrderProgressStepper
            status={order.status}
            hasUnreviewedItems={order.sellerOrders?.some(
              (so) =>
                ['DELIVERED', 'COMPLETED'].includes(so.status) &&
                so.items?.some((item) => !item.review)
            )}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-4 md:grid-cols-2">
          <div className="text-xs">
            <p className="font-bold uppercase tracking-wide text-slate-500">Alamat Pengiriman</p>
            <p className="mt-1 font-semibold text-navy-900">
              {order.shippingAddressSnapshot?.recipientName} ({order.shippingAddressSnapshot?.phone})
            </p>
            <p className="mt-0.5 text-slate-600">
              {order.shippingAddressSnapshot?.addressLine}, {order.shippingAddressSnapshot?.city},{' '}
              {order.shippingAddressSnapshot?.province} {order.shippingAddressSnapshot?.postalCode}
            </p>
          </div>
          <div className="space-y-1 text-xs md:text-right">
            <p className="text-slate-600">Subtotal: {formatIDR(order.subtotal)}</p>
            <p className="text-slate-600">Pengiriman: {formatIDR(order.shippingTotal)}</p>
            <p className="text-slate-600">Biaya Layanan: {formatIDR(order.serviceFee)}</p>
            {Number(order.discountTotal) > 0 && (
              <p className="text-emerald-600">Diskon: -{formatIDR(order.discountTotal)}</p>
            )}
            <p className="pt-1 text-lg font-extrabold text-primary-600">
              Total: {formatIDR(order.grandTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Manual Payment & Proof Upload Section */}
      {payment && (
        <div className="card mb-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
              <CreditCard className="h-5 w-5 text-primary-500" /> Pembayaran Manual & Bukti Transfer
            </h2>
            <StatusBadge status={payment.status} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
              <p className="font-bold text-navy-900">{payment.paymentMethodName}</p>
              <p className="font-mono text-base font-bold text-primary-600">
                {payment.paymentDestination}
              </p>
              <p className="text-xs text-slate-600">
                Nominal Transfer: <strong className="text-navy-900">{formatIDR(payment.amount)}</strong>
              </p>
              {payment.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                  <strong>Alasan Penolakan Admin:</strong> {payment.rejectionReason}
                </div>
              )}

              {payment.proofs?.length > 0 && (
                <div className="border-t border-slate-200 pt-3">
                  <p className="mb-2 text-xs font-bold text-slate-700">Riwayat Bukti Diunggah:</p>
                  <div className="space-y-2">
                    {payment.proofs.map((pf) => (
                      <div
                        key={pf.id}
                        className="flex items-center justify-between rounded-lg bg-white p-2.5 text-xs border"
                      >
                        <div>
                          <p className="font-semibold text-navy-900">
                            {pf.senderName} ({pf.senderBank})
                          </p>
                          <p className="text-slate-500">
                            {formatIDR(pf.transferAmount)} • {formatDate(pf.createdAt)}
                          </p>
                        </div>
                        <a
                          href={pf.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline"
                        >
                          Lihat <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {canUploadProof && (
              <form onSubmit={handleUploadProof} className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">
                  Unggah Bukti Pembayaran
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    required
                    placeholder="Nama Pengirim Rekening"
                    value={proofForm.senderName}
                    onChange={(e) => setProofForm({ ...proofForm, senderName: e.target.value })}
                    className="input-field"
                  />
                  <input
                    required
                    placeholder="Bank / E-Wallet Pengirim"
                    value={proofForm.senderBank}
                    onChange={(e) => setProofForm({ ...proofForm, senderBank: e.target.value })}
                    className="input-field"
                  />
                </div>
                <input
                  required
                  type="number"
                  min={1}
                  placeholder="Nominal Transfer (Rp)"
                  value={proofForm.transferAmount}
                  onChange={(e) => setProofForm({ ...proofForm, transferAmount: e.target.value })}
                  className="input-field"
                />
                <input
                  type="text"
                  placeholder="Catatan tambahan (opsional)"
                  value={proofForm.notes}
                  onChange={(e) => setProofForm({ ...proofForm, notes: e.target.value })}
                  className="input-field"
                />
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Foto Struk / Screenshot Transfer (JPG/PNG/WEBP, maks 5MB) *
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="input-field py-2 text-xs"
                  />
                </div>
                <button type="submit" disabled={uploading} className="btn-primary w-full">
                  <Upload className="h-4 w-4" />
                  {uploading ? 'Mengunggah Bukti...' : 'Kirim Bukti Pembayaran'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Split Seller Sub-Orders */}
      <div className="space-y-4">
        {order.sellerOrders?.map((so) => (
          <div key={so.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-navy-900 px-5 py-3 text-white">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Store className="h-4 w-4 text-primary-400" />
                {so.seller?.storeName}
                <span className="font-mono text-xs text-slate-400">({so.subOrderNumber})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleChatSeller(so.seller?.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/20"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-primary-400" /> Chat Seller
                </button>
                <StatusBadge status={so.status} />
              </div>
            </div>

            <div className="divide-y divide-slate-100 p-5">
              {so.items?.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        item.productImageSnapshot ||
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'
                      }
                      alt=""
                      className="h-14 w-14 rounded-lg border object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-navy-900">{item.productNameSnapshot}</p>
                      <p className="text-xs text-slate-500">
                        {item.variantNameSnapshot ? `${item.variantNameSnapshot} • ` : ''}
                        {item.quantity} × {formatIDR(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-navy-900">{formatIDR(item.totalPrice)}</p>
                    {['DELIVERED', 'COMPLETED'].includes(so.status) && !item.review && (
                      <button
                        type="button"
                        onClick={() => {
                          setReviewItem(item);
                          setReviewRating(5);
                          setReviewComment('');
                        }}
                        className="btn-outline px-3 py-1.5 text-xs"
                      >
                        <Star className="h-3.5 w-3.5 text-amber-500" /> Beri Ulasan
                      </button>
                    )}
                    {item.review && (
                      <span className="text-xs font-semibold text-emerald-600">
                        Sudah diulas ({item.review.rating}★)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Shipment Info, Live Tracking Timeline & Buyer Confirm Delivery */}
            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-slate-600">
                  <Truck className="h-4 w-4 text-primary-500" />
                  <span>
                    Kurir: <strong>{so.shipment?.courierName || so.shippingMethod?.name}</strong>
                    {so.shipment?.trackingNumber && (
                      <>
                        {' '}• No. Resi:{' '}
                        <strong className="font-mono text-navy-900">{so.shipment.trackingNumber}</strong>
                      </>
                    )}
                  </span>
                  {so.shipment?.trackingNumber && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(so.shipment.trackingNumber);
                        toast.info('Nomor resi disalin!');
                      }}
                      className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      <Copy className="h-3 w-3" /> Salin Resi
                    </button>
                  )}
                </div>
                {['SHIPPED', 'DELIVERED'].includes(so.status) && (
                  <button
                    type="button"
                    onClick={() => handleConfirmReceived(so.id)}
                    className="btn-primary px-3.5 py-1.5 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Pesanan Diterima (Selesai)
                  </button>
                )}
              </div>

              {Array.isArray(so.shipment?.trackingHistory) && so.shipment.trackingHistory.length > 0 && (
                <div className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-navy-900">
                    <Clock className="h-3.5 w-3.5 text-primary-500" /> Riwayat Pengiriman
                  </p>
                  <div className="space-y-2.5 border-l-2 border-primary-200 pl-3.5">
                    {[...so.shipment.trackingHistory].reverse().map((ev, i) => (
                      <div key={i} className="relative">
                        <span
                          className={`absolute -left-[19px] top-1 h-2.5 w-2.5 rounded-full ${
                            i === 0 ? 'bg-primary-500 ring-4 ring-primary-100' : 'bg-slate-300'
                          }`}
                        />
                        <p className="font-semibold text-navy-900">{ev.description || ev.status}</p>
                        {ev.timestamp && (
                          <p className="text-[11px] text-slate-400">{formatDate(ev.timestamp)}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Review Modal */}
      {reviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <form onSubmit={handleSubmitReview} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-navy-900">Tulis Ulasan Produk</h3>
            <p className="mt-1 text-xs text-slate-500">{reviewItem.productNameSnapshot}</p>
            <div className="my-4 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setReviewRating(star)}
                  className="p-1"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              required
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Ceritakan pengalaman Anda tentang kualitas produk dan layanan seller..."
              className="input-field"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setReviewItem(null)} className="btn-outline">
                Batal
              </button>
              <button type="submit" disabled={submittingReview} className="btn-primary">
                {submittingReview ? 'Mengirim...' : 'Kirim Ulasan'}
              </button>
            </div>
          </form>
        </div>
      )}

      <InvoiceModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} order={order} />

      <QrCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        title={`QR Pesanan ${order.orderNumber}`}
        subtitle="Scan untuk cek status pesanan secara aman (wajib login & lolos pemeriksaan hak akses)."
        targetUrl={qr?.targetUrl || `${window.location.origin}/qr/order/${order.orderNumber}`}
      />

      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelOrder}
        loading={cancelling}
        danger
        title="Batalkan Pesanan?"
        description="Pesanan yang dibatalkan akan mengembalikan stok produk ke seller."
        confirmLabel="Ya, Batalkan"
      />
    </div>
  );
}
