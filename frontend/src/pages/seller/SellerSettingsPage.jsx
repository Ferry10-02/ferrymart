import { useState, useEffect } from 'react';
import {
  Upload,
  Save,
  Send,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  BellRing,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge } from '../../components/common/UIStates';

export default function SellerSettingsPage() {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detectingTg, setDetectingTg] = useState(false);
  const [testingTg, setTestingTg] = useState(false);

  useEffect(() => {
    api
      .get('/sellers/settings')
      .then((res) => setForm(res.data.data))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/sellers/settings', form);
      setForm(res.data.data);
      await refreshUser();
      toast.success(res.data.message || 'Pengaturan toko berhasil disimpan.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleUploadMedia = async (type, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    try {
      const res = await api.post('/sellers/media', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, ...res.data.data }));
      toast.success(`${type === 'banner' ? 'Banner' : 'Logo'} toko berhasil diunggah.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDetectTelegram = async () => {
    setDetectingTg(true);
    try {
      const res = await api.post('/sellers/telegram/detect');
      setForm((prev) => ({ ...prev, telegramChatId: res.data.data.chatId }));
      await refreshUser();
      toast.success(res.data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDetectingTg(false);
    }
  };

  const handleTestTelegram = async () => {
    setTestingTg(true);
    try {
      const res = await api.post('/sellers/telegram/test', {
        telegramChatId: form?.telegramChatId,
      });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTestingTg(false);
    }
  };

  if (loading || !form) return <LoadingState message="Memuat pengaturan toko..." />;

  const bot = form.telegramBot || {};
  const hasChatId = Boolean(form.telegramChatId && String(form.telegramChatId).trim());

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900">Pengaturan Toko & Notifikasi</h2>
          <p className="text-sm text-slate-500">
            Atur notifikasi Telegram otomatis, identitas toko, lokasi, dan rekening bank pencairan.
          </p>
        </div>
        <StatusBadge status={form.verificationStatus} />
      </div>

      {/* Automatic Telegram Seller Notification Setup */}
      <div className="card border-sky-200 bg-gradient-to-br from-sky-50/70 via-white to-white p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-navy-900">
                Notifikasi Telegram Otomatis Seller
              </h3>
              <p className="text-xs text-slate-500">
                Terima notif otomatis ke Telegram HP saat ada pesanan baru, bukti transfer, pembayaran disetujui, scan QR, dan chat pembeli.
              </p>
            </div>
          </div>

          {bot.configured ? (
            hasChatId ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Aktif ({form.telegramChatId})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> Bot Siap — Hubungkan Chat ID
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              Bot Belum Dikonfigurasi Admin
            </span>
          )}
        </div>

        {bot.configured && (
          <>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
              <li>
                Klik tombol <strong>Buka Bot Telegram {bot.username ? `@${bot.username}` : ''}</strong> di bawah, lalu tekan tombol <strong>START</strong> di aplikasi Telegram Anda.
              </li>
              <li>
                Kembali ke halaman ini lalu klik <strong>Deteksi & Simpan Chat ID Otomatis</strong>.
              </li>
              <li>
                Selesai! Anda bisa langsung klik <strong>Tes Kirim Telegram</strong> untuk melihat notifikasi masuk ke HP Anda.
              </li>
            </ol>

            <div className="flex flex-wrap items-center gap-2">
              {bot.link && (
                <a
                  href={bot.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-700"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> 1. Buka @{bot.username} & Klik START
                </a>
              )}
              <button
                type="button"
                disabled={detectingTg}
                onClick={handleDetectTelegram}
                className="btn-primary py-2 text-xs"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {detectingTg ? 'Mendeteksi...' : '2. Deteksi & Simpan Chat ID Otomatis'}
              </button>
              <button
                type="button"
                disabled={testingTg || !hasChatId}
                onClick={handleTestTelegram}
                className="btn-navy py-2 text-xs"
              >
                <Send className="h-3.5 w-3.5" />
                {testingTg ? 'Mengirim...' : '3. Tes Kirim Telegram'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-12">
              <div className="sm:col-span-8">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Telegram Chat ID Seller (Otomatis terisi atau masukkan manual)
                </label>
                <input
                  value={form.telegramChatId || ''}
                  onChange={(e) => setForm({ ...form, telegramChatId: e.target.value })}
                  placeholder="Contoh: 123456789"
                  className="input-field py-2 text-xs font-mono"
                />
              </div>
              <div className="flex items-end sm:col-span-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="btn-outline w-full py-2 text-xs"
                >
                  <Save className="h-3.5 w-3.5" /> Simpan Chat ID
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Media Uploads */}
      <div className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-bold text-slate-700">Logo Toko</p>
          <div className="flex items-center gap-3">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl border object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                No Logo
              </div>
            )}
            <label className="btn-outline cursor-pointer px-3 py-2 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload Logo
              <input type="file" accept="image/*" onChange={(e) => handleUploadMedia('logo', e)} className="hidden" />
            </label>
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-bold text-slate-700">Banner Toko</p>
          <div className="flex items-center gap-3">
            {form.bannerUrl ? (
              <img src={form.bannerUrl} alt="Banner" className="h-16 w-28 rounded-xl border object-cover" />
            ) : (
              <div className="flex h-16 w-28 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400">
                No Banner
              </div>
            )}
            <label className="btn-outline cursor-pointer px-3 py-2 text-xs">
              <Upload className="h-3.5 w-3.5" /> Upload Banner
              <input type="file" accept="image/*" onChange={(e) => handleUploadMedia('banner', e)} className="hidden" />
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Toko</label>
            <input
              required
              value={form.storeName || ''}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Nomor Telepon / WA Toko</label>
            <input
              value={form.phone || ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Kota</label>
            <input
              value={form.city || ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Provinsi</label>
            <input
              value={form.province || ''}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Kode Pos</label>
            <input
              value={form.postalCode || ''}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Alamat Toko</label>
            <textarea
              rows={2}
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi Toko</label>
            <textarea
              rows={3}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <h3 className="mb-3 text-sm font-bold text-navy-900">Rekening Bank Pencairan Dana Seller</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              placeholder="Nama Bank (BCA/Mandiri)"
              value={form.bankName || ''}
              onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Nomor Rekening"
              value={form.bankAccountNumber || ''}
              onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
              className="input-field"
            />
            <input
              placeholder="Atas Nama"
              value={form.bankAccountHolder || ''}
              onChange={(e) => setForm({ ...form, bankAccountHolder: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          <Save className="h-4 w-4" /> {saving ? 'Menyimpan...' : 'Simpan Pengaturan Toko'}
        </button>
      </form>
    </div>
  );
}
