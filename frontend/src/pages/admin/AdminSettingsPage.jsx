import { useState, useEffect } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/common/UIStates';

export default function AdminSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [siteInfo, setSiteInfo] = useState({
    site_name: 'FerryMarket',
    tagline: '',
    support_email: '',
    support_phone: '',
  });
  const [serviceFee, setServiceFee] = useState({
    buyer_fee_flat: 2000,
    seller_commission_percent: 2.5,
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [newPm, setNewPm] = useState({
    code: '',
    name: '',
    type: 'BANK_TRANSFER',
    account_number: '',
    account_holder: '',
    instructions: '',
    is_active: true,
  });

  const [banners, setBanners] = useState([]);
  const [bannerForm, setBannerForm] = useState({
    title: '',
    subtitle: '',
    imageUrl: '',
    linkUrl: '/products',
    position: 'HERO',
    sortOrder: 0,
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [settingsRes, bannersRes] = await Promise.all([
        api.get('/admin/settings'),
        api.get('/admin/banners'),
      ]);
      const list = settingsRes.data.data || [];
      const map = Object.fromEntries(list.map((s) => [s.key, s.value]));

      if (map.site_info) setSiteInfo(map.site_info);
      if (map.service_fee) setServiceFee(map.service_fee);
      if (Array.isArray(map.manual_payment_methods)) setPaymentMethods(map.manual_payment_methods);
      setBanners(bannersRes.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSetting = async (key, value, category, isPublic = true) => {
    try {
      await api.put(`/admin/settings/${key}`, { value, category, isPublic });
      toast.success(`Pengaturan "${key}" berhasil disimpan.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const addPaymentMethod = async (e) => {
    e.preventDefault();
    if (!newPm.code || !newPm.name || !newPm.account_number) return;
    const next = [...paymentMethods, { ...newPm, code: newPm.code.toUpperCase() }];
    setPaymentMethods(next);
    await saveSetting('manual_payment_methods', next, 'PAYMENT', true);
    setNewPm({
      code: '',
      name: '',
      type: 'BANK_TRANSFER',
      account_number: '',
      account_holder: '',
      instructions: '',
      is_active: true,
    });
  };

  const removePaymentMethod = async (code) => {
    const next = paymentMethods.filter((m) => m.code !== code);
    setPaymentMethods(next);
    await saveSetting('manual_payment_methods', next, 'PAYMENT', true);
  };

  const handleCreateBanner = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/banners', bannerForm);
      toast.success('Banner promosi berhasil ditambahkan.');
      setBannerForm({ title: '', subtitle: '', imageUrl: '', linkUrl: '/products', position: 'HERO', sortOrder: 0 });
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeleteBanner = async (id) => {
    try {
      await api.delete(`/admin/banners/${id}`);
      toast.info('Banner dihapus.');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memuat pengaturan website..." />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Pengaturan Website, Biaya Layanan & Banner</h2>
        <p className="text-sm text-slate-500">
          Konfigurasi informasi situs, biaya layanan, rekening pembayaran manual, dan banner promosi homepage.
        </p>
      </div>

      {/* 1. Site Info & Service Fees */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card space-y-3 p-6">
          <h3 className="text-base font-bold text-navy-900">Informasi Website</h3>
          <input
            placeholder="Nama Website"
            value={siteInfo.site_name || ''}
            onChange={(e) => setSiteInfo({ ...siteInfo, site_name: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Tagline"
            value={siteInfo.tagline || ''}
            onChange={(e) => setSiteInfo({ ...siteInfo, tagline: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Email Support"
            value={siteInfo.support_email || ''}
            onChange={(e) => setSiteInfo({ ...siteInfo, support_email: e.target.value })}
            className="input-field"
          />
          <input
            placeholder="Nomor Telepon Support"
            value={siteInfo.support_phone || ''}
            onChange={(e) => setSiteInfo({ ...siteInfo, support_phone: e.target.value })}
            className="input-field"
          />
          <button
            type="button"
            onClick={() => saveSetting('site_info', siteInfo, 'GENERAL', true)}
            className="btn-primary"
          >
            <Save className="h-4 w-4" /> Simpan Informasi Website
          </button>
        </div>

        <div className="card space-y-3 p-6">
          <h3 className="text-base font-bold text-navy-900">Pengaturan Biaya Layanan</h3>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Biaya Layanan Pembeli per Checkout (Rp)
            </label>
            <input
              type="number"
              min={0}
              value={serviceFee.buyer_fee_flat ?? 0}
              onChange={(e) => setServiceFee({ ...serviceFee, buyer_fee_flat: Number(e.target.value) })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Komisi Marketplace dari Seller (%)
            </label>
            <input
              type="number"
              min={0}
              max={50}
              step="0.1"
              value={serviceFee.seller_commission_percent ?? 0}
              onChange={(e) =>
                setServiceFee({ ...serviceFee, seller_commission_percent: Number(e.target.value) })
              }
              className="input-field"
            />
          </div>
          <button
            type="button"
            onClick={() => saveSetting('service_fee', serviceFee, 'FINANCE', true)}
            className="btn-primary"
          >
            <Save className="h-4 w-4" /> Simpan Biaya Layanan
          </button>
        </div>
      </div>

      {/* 2. Manual Payment Methods */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">
          Rekening & Metode Pembayaran Manual
        </h3>
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {paymentMethods.map((pm) => (
            <div key={pm.code} className="flex items-start justify-between rounded-xl border border-slate-200 p-3.5 text-xs">
              <div>
                <p className="font-bold text-navy-900">{pm.name} ({pm.code})</p>
                <p className="font-mono text-primary-600">{pm.account_number}</p>
                <p className="text-slate-500">a.n. {pm.account_holder}</p>
              </div>
              <button
                type="button"
                onClick={() => removePaymentMethod(pm.code)}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={addPaymentMethod} className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-6">
          <input
            required
            placeholder="Kode (BANK_BNI)"
            value={newPm.code}
            onChange={(e) => setNewPm({ ...newPm, code: e.target.value })}
            className="input-field sm:col-span-1 text-xs"
          />
          <input
            required
            placeholder="Nama Metode"
            value={newPm.name}
            onChange={(e) => setNewPm({ ...newPm, name: e.target.value })}
            className="input-field sm:col-span-2 text-xs"
          />
          <input
            required
            placeholder="No. Rekening / E-Wallet"
            value={newPm.account_number}
            onChange={(e) => setNewPm({ ...newPm, account_number: e.target.value })}
            className="input-field sm:col-span-1 text-xs"
          />
          <input
            required
            placeholder="Atas Nama"
            value={newPm.account_holder}
            onChange={(e) => setNewPm({ ...newPm, account_holder: e.target.value })}
            className="input-field sm:col-span-1 text-xs"
          />
          <button type="submit" className="btn-navy sm:col-span-1 text-xs">
            <Plus className="h-4 w-4" /> Tambah
          </button>
        </form>
      </div>

      {/* 3. Promo Banners Manager */}
      <div className="card p-6">
        <h3 className="mb-4 text-base font-bold text-navy-900">Kelola Banner Promosi Homepage</h3>
        <form onSubmit={handleCreateBanner} className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-6">
          <input
            required
            placeholder="Judul Banner *"
            value={bannerForm.title}
            onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
            className="input-field sm:col-span-2 text-xs"
          />
          <input
            required
            type="url"
            placeholder="URL Gambar Banner *"
            value={bannerForm.imageUrl}
            onChange={(e) => setBannerForm({ ...bannerForm, imageUrl: e.target.value })}
            className="input-field sm:col-span-2 text-xs"
          />
          <select
            value={bannerForm.position}
            onChange={(e) => setBannerForm({ ...bannerForm, position: e.target.value })}
            className="input-field sm:col-span-1 text-xs"
          >
            <option value="HERO">HERO</option>
            <option value="PROMO_SIDE">PROMO_SIDE</option>
            <option value="MIDDLE">MIDDLE</option>
          </select>
          <button type="submit" className="btn-primary sm:col-span-1 text-xs">
            <Plus className="h-4 w-4" /> Tambah Banner
          </button>
        </form>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((b) => (
            <div key={b.id} className="overflow-hidden rounded-xl border border-slate-200">
              <img src={b.imageUrl} alt={b.title} className="h-32 w-full object-cover" />
              <div className="flex items-center justify-between p-3 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-bold text-navy-900">{b.title}</p>
                  <p className="text-slate-500">{b.position}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteBanner(b.id)}
                  className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
