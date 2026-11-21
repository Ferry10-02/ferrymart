import { useState, useEffect, useCallback } from 'react';
import { Ticket, Plus, Pencil, Trash2, X, Power, CheckCircle2 } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/common/UIStates';
import { formatIDR, formatDate } from '../../utils/format';

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '10',
  minPurchase: '50000',
  maxDiscount: '25000',
  usageLimit: '100',
  expiresAt: '',
  isActive: true,
};

export default function AdminCouponsPage() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/coupons');
      setCoupons(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code || '',
      description: c.description || '',
      discountType: c.discountType || 'PERCENTAGE',
      discountValue: String(Number(c.discountValue || 0)),
      minPurchase: String(Number(c.minPurchase || 0)),
      maxDiscount: c.maxDiscount !== null && c.maxDiscount !== undefined ? String(Number(c.maxDiscount)) : '',
      usageLimit: c.usageLimit !== null && c.usageLimit !== undefined ? String(c.usageLimit) : '',
      expiresAt: c.expiresAt ? new Date(c.expiresAt).toISOString().slice(0, 16) : '',
      isActive: Boolean(c.isActive),
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim().toUpperCase(),
        discountValue: Number(form.discountValue),
        minPurchase: Number(form.minPurchase || 0),
        maxDiscount: form.maxDiscount === '' ? null : Number(form.maxDiscount),
        usageLimit: form.usageLimit === '' ? null : parseInt(form.usageLimit, 10),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      };

      if (editing) {
        const res = await api.put(`/admin/coupons/${editing.id}`, payload);
        toast.success(res.data.message);
      } else {
        const res = await api.post('/admin/coupons', payload);
        toast.success(res.data.message);
      }
      setModalOpen(false);
      loadCoupons();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    try {
      const res = await api.put(`/admin/coupons/${c.id}`, { isActive: !c.isActive });
      toast.success(res.data.message);
      loadCoupons();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Hapus voucher ${c.code}?`)) return;
    try {
      const res = await api.delete(`/admin/coupons/${c.id}`);
      toast.info(res.data.message);
      loadCoupons();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900">Kelola Voucher & Kupon Diskon</h2>
          <p className="text-sm text-slate-500">
            Voucher aktif akan otomatis tampil di Beranda & halaman Checkout untuk 1-klik klaim pembeli.
          </p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Buat Voucher Baru
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Belum Ada Voucher"
          description="Buat kode promo pertama Anda untuk meningkatkan transaksi di FerryMarket."
          action={
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Buat Voucher Baru
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => {
            const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
            return (
              <div
                key={c.id}
                className={`card flex flex-col justify-between p-5 ${!c.isActive || isExpired ? 'opacity-70' : ''}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg bg-primary-500 px-2.5 py-1 font-mono text-sm font-extrabold text-white">
                        {c.code}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.isActive && !isExpired
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {isExpired ? 'Kedaluwarsa' : c.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleActive(c)}
                        title={c.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-navy-900"
                      >
                        <Power className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(c)}
                        title="Edit Voucher"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-primary-600"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(c)}
                        title="Hapus Voucher"
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <p className="mt-3 text-lg font-extrabold text-navy-900">
                    {c.discountType === 'PERCENTAGE'
                      ? `Diskon ${Number(c.discountValue)}%`
                      : `Potongan ${formatIDR(c.discountValue)}`}
                  </p>
                  {c.description && <p className="mt-1 text-xs text-slate-600">{c.description}</p>}

                  <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    <p>
                      Min. Belanja: <strong className="text-navy-900">{formatIDR(c.minPurchase)}</strong>
                    </p>
                    {c.maxDiscount && (
                      <p>
                        Maks. Diskon: <strong className="text-navy-900">{formatIDR(c.maxDiscount)}</strong>
                      </p>
                    )}
                    <p>
                      Terpakai:{' '}
                      <strong className="text-primary-600">
                        {c.usedCount} / {c.usageLimit ?? '∞'}
                      </strong>
                    </p>
                    <p>
                      Berakhir:{' '}
                      <strong>{c.expiresAt ? formatDate(c.expiresAt) : 'Tanpa batas waktu'}</strong>
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={handleSave} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-navy-900">
                {editing ? `Edit Voucher ${editing.code}` : 'Buat Voucher Diskon Baru'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kode Voucher *</label>
                <input
                  required
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="Contoh: FERRYHEMAT20"
                  className="input-field font-mono uppercase"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tipe Diskon</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                  className="input-field"
                >
                  <option value="PERCENTAGE">Persentase (%)</option>
                  <option value="FIXED">Potongan Nominal (Rp)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Nilai Diskon ({form.discountType === 'PERCENTAGE' ? '%' : 'Rp'}) *
                </label>
                <input
                  required
                  type="number"
                  min={1}
                  max={form.discountType === 'PERCENTAGE' ? 100 : undefined}
                  value={form.discountValue}
                  onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Minimal Belanja (Rp)</label>
                <input
                  type="number"
                  min={0}
                  value={form.minPurchase}
                  onChange={(e) => setForm({ ...form, minPurchase: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Maksimal Diskon (Rp, opsional)</label>
                <input
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="Kosongkan jika tanpa batas"
                  className="input-field"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Kuota Pemakaian (opsional)</label>
                <input
                  type="number"
                  min={1}
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                  placeholder="Kosongkan jika unlimited"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi Promo</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Contoh: Diskon spesial pengguna setia FerryMarket"
                className="input-field"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 items-center">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tanggal Berakhir (opsional)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="input-field text-xs"
                />
              </div>
              <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs font-semibold text-navy-900">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 accent-primary-500"
                />
                Aktifkan Voucher Sekarang
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-outline">
                Batal
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Menyimpan...' : editing ? 'Simpan Perubahan' : 'Buat Voucher'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
