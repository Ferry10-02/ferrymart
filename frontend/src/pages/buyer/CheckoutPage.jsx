import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Store,
  Truck,
  CreditCard,
  Tag,
  ShieldAlert,
  Plus,
  CheckCircle2,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/common/UIStates';
import { formatIDR } from '../../utils/format';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { fetchCart } = useCart();
  const { refreshOrderSummary } = useSocket() || {};
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [options, setOptions] = useState(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedPaymentCode, setSelectedPaymentCode] = useState('');
  const [sellerShipping, setSellerShipping] = useState({});
  const [sellerNotes, setSellerNotes] = useState({});
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Quick add address inline form
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrForm, setAddrForm] = useState({
    label: 'Rumah',
    recipientName: '',
    phone: '',
    addressLine: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
    isDefault: true,
  });

  const loadOptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/checkout/options');
      const data = res.data.data;
      setOptions(data);

      if (data.addresses?.length > 0 && !selectedAddressId) {
        const def = data.addresses.find((a) => a.isDefault) || data.addresses[0];
        setSelectedAddressId(def.id);
      }
      if (data.paymentMethods?.length > 0 && !selectedPaymentCode) {
        setSelectedPaymentCode(data.paymentMethods[0].code);
      }
      if (data.shippingMethods?.length > 0 && data.sellerGroups?.length > 0) {
        const defaultShipId = data.shippingMethods[0].id;
        const initMap = {};
        for (const g of data.sellerGroups) {
          initMap[g.seller.id] = sellerShipping[g.seller.id] || defaultShipId;
        }
        setSellerShipping(initMap);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/users/addresses', addrForm);
      toast.success('Alamat pengiriman ditambahkan.');
      setSelectedAddressId(res.data.data.id);
      setShowAddAddress(false);
      await loadOptions();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleApplyCoupon = async (overrideCode = null) => {
    const codeToUse = (typeof overrideCode === 'string' ? overrideCode : couponInput).trim().toUpperCase();
    if (!codeToUse) return;
    setCouponInput(codeToUse);
    try {
      const res = await api.post('/checkout/validate-coupon', {
        code: codeToUse,
        subtotal: options?.subtotal || 0,
      });
      setAppliedCoupon(res.data.data);
      toast.success(`Kupon ${res.data.data.code} diterapkan!`);
    } catch (err) {
      setAppliedCoupon(null);
      toast.error(getErrorMessage(err));
    }
  };

  const computeGroupShipping = (group) => {
    const methodId = sellerShipping[group.seller.id];
    const method = (options?.shippingMethods || []).find((m) => m.id === methodId);
    if (!method) return 0;
    const kg = Math.max(1, Math.ceil((group.totalWeightGrams || 500) / 1000));
    return Number(method.baseCost) + Math.max(0, kg - 1) * Number(method.costPerKg);
  };

  const handleSubmitOrder = async () => {
    if (!selectedAddressId) {
      return toast.error('Pilih atau tambahkan alamat pengiriman terlebih dahulu.');
    }
    if (!selectedPaymentCode) {
      return toast.error('Pilih metode pembayaran manual.');
    }
    setSubmitting(true);
    try {
      const res = await api.post('/checkout', {
        addressId: selectedAddressId,
        paymentMethodCode: selectedPaymentCode,
        sellerShipping,
        sellerNotes,
        couponCode: appliedCoupon?.code || null,
      });
      await Promise.all([fetchCart(), refreshOrderSummary?.()]);
      toast.success(res.data.message);
      navigate(`/orders/${res.data.data.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingState message="Menyiapkan halaman checkout..." />;

  const sellerGroups = options?.sellerGroups || [];
  if (sellerGroups.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <EmptyState
          title="Tidak Ada Item untuk Checkout"
          description="Pilih produk di keranjang belanja Anda sebelum melakukan checkout."
          action={
            <Link to="/cart" className="btn-primary">
              Kembali ke Keranjang
            </Link>
          }
        />
      </div>
    );
  }

  const subtotal = Number(options.subtotal || 0);
  const shippingTotal = sellerGroups.reduce((sum, g) => sum + computeGroupShipping(g), 0);
  const serviceFee = Number(options.serviceFeeConfig?.buyerFeeFlat || 0);
  const discount = Number(appliedCoupon?.discountAmount || 0);
  const grandTotal = Math.max(0, subtotal + shippingTotal + serviceFee - discount);
  const chosenPayment = (options.paymentMethods || []).find((m) => m.code === selectedPaymentCode);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">Checkout Multi-Seller</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          {/* 1. Shipping Address */}
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
                <MapPin className="h-5 w-5 text-primary-500" /> Alamat Pengiriman
              </h2>
              <button
                type="button"
                onClick={() => setShowAddAddress((v) => !v)}
                className="btn-outline px-3 py-1.5 text-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Alamat Baru
              </button>
            </div>

            {showAddAddress && (
              <form
                onSubmit={handleCreateAddress}
                className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4 sm:grid-cols-2"
              >
                <input
                  required
                  placeholder="Label (Rumah/Kantor)"
                  value={addrForm.label}
                  onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                  className="input-field"
                />
                <input
                  required
                  placeholder="Nama Penerima"
                  value={addrForm.recipientName}
                  onChange={(e) => setAddrForm({ ...addrForm, recipientName: e.target.value })}
                  className="input-field"
                />
                <input
                  required
                  placeholder="Nomor HP"
                  value={addrForm.phone}
                  onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                  className="input-field"
                />
                <input
                  required
                  placeholder="Kode Pos"
                  value={addrForm.postalCode}
                  onChange={(e) => setAddrForm({ ...addrForm, postalCode: e.target.value })}
                  className="input-field"
                />
                <input
                  required
                  placeholder="Kota / Kabupaten"
                  value={addrForm.city}
                  onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                  className="input-field"
                />
                <input
                  required
                  placeholder="Provinsi"
                  value={addrForm.province}
                  onChange={(e) => setAddrForm({ ...addrForm, province: e.target.value })}
                  className="input-field"
                />
                <textarea
                  required
                  rows={2}
                  placeholder="Alamat Lengkap (Jalan, RT/RW, Patokan)"
                  value={addrForm.addressLine}
                  onChange={(e) => setAddrForm({ ...addrForm, addressLine: e.target.value })}
                  className="input-field sm:col-span-2"
                />
                <div className="flex justify-end gap-2 sm:col-span-2">
                  <button type="button" onClick={() => setShowAddAddress(false)} className="btn-outline text-xs">
                    Batal
                  </button>
                  <button type="submit" className="btn-primary text-xs">
                    Simpan Alamat
                  </button>
                </div>
              </form>
            )}

            {options.addresses?.length === 0 ? (
              <p className="text-sm text-amber-700">
                Belum ada alamat tersimpan. Klik tombol &ldquo;Tambah Alamat Baru&rdquo; di atas.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {options.addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`cursor-pointer rounded-xl border-2 p-3.5 transition ${
                      selectedAddressId === addr.id
                        ? 'border-primary-500 bg-primary-50/40'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="address"
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        className="mt-1 accent-primary-500"
                      />
                      <div className="text-xs">
                        <p className="font-bold text-navy-900">
                          {addr.label} — {addr.recipientName}
                        </p>
                        <p className="text-slate-600">{addr.phone}</p>
                        <p className="mt-1 text-slate-600">
                          {addr.addressLine}, {addr.city}, {addr.province} {addr.postalCode}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 2. Per-Seller Order Split & Shipping Method */}
          {sellerGroups.map((group, idx) => (
            <div key={group.seller.id} className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-100 bg-navy-900 px-5 py-3 text-white">
                <span className="flex items-center gap-2 text-sm font-bold">
                  <Store className="h-4 w-4 text-primary-400" />
                  Pesanan Seller #{idx + 1}: {group.seller.storeName}
                </span>
                <span className="text-xs text-slate-300">
                  Berat total: {(group.totalWeightGrams / 1000).toFixed(2)} kg
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-4">
                {group.items.map((item) => (
                  <div key={item.cartItemId} className="flex items-center gap-3 py-2.5">
                    <img
                      src={
                        item.imageUrl ||
                        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=120&q=80'
                      }
                      alt={item.name}
                      className="h-14 w-14 rounded-lg border object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-navy-900">{item.name}</p>
                      {item.variantLabel && (
                        <p className="text-xs text-slate-500">{item.variantLabel}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        {item.quantity} × {formatIDR(item.unitPrice)}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-navy-900">{formatIDR(item.lineTotal)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                    <Truck className="h-3.5 w-3.5 text-primary-500" /> Metode Pengiriman
                  </label>
                  <select
                    value={sellerShipping[group.seller.id] || ''}
                    onChange={(e) =>
                      setSellerShipping((prev) => ({
                        ...prev,
                        [group.seller.id]: e.target.value,
                      }))
                    }
                    className="input-field py-2 text-xs"
                  >
                    {(options.shippingMethods || []).map((sm) => (
                      <option key={sm.id} value={sm.id}>
                        {sm.name} ({sm.estimatedDays}) — mulai {formatIDR(sm.baseCost)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">
                    Catatan untuk Seller (Opsional)
                  </label>
                  <input
                    type="text"
                    value={sellerNotes[group.seller.id] || ''}
                    onChange={(e) =>
                      setSellerNotes((prev) => ({ ...prev, [group.seller.id]: e.target.value }))
                    }
                    placeholder="Contoh: Packing bubble wrap tebal"
                    className="input-field py-2 text-xs"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* 3. Manual Payment Methods (Configured by Admin) */}
          <div className="card p-5">
            <h2 className="flex items-center gap-2 text-base font-bold text-navy-900">
              <CreditCard className="h-5 w-5 text-primary-500" /> Metode Pembayaran Manual
            </h2>
            <div className="mt-2 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <p>
                FerryMarket menggunakan <strong>Pembayaran Manual</strong> (bukan payment gateway otomatis). Setelah pesanan dibuat, lakukan transfer sesuai nominal dan unggah bukti pembayaran agar diverifikasi oleh Admin.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(options.paymentMethods || []).map((pm) => (
                <label
                  key={pm.code}
                  className={`cursor-pointer rounded-xl border-2 p-3.5 transition ${
                    selectedPaymentCode === pm.code
                      ? 'border-primary-500 bg-primary-50/40'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={selectedPaymentCode === pm.code}
                      onChange={() => setSelectedPaymentCode(pm.code)}
                      className="mt-1 accent-primary-500"
                    />
                    <div className="text-xs">
                      <p className="font-bold text-navy-900">{pm.name}</p>
                      <p className="mt-0.5 font-mono text-slate-700">{pm.account_number}</p>
                      <p className="text-slate-500">a.n. {pm.account_holder}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {chosenPayment?.instructions && (
              <p className="mt-3 text-xs text-slate-600">
                <strong>Instruksi:</strong> {chosenPayment.instructions}
              </p>
            )}
          </div>
        </div>

        {/* Summary Column */}
        <div className="lg:col-span-4">
          <div className="card sticky top-24 p-6">
            <h2 className="text-base font-bold text-navy-900">Ringkasan Pembayaran</h2>

            {/* Coupon */}
            <div className="mt-4">
              <label className="mb-1 flex items-center gap-1 text-xs font-semibold text-slate-700">
                <Tag className="h-3.5 w-3.5 text-primary-500" /> Kode Voucher / Kupon
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Masukkan kode kupon"
                  className="input-field py-2 text-xs uppercase"
                />
                <button type="button" onClick={handleApplyCoupon} className="btn-navy px-3 py-2 text-xs">
                  Pakai
                </button>
              </div>
              {appliedCoupon && (
                <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Kupon {appliedCoupon.code} aktif (-
                  {formatIDR(appliedCoupon.discountAmount)})
                </p>
              )}

              {(options.availableCoupons || []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <p className="text-[11px] font-bold text-slate-500">Voucher Tersedia (1-Klik Pakai):</p>
                  <div className="space-y-1.5">
                    {options.availableCoupons.slice(0, 4).map((vc) => {
                      const eligible = subtotal >= Number(vc.minPurchase || 0);
                      const isUsed = appliedCoupon?.code === vc.code;
                      return (
                        <button
                          key={vc.id}
                          type="button"
                          disabled={!eligible}
                          onClick={() => handleApplyCoupon(vc.code)}
                          className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-[11px] transition ${
                            isUsed
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : eligible
                              ? 'border-dashed border-primary-300 bg-orange-50/50 hover:bg-orange-100/70'
                              : 'border-slate-200 bg-slate-50 opacity-55 cursor-not-allowed'
                          }`}
                        >
                          <div>
                            <span className="font-mono font-extrabold text-primary-700">{vc.code}</span>
                            <span className="ml-1.5 font-semibold text-navy-900">
                              {vc.discountType === 'PERCENTAGE'
                                ? `Diskon ${vc.discountValue}%`
                                : `Potongan ${formatIDR(vc.discountValue)}`}
                            </span>
                            <p className="text-[10px] text-slate-500">
                              Min. {formatIDR(vc.minPurchase)}
                              {vc.maxDiscount ? ` • Maks. ${formatIDR(vc.maxDiscount)}` : ''}
                            </p>
                          </div>
                          <span className="shrink-0 font-bold text-primary-600">
                            {isUsed ? 'Dipakai ✓' : eligible ? 'Pakai' : 'Belum cukup'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal Produk ({sellerGroups.length} Seller)</span>
                <span className="font-medium text-slate-900">{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Biaya Pengiriman</span>
                <span className="font-medium text-slate-900">{formatIDR(shippingTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Biaya Layanan Platform</span>
                <span className="font-medium text-slate-900">{formatIDR(serviceFee)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon Kupon</span>
                  <span className="font-semibold">-{formatIDR(discount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold text-navy-900">
                <span>Total Pembayaran</span>
                <span className="text-primary-600">{formatIDR(grandTotal)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmitOrder}
              className="btn-primary mt-6 w-full py-3"
            >
              {submitting ? 'Membuat Pesanan...' : 'Buat Pesanan Sekarang'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
