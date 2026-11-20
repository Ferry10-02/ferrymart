import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Store,
  Truck,
  QrCode,
  BellRing,
  Phone,
  MessageSquare,
  MessageCircle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

const normalizeWaNumber = (phone) => {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`;
  return digits;
};

/**
 * QR Order Verification & Quick-Action Page (`/qr/order/:orderNumber`)
 * Strictly protected by ProtectedRoute (must be logged in) + backend ownership check.
 * Unauthorized users NEVER receive private order information.
 */
export default function QrOrderPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingAction, setProcessingAction] = useState(false);

  // Quick shipment inputs per sellerOrder
  const [shipInputs, setShipInputs] = useState({});

  const loadOrderQr = useCallback(
    async (showScanToast = false) => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/orders/qr/${encodeURIComponent(orderNumber)}`);
        setData(res.data.data);
        if (showScanToast) {
          toast.success(
            `QR Pesanan ${res.data.data.orderNumber} dipindai! Notifikasi otomatis telah dikirim.`
          );
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [orderNumber, toast]
  );

  useEffect(() => {
    loadOrderQr(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  // Admin: Accept / Approve Manual Payment directly from QR Scan screen
  const handleApprovePayment = async () => {
    if (!data?.payment?.id) return;
    if (!window.confirm(`Terima & setujui pembayaran untuk pesanan ${data.orderNumber}?`)) return;
    setProcessingAction(true);
    try {
      const res = await api.put(`/admin/payments/${data.payment.id}/verify`, {
        status: 'APPROVED',
        adminNotes: 'Pembayaran diterima & diverifikasi melalui halaman Scan QR Pesanan.',
      });
      toast.success(res.data.message);
      await loadOrderQr(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessingAction(false);
    }
  };

  // Seller: Confirm & Ship item directly from QR Scan screen
  const handleQuickShip = async (so) => {
    const input = shipInputs[so.id] || {};
    const courierName = input.courierName || so.shippingMethod?.courier || 'Kurir Toko';
    const trackingNumber = input.trackingNumber || `FM-RESI-${Date.now().toString().slice(-6)}`;

    setProcessingAction(true);
    try {
      const res = await api.post(`/shipments/${so.id}`, {
        courierName,
        trackingNumber,
        status: 'IN_TRANSIT',
        note: 'Pengiriman dikonfirmasi melalui Scan QR Pesanan.',
      });
      toast.success(res.data.message);
      await loadOrderQr(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessingAction(false);
    }
  };

  // Buyer: Confirm order received
  const handleBuyerComplete = async (sellerOrderId) => {
    setProcessingAction(true);
    try {
      const res = await api.post(`/orders/seller-orders/${sellerOrderId}/complete`);
      toast.success(res.data.message);
      await loadOrderQr(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessingAction(false);
    }
  };

  // Open realtime chat with buyer (for Seller/Admin) or seller (for Buyer)
  const handleOpenChat = async (targetUserId) => {
    try {
      const res = await api.post('/chat/conversations', {
        targetUserId,
        orderId: data.orderId,
      });
      const dest = data.isSeller && !data.isBuyer ? '/seller/chat' : '/chat';
      navigate(`${dest}?conversationId=${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memverifikasi hak akses QR pesanan..." />;

  if (error || !data) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14">
        <div className="card p-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <Lock className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-navy-900">Akses QR Pesanan Ditolak</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || 'Anda tidak memiliki hak akses untuk melihat pesanan ini.'}
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Demi privasi & keamanan, FerryMarket tidak menampilkan detail pesanan kepada pengguna yang tidak berwenang.
          </p>
          <Link to="/" className="btn-primary mt-6 inline-flex">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  const buyerWaDigits = normalizeWaNumber(data.buyer?.phone);
  const waBuyerMessage = encodeURIComponent(
    `Halo ${data.buyer?.fullName || 'Kak'}, ini dari FerryMarket terkait pesanan *${data.orderNumber}* (Total ${formatIDR(data.grandTotal)}). Mohon konfirmasi pengiriman barang dan penerimaan pembayaran ya.`
  );
  const latestProof = data.payment?.proofs?.[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <QrCode className="h-6 w-6 text-primary-400" />
            <div>
              <p className="text-xs text-slate-300">Verifikasi QR Pesanan FerryMarket</p>
              <h1 className="font-mono text-lg font-extrabold">{data.orderNumber}</h1>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
            <ShieldCheck className="h-4 w-4" /> Terverifikasi ({data.authorizedAs})
          </span>
        </div>

        <div className="p-6 space-y-5">
          {data.qrScanNotified && (
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-900">
              <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold">Notifikasi Otomatis Scan QR Terkirim</p>
                <p className="mt-0.5 text-emerald-800">
                  Pesanan <strong>{data.orderNumber}</strong> telah dinotifikasikan ke WhatsApp & In-App. Harap hubungi pembeli untuk konfirmasi pengiriman barang dan penerimaan pembayaran.
                </p>
              </div>
            </div>
          )}

          {/* Buyer Contact & Quick Contact Actions */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-xs space-y-1">
                <p className="font-bold uppercase tracking-wide text-slate-500">Informasi Pembeli</p>
                <p className="text-sm font-extrabold text-navy-900">{data.buyer?.fullName}</p>
                <p className="flex items-center gap-1.5 text-slate-700">
                  <Phone className="h-3.5 w-3.5 text-primary-500" /> {data.buyer?.phone || '-'}
                </p>
                {data.shippingAddress && (
                  <p className="text-slate-600">
                    {data.shippingAddress.addressLine}, {data.shippingAddress.city},{' '}
                    {data.shippingAddress.province} {data.shippingAddress.postalCode}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {buyerWaDigits && (
                  <a
                    href={`https://wa.me/${buyerWaDigits}?text=${waBuyerMessage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" /> Hubungi Pembeli (WA)
                  </a>
                )}
                {(data.isAdmin || data.isSeller) && data.buyer?.id && !data.isBuyer && (
                  <button
                    type="button"
                    onClick={() => handleOpenChat(data.buyer.id)}
                    className="btn-outline px-3 py-2 text-xs"
                  >
                    <MessageSquare className="h-4 w-4 text-primary-500" /> Chat Pembeli
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Payment Status & Admin Quick Approve */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <p className="text-xs text-slate-500">Tanggal Pesanan: {formatDate(data.createdAt)}</p>
              <p className="mt-1 text-lg font-extrabold text-primary-600">
                Total: {formatIDR(data.grandTotal)}
              </p>
              {data.payment && (
                <p className="mt-0.5 text-xs text-slate-600">
                  Metode: <strong>{data.payment.paymentMethodName}</strong>
                </p>
              )}
              {latestProof && (
                <a
                  href={latestProof.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:underline"
                >
                  Lihat Bukti Transfer ({latestProof.senderName}) <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex gap-2">
                <StatusBadge status={data.status} />
                {data.payment && <StatusBadge status={data.payment.status} />}
              </div>
              {data.isAdmin && data.payment && data.payment.status !== 'APPROVED' && data.payment.status !== 'REFUNDED' && (
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={handleApprovePayment}
                  className="btn-primary px-3.5 py-2 text-xs"
                >
                  <CreditCard className="h-4 w-4" /> Terima & Setujui Pembayaran
                </button>
              )}
            </div>
          </div>

          {/* Seller Sub-Orders & Shipment Confirmation */}
          {data.sellerOrders?.map((so) => (
            <div key={so.id} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-navy-900">
                  <Store className="h-4 w-4 text-primary-500" /> {so.seller?.storeName}
                </p>
                <StatusBadge status={so.status} />
              </div>

              <ul className="space-y-1.5 text-sm text-slate-700">
                {so.items?.map((i) => (
                  <li key={i.id} className="flex justify-between">
                    <span>
                      {i.productNameSnapshot} × {i.quantity}
                    </span>
                    <span className="font-semibold">{formatIDR(i.totalPrice)}</span>
                  </li>
                ))}
              </ul>

              {so.shipment && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                  <Truck className="h-4 w-4 text-primary-500" />
                  <span>
                    {so.shipment.courierName} • Resi:{' '}
                    <strong className="font-mono text-navy-900">{so.shipment.trackingNumber || '-'}</strong>
                  </span>
                </div>
              )}

              {/* Seller quick shipment confirmation */}
              {data.isSeller && ['PAID', 'CONFIRMED', 'PROCESSING'].includes(so.status) && (
                <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-3 space-y-2">
                  <p className="text-xs font-bold text-primary-800">
                    Konfirmasi Pengiriman Barang (Seller)
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <input
                      placeholder="Nama Kurir (misal JNE / J&T)"
                      value={shipInputs[so.id]?.courierName ?? (so.shippingMethod?.courier || '')}
                      onChange={(e) =>
                        setShipInputs((prev) => ({
                          ...prev,
                          [so.id]: { ...prev[so.id], courierName: e.target.value },
                        }))
                      }
                      className="input-field py-1.5 text-xs"
                    />
                    <input
                      placeholder="Nomor Resi (kosong = auto)"
                      value={shipInputs[so.id]?.trackingNumber ?? ''}
                      onChange={(e) =>
                        setShipInputs((prev) => ({
                          ...prev,
                          [so.id]: { ...prev[so.id], trackingNumber: e.target.value },
                        }))
                      }
                      className="input-field py-1.5 text-xs"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={processingAction}
                    onClick={() => handleQuickShip(so)}
                    className="btn-primary py-1.5 text-xs"
                  >
                    <Truck className="h-3.5 w-3.5" /> Konfirmasi & Kirim Barang Sekarang
                  </button>
                </div>
              )}

              {/* Buyer quick complete confirmation */}
              {data.isBuyer && ['SHIPPED', 'DELIVERED'].includes(so.status) && (
                <button
                  type="button"
                  disabled={processingAction}
                  onClick={() => handleBuyerComplete(so.id)}
                  className="btn-primary py-2 text-xs"
                >
                  <CheckCircle2 className="h-4 w-4" /> Konfirmasi Barang Diterima (Selesai)
                </button>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <Link to={`/orders/${data.orderId}`} className="btn-outline text-xs">
              Buka Detail Pesanan Lengkap
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
