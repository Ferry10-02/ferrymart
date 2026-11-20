import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, MapPin, Lock, Store, Camera, Trash2, Plus } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function ProfilePage() {
  const { user, setUser, hasRole, refreshUser } = useAuth();
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
  }, [user]);

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-extrabold text-navy-900">Pengaturan Akun & Profil</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="space-y-2 md:col-span-3">
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
                className={`flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  tab === item.id
                    ? 'bg-primary-500 text-white shadow-xs'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
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
              <div className="mb-6 flex items-center gap-4">
                <div className="relative">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-20 w-20 rounded-full border-2 border-primary-500 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-navy-900 text-2xl font-bold text-white">
                      {user?.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary-500 text-white shadow hover:bg-primary-600">
                    <Camera className="h-4 w-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                  </label>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-navy-900">{user?.fullName}</h2>
                  <p className="text-sm text-slate-500">{user?.email}</p>
                  <p className="mt-1 text-xs font-semibold text-primary-600">
                    Role: {user?.roles?.join(', ')}
                  </p>
                </div>
              </div>

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
                <h2 className="mb-4 text-base font-bold text-navy-900">Alamat Tersimpan</h2>
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
              <h2 className="text-base font-bold text-navy-900">Ubah Password Akun</h2>
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
              <h2 className="text-base font-bold text-navy-900">Buka Toko Seller di FerryMarket</h2>
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
  );
}
