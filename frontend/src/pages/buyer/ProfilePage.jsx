import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  MapPin,
  Lock,
  Store,
  Camera,
  Trash2,
  Plus,
  Wallet,
  Package,
  Truck,
  Star,
  ChevronRight,
  ShoppingCart,
  Heart,
  MessageSquare,
  Bell,
  ShieldCheck,
  Zap,
  Settings,
  Award,
  CheckCircle2,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';

export default function ProfilePage() {
  const { user, setUser, hasRole, refreshUser } = useAuth();
  const { cart } = useCart();
  const { orderSummary, unreadNotifications, refreshOrderSummary } = useSocket() || {};
  const toast = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({
    fullName: user?.fullName || '',
    phone: user?.phone || '',
    telegramChatId: user?.telegramChatId || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addrForm, setAddrForm] = useState({
    label: 'Rumah',
    recipientName: '',
    phone: '',
    addressLine: '',
    district: '',
    city: '',
    province: '',
    postalCode: '',
    isDefault: false,
  });

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [storeForm, setStoreForm] = useState({
    storeName: '',
    city: '',
    province: '',
    description: '',
  });

  const loadAddresses = async () => {
    try {
      const res = await api.get('/users/addresses');
      setAddresses(res.data.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setProfileForm({
      fullName: user?.fullName || '',
      phone: user?.phone || '',
      telegramChatId: user?.telegramChatId || '',
    });
    loadAddresses();
    refreshOrderSummary?.();
  }, [user, refreshOrderSummary]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await api.put('/users/profile', profileForm);
      setUser(res.data.data);
      toast.success('Profil berhasil diperbarui.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await api.post('/users/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUser(res.data.data.user);
      toast.success('Foto profil diperbarui.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users/addresses', addrForm);
      toast.success('Alamat berhasil ditambahkan.');
      setAddrForm({
        label: 'Rumah',
        recipientName: '',
        phone: '',
        addressLine: '',
        district: '',
        city: '',
        province: '',
        postalCode: '',
        isDefault: false,
      });
      loadAddresses();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`/users/addresses/${id}`);
      toast.info('Alamat dihapus.');
      loadAddresses();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await api.put(`/users/addresses/${id}`, { isDefault: true });
      toast.success('Alamat utama diperbarui.');
      loadAddresses();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast.error('Konfirmasi password baru tidak cocok.');
    }
    try {
      const res = await api.put('/auth/change-password', {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success(res.data.message);
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleOpenStore = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/open-store', storeForm);
      localStorage.setItem('fm_access_token', res.data.data.accessToken);
      await refreshUser();
      toast.success(res.data.message);
      navigate('/seller');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const orderStatusCards = [
    {
      key: 'BELUM_BAYAR',
      label: 'Belum Bayar',
      icon: Wallet,
      count: orderSummary?.belumBayar || 0,
      to: '/orders?tab=BELUM_BAYAR',
    },
    {
      key: 'DIKEMAS',
      label: 'Dikemas',
      icon: Package,
      count: orderSummary?.dikemas || 0,
      to: '/orders?tab=DIKEMAS',
    },
    {
      key: 'DIKIRIM',
      label: 'Dikirim',
      icon: Truck,
      count: orderSummary?.dikirim || 0,
      to: '/orders?tab=DIKIRIM',
    },
    {
      key: 'BERI_PENILAIAN',
      label: 'Beri Penilaian',
      icon: Star,
      count: orderSummary?.beriPenilaian || 0,
      to: '/orders?tab=BERI_PENILAIAN',
    },
  ];

  const memberBadge = hasRole('ADMIN')
    ? 'Administrator'
    : hasRole('SELLER')
    ? 'Seller Terverifikasi'
    : 'Member Classic';

  return (
    <div className="mx-auto max-w-5xl px-4 py-5 space-y-5">
      {/* Shopee-Style Orange Profile Header Banner */}
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-[#EA580C] via-[#F97316] to-[#FB923C] text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="h-16 w-16 rounded-full border-2 border-white object-cover shadow"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/80 bg-navy-900 text-2xl font-extrabold text-white shadow">
                  {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              )}
              <label
                title="Ganti Foto Profil"
                className="absolute -bottom-1 -right-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-white text-primary-600 shadow hover:bg-slate-100"
              >
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
              </label>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-extrabold tracking-tight sm:text-xl">{user?.fullName}</h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-primary-700 shadow-xs">
                  <Award className="h-3 w-3" /> {memberBadge}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-orange-100">{user?.email}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs font-medium text-white/95">
                <span>
                  <strong>{orderSummary?.total || 0}</strong> Total Pesanan
                </span>
                <span>•</span>
                <span>
                  <strong>{orderSummary?.selesai || 0}</strong> Selesai
                </span>
                <span>•</span>
                <span>
                  <strong>{orderSummary?.wishlistCount || 0}</strong> Favorit
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="#pengaturan-akun"
              className="rounded-xl bg-white/15 p-2.5 text-white transition hover:bg-white/25"
              title="Pengaturan Akun"
            >
              <Settings className="h-5 w-5" />
            </a>
            <Link
              to="/cart"
              className="relative rounded-xl bg-white/15 p-2.5 text-white transition hover:bg-white/25"
              title="Keranjang"
            >
              <ShoppingCart className="h-5 w-5" />
              {cart?.summary?.totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-extrabold text-primary-600 shadow">
                  {cart.summary.totalItems}
                </span>
              )}
            </Link>
            <Link
              to="/chat"
              className="relative rounded-xl bg-white/15 p-2.5 text-white transition hover:bg-white/25"
              title="Chat"
            >
              <MessageSquare className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Promo / Verified Strip */}
        <Link
          to="/products?flash_sale=true"
          className="flex items-center justify-between bg-amber-50 px-5 py-2.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 sm:px-6"
        >
          <span className="flex items-center gap-2">
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
              VIP
            </span>
            Belanja Aman di FerryMarket • Cek Flash Sale & Promo Diskon Hari Ini
          </span>
          <ChevronRight className="h-4 w-4 text-amber-700" />
        </Link>
      </div>

      {/* Shopee-Style "Pesanan Saya" Card (LIVE CONNECTED!) */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h2 className="text-sm font-extrabold text-navy-900 sm:text-base">Pesanan Saya</h2>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition hover:text-primary-600"
          >
            Lihat Riwayat Pesanan <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* 4 Status Columns with Live Numeric Badges */}
        <div className="grid grid-cols-4 gap-2 px-3 py-5 sm:px-6">
          {orderStatusCards.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                to={item.to}
                className="group flex flex-col items-center rounded-xl py-2 text-center transition hover:bg-orange-50/70"
              >
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-navy-800 transition group-hover:bg-primary-100 group-hover:text-primary-600">
                  <Icon className="h-6 w-6 stroke-[1.75]" />
                  {item.count > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full border-2 border-white bg-[#EE4D2D] px-1 text-[10px] font-extrabold text-white shadow-xs">
                      {item.count > 99 ? '99+' : item.count}
                    </span>
                  )}
                </div>
                <span className="mt-2 text-[11px] font-semibold text-slate-700 group-hover:text-primary-600 sm:text-xs">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Connected Quick Action Rows (Like Shopee Pulsa/ShopeeFood rows) */}
        <div className="divide-y divide-slate-100 border-t border-slate-100">
          <Link
            to="/products?flash_sale=true"
            className="flex items-center justify-between px-5 py-3.5 text-sm transition hover:bg-slate-50"
          >
            <span className="flex items-center gap-3 font-semibold text-navy-900">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-100 text-primary-600">
                <Zap className="h-4 w-4" />
              </span>
              Flash Sale & Produk Diskon
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
              Lihat Promo <ChevronRight className="h-4 w-4" />
            </span>
          </Link>

          {hasRole('SELLER') ? (
            <Link
              to="/seller/orders"
              className="flex items-center justify-between px-5 py-3.5 text-sm transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-3 font-semibold text-navy-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Store className="h-4 w-4" />
                </span>
                Seller Center — Kelola Pengemasan & Pengiriman
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                Buka Toko <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                setTab('open-store');
                document.getElementById('pengaturan-akun')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="flex w-full items-center justify-between px-5 py-3.5 text-left text-sm transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-3 font-semibold text-navy-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <Store className="h-4 w-4" />
                </span>
                Mulai Berjualan di FerryMarket
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600">
                Buka Toko Gratis <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          )}

          {hasRole('ADMIN') && (
            <Link
              to="/admin/payments"
              className="flex items-center justify-between px-5 py-3.5 text-sm transition hover:bg-slate-50"
            >
              <span className="flex items-center gap-3 font-semibold text-navy-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-navy-900 text-amber-400">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                Dashboard Admin & Verifikasi Pembayaran
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-navy-700">
                Buka Admin <ChevronRight className="h-4 w-4" />
              </span>
            </Link>
          )}
        </div>
      </div>

      {/* Shopee-Style "Aktivitas & Layanan Saya" Card */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-navy-900 sm:text-base">Aktivitas & Layanan Saya</h2>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" /> Sinkron Realtime
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Link
            to="/cart"
            className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-center transition hover:border-primary-300 hover:bg-primary-50/50"
          >
            <ShoppingCart className="h-6 w-6 text-primary-600" />
            <span className="mt-2 text-xs font-bold text-navy-900">Keranjang Saya</span>
            <span className="mt-0.5 text-[11px] font-semibold text-primary-600">
              {cart?.summary?.totalItems || 0} Produk
            </span>
          </Link>
          <Link
            to="/wishlist"
            className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-center transition hover:border-primary-300 hover:bg-primary-50/50"
          >
            <Heart className="h-6 w-6 text-rose-500" />
            <span className="mt-2 text-xs font-bold text-navy-900">Favorit Saya</span>
            <span className="mt-0.5 text-[11px] font-semibold text-slate-600">
              {orderSummary?.wishlistCount || 0} Disimpan
            </span>
          </Link>
          <Link
            to="/chat"
            className="flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-center transition hover:border-primary-300 hover:bg-primary-50/50"
          >
            <MessageSquare className="h-6 w-6 text-sky-600" />
            <span className="mt-2 text-xs font-bold text-navy-900">Chat Seller</span>
            <span className="mt-0.5 text-[11px] font-semibold text-slate-600">Tanya Pesanan</span>
          </Link>
          <Link
            to="/notifications"
            className="relative flex flex-col items-center rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 text-center transition hover:border-primary-300 hover:bg-primary-50/50"
          >
            <Bell className="h-6 w-6 text-amber-500" />
            <span className="mt-2 text-xs font-bold text-navy-900">Notifikasi</span>
            <span className="mt-0.5 text-[11px] font-semibold text-primary-600">
              {unreadNotifications > 0 ? `${unreadNotifications} Belum Dibaca` : 'Semua Terbaca'}
            </span>
          </Link>
        </div>
      </div>

      {/* Account Settings Section */}
      <div id="pengaturan-akun" className="pt-2">
        <h2 className="mb-4 text-lg font-extrabold text-navy-900">Pengaturan Akun & Profil</h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="flex gap-2 overflow-x-auto pb-1 md:col-span-3 md:flex-col md:space-y-2 md:overflow-visible md:pb-0">
            {[
              { id: 'profile', label: 'Profil & Foto', icon: User },
              { id: 'addresses', label: 'Daftar Alamat', icon: MapPin },
              { id: 'security', label: 'Keamanan Password', icon: Lock },
              ...(!hasRole('SELLER') ? [{ id: 'open-store', label: 'Buka Toko Seller', icon: Store }] : []),
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex shrink-0 items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition md:w-full ${
                    tab === item.id
                      ? 'bg-primary-500 text-white shadow-xs'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </button>
              );
            })}
          </div>

          <div className="md:col-span-9">
            {tab === 'profile' && (
              <div className="card p-6">
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Lengkap</label>
                    <input
                      required
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="input-field"
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        No. WhatsApp / HP (untuk notifikasi)
                      </label>
                      <input
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="62812xxxxxxxx"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Telegram Chat ID (opsional, untuk notifikasi)
                      </label>
                      <input
                        value={profileForm.telegramChatId}
                        onChange={(e) => setProfileForm({ ...profileForm, telegramChatId: e.target.value })}
                        placeholder="Contoh: 123456789"
                        className="input-field"
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={savingProfile} className="btn-primary">
                    {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                  </button>
                </form>
              </div>
            )}

            {tab === 'addresses' && (
              <div className="space-y-6">
                <div className="card p-6">
                  <h3 className="mb-4 text-base font-bold text-navy-900">Alamat Tersimpan</h3>
                  {addresses.length === 0 ? (
                    <p className="text-sm text-slate-500">Belum ada alamat tersimpan.</p>
                  ) : (
                    <div className="space-y-3">
                      {addresses.map((a) => (
                        <div
                          key={a.id}
                          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-200 p-4"
                        >
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-navy-900">{a.label}</span>
                              {a.isDefault && (
                                <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold text-primary-700">
                                  Utama
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-medium text-slate-800">
                              {a.recipientName} • {a.phone}
                            </p>
                            <p className="text-xs text-slate-600">
                              {a.addressLine}, {a.city}, {a.province} {a.postalCode}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!a.isDefault && (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(a.id)}
                                className="btn-outline px-2.5 py-1.5 text-xs"
                              >
                                Jadikan Utama
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteAddress(a.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <form onSubmit={handleAddAddress} className="card p-6">
                  <h3 className="mb-4 flex items-center gap-1.5 text-base font-bold text-navy-900">
                    <Plus className="h-4 w-4 text-primary-500" /> Tambah Alamat Baru
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      required
                      placeholder="Label (Rumah / Kantor)"
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
                      placeholder="Alamat Lengkap"
                      value={addrForm.addressLine}
                      onChange={(e) => setAddrForm({ ...addrForm, addressLine: e.target.value })}
                      className="input-field sm:col-span-2"
                    />
                  </div>
                  <button type="submit" className="btn-primary mt-4">
                    Simpan Alamat
                  </button>
                </form>
              </div>
            )}

            {tab === 'security' && (
              <form onSubmit={handleChangePassword} className="card space-y-4 p-6">
                <h3 className="text-base font-bold text-navy-900">Ubah Password Akun</h3>
                <input
                  type="password"
                  required
                  placeholder="Password Saat Ini"
                  value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="input-field"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  placeholder="Password Baru (minimal 8 karakter)"
                  value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="input-field"
                />
                <input
                  type="password"
                  required
                  placeholder="Konfirmasi Password Baru"
                  value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="input-field"
                />
                <button type="submit" className="btn-primary">
                  Perbarui Password
                </button>
              </form>
            )}

            {tab === 'open-store' && !hasRole('SELLER') && (
              <form onSubmit={handleOpenStore} className="card space-y-4 p-6">
                <h3 className="text-base font-bold text-navy-900">Buka Toko Seller di FerryMarket</h3>
                <p className="text-sm text-slate-500">
                  Aktifkan akun Seller untuk mulai berjualan produk, membuat QR Code produk, dan mengelola pesanan pembeli.
                </p>
                <input
                  required
                  placeholder="Nama Toko *"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  className="input-field"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    placeholder="Kota"
                    value={storeForm.city}
                    onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                    className="input-field"
                  />
                  <input
                    placeholder="Provinsi"
                    value={storeForm.province}
                    onChange={(e) => setStoreForm({ ...storeForm, province: e.target.value })}
                    className="input-field"
                  />
                </div>
                <textarea
                  rows={3}
                  placeholder="Deskripsi Toko"
                  value={storeForm.description}
                  onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })}
                  className="input-field"
                />
                <button type="submit" className="btn-primary">
                  Daftar & Aktifkan Toko Seller
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
