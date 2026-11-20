import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  CheckCircle2,
  PackageCheck,
  X,
  MessageSquare,
  Wallet,
  Package,
  XCircle,
  ListChecks,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge, Pagination } from '../../components/common/UIStates';
import OrderProgressStepper from '../../components/marketplace/OrderProgressStepper';
import { formatIDR, formatDate } from '../../utils/format';

const SELLER_TABS = [
  { key: 'ALL', label: 'Semua', countKey: 'total', icon: ListChecks },
  { key: 'BELUM_BAYAR', label: 'Belum Bayar', countKey: 'belumBayar', icon: Wallet },
  { key: 'DIKEMAS', label: 'Perlu Dikemas', countKey: 'dikemas', icon: Package },
  { key: 'DIKIRIM', label: 'Dikirim', countKey: 'dikirim', icon: Truck },
  { key: 'SELESAI', label: 'Selesai', countKey: 'selesai', icon: CheckCircle2 },
  { key: 'DIBATALKAN', label: 'Dibatalkan', countKey: 'dibatalkan', icon: XCircle },
];

export default function SellerOrdersPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    belumBayar: 0,
    dikemas: 0,
    dikirim: 0,
    selesai: 0,
    dibatalkan: 0,
  });
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [shipModalOrder, setShipModalOrder] = useState(null);
  const [shipForm, setShipForm] = useState({
    courierName: '',
    trackingNumber: '',
    status: 'IN_TRANSIT',
    note: '',
  });
  const [savingShip, setSavingShip] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sellers/orders', { params: { status, page, limit: 15 } });
      setOrders(res.data.data.items || []);
      if (res.data.data.counts) {
        setCounts(res.data.data.counts);
      }
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Realtime refresh when buyer places order / admin approves payment / buyer confirms delivery
  useEffect(() => {
    const onOrderUpdated = () => loadOrders();
    window.addEventListener('fm:order-updated', onOrderUpdated);
    return () => window.removeEventListener('fm:order-updated', onOrderUpdated);
  }, [loadOrders]);

  const updateStatus = async (sellerOrderId, nextStatus) => {
    try {
      const res = await api.put(`/sellers/orders/${sellerOrderId}/status`, { status: nextStatus });
      toast.success(res.data.message);
      loadOrders();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openShipModal = (so) => {
    setShipModalOrder(so);
    setShipForm({
      courierName: so.shipment?.courierName || so.shippingMethod?.courier || 'JNE',
      trackingNumber: so.shipment?.trackingNumber || '',
      status: so.shipment?.status || 'IN_TRANSIT',
      note: '',
    });
  };

  const handleSaveShipment = async (e) => {
    e.preventDefault();
    if (!shipModalOrder) return;
    setSavingShip(true);
    try {
      const res = await api.post(`/shipments/${shipModalOrder.id}`, shipForm);
      toast.success(res.data.message);
      setShipModalOrder(null);
      loadOrders();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingShip(false);
    }
  };

  const handleChatBuyer = async (buyerId, orderId) => {
    try {
      const res = await api.post('/chat/conversations', {
        targetUserId: buyerId,
        orderId,
      });
      navigate(`/seller/chat?conversationId=${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Pesanan Toko & Pengiriman</h2>
        <p className="text-sm text-slate-500">
          Terhubung langsung dengan halaman Pesanan Pembeli — ubah ke Dikemas atau input Resi Pengiriman dan status pembeli otomatis terupdate.
        </p>
      </div>

      {/* Shopee-Style Seller Order Status Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SELLER_TABS.slice(1, 5).map((t) => {
          const Icon = t.icon;
          const cnt = counts[t.countKey] || 0;
          const active = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={`card flex items-center justify-between p-4 text-left transition ${
                active ? 'border-primary-500 bg-primary-50/70 ring-1 ring-primary-400' : 'hover:border-primary-200'
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-500">{t.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-navy-900">{cnt}</p>
              </div>
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  active ? 'bg-primary-500 text-white' : 'bg-slate-100 text-navy-800'
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter Pills with Live Counts */}
      <div className="flex flex-wrap gap-2">
        {SELLER_TABS.map((t) => {
          const cnt = counts[t.countKey] || 0;
          const active = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setStatus(t.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                active
                  ? 'bg-primary-500 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{t.label}</span>
              {cnt > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none ${
                    active ? 'bg-white text-primary-600' : 'bg-primary-100 text-primary-700'
                  }`}
                >
                  {cnt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <LoadingState />
      ) : orders.length === 0 ? (
        <EmptyState title="Belum Ada Pesanan" description="Belum ada pesanan pada filter status ini." />
      ) : (
        <div className="space-y-4">
          {orders.map((so) => (
            <div key={so.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-navy-900">{so.subOrderNumber}</span>
                  <span className="text-slate-400">({so.order?.orderNumber})</span>
                  <StatusBadge status={so.status} />
                  {so.order?.payment && <StatusBadge status={so.order.payment.status} />}
                </div>
                <span className="text-xs text-slate-500">{formatDate(so.createdAt)}</span>
              </div>

              {/* Connected Visual Order Stepper */}
              <div className="border-b border-slate-100 py-1">
                <OrderProgressStepper status={so.status} compact />
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="space-y-2 lg:col-span-7">
                  {so.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span>
                        <strong>{item.productNameSnapshot}</strong>
                        {item.variantNameSnapshot ? ` (${item.variantNameSnapshot})` : ''} × {item.quantity}
                      </span>
                      <span className="font-semibold">{formatIDR(item.totalPrice)}</span>
                    </div>
                  ))}
                  {so.buyerNote && (
                    <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                      Catatan Pembeli: {so.buyerNote}
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 lg:col-span-5">
                  <p className="font-bold text-navy-900">
                    Penerima: {so.order?.shippingAddressSnapshot?.recipientName} (
                    {so.order?.shippingAddressSnapshot?.phone})
                  </p>
                  <p className="mt-0.5">
                    {so.order?.shippingAddressSnapshot?.addressLine},{' '}
                    {so.order?.shippingAddressSnapshot?.city}, {so.order?.shippingAddressSnapshot?.province}
                  </p>
                  <p className="mt-1.5 font-semibold text-navy-900">
                    Kurir: {so.shippingMethod?.name} • Ongkir: {formatIDR(so.shippingCost)}
                  </p>
                  {so.shipment?.trackingNumber && (
                    <p className="mt-1 font-mono font-bold text-primary-600">
                      Resi: {so.shipment.trackingNumber}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <div className="text-xs text-slate-500">
                  Subtotal: <strong className="text-navy-900">{formatIDR(so.subtotal)}</strong> •
                  Estimasi Payout: <strong className="text-emerald-600">{formatIDR(so.sellerPayout)}</strong>
                </div>
                <div className="flex flex-wrap gap-2">
                  {so.order?.buyer?.id && (
                    <button
                      type="button"
                      onClick={() => handleChatBuyer(so.order.buyer.id, so.order.id)}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-primary-500" /> Chat Pembeli
                    </button>
                  )}
                  {so.status === 'PAID' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(so.id, 'CONFIRMED')}
                      className="btn-navy px-3 py-1.5 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Terima Pesanan
                    </button>
                  )}
                  {['PAID', 'CONFIRMED'].includes(so.status) && (
                    <button
                      type="button"
                      onClick={() => updateStatus(so.id, 'PROCESSING')}
                      className="btn-outline px-3 py-1.5 text-xs"
                    >
                      <PackageCheck className="h-3.5 w-3.5" /> Kemas Pesanan
                    </button>
                  )}
                  {['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(so.status) && (
                    <button
                      type="button"
                      onClick={() => openShipModal(so)}
                      className="btn-primary px-3 py-1.5 text-xs"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      {so.shipment ? 'Update Pengiriman / Resi' : 'Kirim & Input Resi'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Shipment Modal */}
      {shipModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <form onSubmit={handleSaveShipment} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">Atur Pengiriman & Resi</h3>
              <button type="button" onClick={() => setShipModalOrder(null)} className="text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="font-mono text-xs text-slate-500">{shipModalOrder.subOrderNumber}</p>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Kurir *</label>
              <input
                required
                value={shipForm.courierName}
                onChange={(e) => setShipForm({ ...shipForm, courierName: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor Resi *</label>
              <input
                required
                value={shipForm.trackingNumber}
                onChange={(e) => setShipForm({ ...shipForm, trackingNumber: e.target.value })}
                placeholder="Contoh: JNE1234567890"
                className="input-field"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Status Pengiriman</label>
              <select
                value={shipForm.status}
                onChange={(e) => setShipForm({ ...shipForm, status: e.target.value })}
                className="input-field"
              >
                <option value="PICKED_UP">Dijemput Kurir</option>
                <option value="IN_TRANSIT">Dalam Pengiriman</option>
                <option value="OUT_FOR_DELIVERY">Sedang Diantar</option>
                <option value="DELIVERED">Tiba di Tujuan</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Catatan Pengiriman</label>
              <input
                value={shipForm.note}
                onChange={(e) => setShipForm({ ...shipForm, note: e.target.value })}
                placeholder="Opsional"
                className="input-field"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShipModalOrder(null)} className="btn-outline">
                Batal
              </button>
              <button type="submit" disabled={savingShip} className="btn-primary">
                {savingShip ? 'Menyimpan...' : 'Simpan & Kirim Notifikasi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
