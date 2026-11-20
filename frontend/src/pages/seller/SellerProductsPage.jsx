import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, QrCode, Upload, X, Search } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  LoadingState,
  EmptyState,
  StatusBadge,
  ConfirmModal,
  Pagination,
} from '../../components/common/UIStates';
import QrCodeModal from '../../components/qr/QrCodeModal';
import { formatIDR } from '../../utils/format';

const EMPTY_FORM = {
  name: '',
  categoryId: '',
  sku: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stock: 10,
  weightGrams: 500,
  condition: 'NEW',
  status: 'ACTIVE',
  isFlashSale: false,
  flashSalePrice: '',
  images: [],
  variants: [],
};

export default function SellerProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingImgs, setUploadingImgs] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [qrProduct, setQrProduct] = useState(null);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/sellers/products', { params: { q: search || undefined, page, limit: 15 } });
      setProducts(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search, page, toast]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(res.data.data || []))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, categoryId: categories[0]?.id || '' });
    setModalOpen(true);
  };

  const openEdit = (prod) => {
    setEditingId(prod.id);
    setForm({
      name: prod.name,
      categoryId: prod.categoryId,
      sku: prod.sku || '',
      description: prod.description,
      price: String(Number(prod.price)),
      compareAtPrice: prod.compareAtPrice ? String(Number(prod.compareAtPrice)) : '',
      stock: prod.stock,
      weightGrams: prod.weightGrams,
      condition: prod.condition,
      status: prod.status === 'MODERATED_REJECTED' ? 'INACTIVE' : prod.status,
      isFlashSale: Boolean(prod.isFlashSale),
      flashSalePrice: prod.flashSalePrice ? String(Number(prod.flashSalePrice)) : '',
      images: (prod.images || []).map((i) => i.imageUrl),
      variants: (prod.variants || []).map((v) => ({
        name: v.name,
        value: v.value,
        priceAdjustment: Number(v.priceAdjustment),
        stock: v.stock,
      })),
    });
    setModalOpen(true);
  };

  const handleUploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploadingImgs(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const res = await api.post('/sellers/products/upload-images', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setForm((prev) => ({ ...prev, images: [...prev.images, ...(res.data.data.urls || [])] }));
      toast.success('Foto produk berhasil diunggah.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploadingImgs(false);
      e.target.value = '';
    }
  };

  const addImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setForm((prev) => ({ ...prev, images: [...prev.images, imageUrlInput.trim()] }));
    setImageUrlInput('');
  };

  const addVariantRow = () => {
    setForm((prev) => ({
      ...prev,
      variants: [...prev.variants, { name: 'Warna', value: '', priceAdjustment: 0, stock: 5 }],
    }));
  };

  const updateVariantRow = (idx, field, val) => {
    setForm((prev) => {
      const next = [...prev.variants];
      next[idx] = { ...next[idx], [field]: val };
      return { ...prev, variants: next };
    });
  };

  const removeVariantRow = (idx) => {
    setForm((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
        stock: Number(form.stock),
        weightGrams: Number(form.weightGrams),
        flashSalePrice: form.isFlashSale && form.flashSalePrice ? Number(form.flashSalePrice) : null,
        variants: form.variants.filter((v) => v.name && v.value),
      };

      if (editingId) {
        await api.put(`/sellers/products/${editingId}`, payload);
        toast.success('Produk berhasil diperbarui.');
      } else {
        await api.post('/sellers/products', payload);
        toast.success('Produk baru berhasil ditambahkan.');
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.delete(`/sellers/products/${deleteTarget.id}`);
      toast.success(res.data.message);
      setDeleteTarget(null);
      loadProducts();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold text-navy-900">Kelola Produk & Variasi</h2>
          <p className="text-sm text-slate-500">Tambah produk, atur harga, stok, variasi, dan foto produk toko Anda.</p>
        </div>
        <button type="button" onClick={openCreate} className="btn-primary">
          <Plus className="h-4 w-4" /> Tambah Produk
        </button>
      </div>

      {/* Search */}
      <div className="card flex items-center gap-3 p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama produk..."
            className="input-field pl-9 py-2"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : products.length === 0 ? (
        <EmptyState
          title="Belum Ada Produk"
          description="Mulai berjualan dengan menambahkan produk pertama di toko Anda."
          action={
            <button type="button" onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" /> Tambah Produk Pertama
            </button>
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Produk</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Harga</th>
                  <th className="px-5 py-3">Stok</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            p.images?.[0]?.imageUrl ||
                            'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=100&q=80'
                          }
                          alt={p.name}
                          className="h-12 w-12 rounded-lg border object-cover"
                        />
                        <div>
                          <p className="font-semibold text-navy-900">{p.name}</p>
                          <p className="text-xs text-slate-400">
                            {p.variants?.length || 0} variasi • {p.soldCount} terjual
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{p.category?.name}</td>
                    <td className="px-5 py-3 font-bold text-primary-600">{formatIDR(p.price)}</td>
                    <td className="px-5 py-3 font-semibold">{p.stock}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQrProduct(p)}
                          title="QR Produk"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          title="Edit Produk"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-primary-50 hover:text-primary-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(p)}
                          title="Hapus Produk"
                          className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-4">
            <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        </div>
      )}

      {/* Create/Edit Product Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-navy-900">
                {editingId ? 'Edit Produk' : 'Tambah Produk Baru'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Nama Produk *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Kategori *</label>
                  <select
                    required
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="input-field"
                  >
                    <option value="">Pilih Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">SKU (Opsional)</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Harga Jual (Rp) *</label>
                  <input
                    type="number"
                    required
                    min={100}
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Harga Coret / Asli (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.compareAtPrice}
                    onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Stok *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Berat (gram) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.weightGrams}
                    onChange={(e) => setForm({ ...form, weightGrams: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Kondisi</label>
                  <select
                    value={form.condition}
                    onChange={(e) => setForm({ ...form, condition: e.target.value })}
                    className="input-field"
                  >
                    <option value="NEW">Baru</option>
                    <option value="USED">Bekas</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="input-field"
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="DRAFT">Draft</option>
                    <option value="INACTIVE">Nonaktif</option>
                  </select>
                </div>
              </div>

              {/* Flash Sale toggle */}
              <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5">
                <label className="flex items-center gap-2 text-xs font-bold text-orange-800">
                  <input
                    type="checkbox"
                    checked={form.isFlashSale}
                    onChange={(e) => setForm({ ...form, isFlashSale: e.target.checked })}
                    className="accent-primary-500"
                  />
                  Ikutkan Produk ini ke Program Flash Sale
                </label>
                {form.isFlashSale && (
                  <input
                    type="number"
                    min={100}
                    placeholder="Harga Flash Sale (Rp)"
                    value={form.flashSalePrice}
                    onChange={(e) => setForm({ ...form, flashSalePrice: e.target.value })}
                    className="input-field mt-2"
                  />
                )}
              </div>

              {/* Description */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Deskripsi Produk *</label>
                <textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="input-field"
                />
              </div>

              {/* Images */}
              <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-bold text-navy-900">Foto Produk</span>
                  <label className="btn-outline cursor-pointer px-3 py-1.5 text-xs">
                    <Upload className="h-3.5 w-3.5" /> {uploadingImgs ? 'Mengunggah...' : 'Upload Foto'}
                    <input type="file" multiple accept="image/*" onChange={handleUploadFiles} className="hidden" />
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Atau tempel URL foto gambar..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="input-field py-2 text-xs"
                  />
                  <button type="button" onClick={addImageUrl} className="btn-navy px-3 py-2 text-xs">
                    Tambah URL
                  </button>
                </div>
                {form.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative h-16 w-16 overflow-hidden rounded-lg border">
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx),
                            }))
                          }
                          className="absolute right-0.5 top-0.5 rounded-full bg-red-600 p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Variants */}
              <div className="space-y-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-navy-900">Variasi Produk (Opsional)</span>
                  <button type="button" onClick={addVariantRow} className="btn-outline px-2.5 py-1 text-xs">
                    <Plus className="h-3.5 w-3.5" /> Tambah Variasi
                  </button>
                </div>
                {form.variants.map((v, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      placeholder="Tipe (Warna/Ukuran)"
                      value={v.name}
                      onChange={(e) => updateVariantRow(idx, 'name', e.target.value)}
                      className="input-field col-span-3 py-1.5 text-xs"
                    />
                    <input
                      placeholder="Nilai (Hitam/XL)"
                      value={v.value}
                      onChange={(e) => updateVariantRow(idx, 'value', e.target.value)}
                      className="input-field col-span-3 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      placeholder="+/- Harga"
                      value={v.priceAdjustment}
                      onChange={(e) => updateVariantRow(idx, 'priceAdjustment', Number(e.target.value))}
                      className="input-field col-span-3 py-1.5 text-xs"
                    />
                    <input
                      type="number"
                      min={0}
                      placeholder="Stok"
                      value={v.stock}
                      onChange={(e) => updateVariantRow(idx, 'stock', Number(e.target.value))}
                      className="input-field col-span-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariantRow(idx)}
                      className="col-span-1 flex items-center justify-center text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button type="button" onClick={() => setModalOpen(false)} className="btn-outline">
                Batal
              </button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Menyimpan...' : 'Simpan Produk'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        danger
        title="Hapus Produk?"
        description={`Produk "${deleteTarget?.name}" akan dihapus (atau dinonaktifkan jika sudah memiliki transaksi).`}
        confirmLabel="Ya, Hapus"
      />

      <QrCodeModal
        open={Boolean(qrProduct)}
        onClose={() => setQrProduct(null)}
        title={`QR Produk: ${qrProduct?.name || ''}`}
        subtitle="Tempel QR ini di kemasan atau etalase offline agar pembeli dapat langsung membuka halaman produk."
        targetUrl={
          qrProduct
            ? `${(import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '')}/products/${qrProduct.slug}?src=qr`
            : ''
        }
      />
    </div>
  );
}
