import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge } from '../../components/common/UIStates';

export default function AdminCategoriesPage() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', icon: 'Tag', description: '', sortOrder: 0, isActive: true });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories', { params: { includeInactive: 'true' } });
      setCategories(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/categories/${editing.id}`, form);
        toast.success('Kategori berhasil diperbarui.');
      } else {
        await api.post('/categories', form);
        toast.success('Kategori baru berhasil dibuat.');
      }
      setEditing(null);
      setForm({ name: '', icon: 'Tag', description: '', sortOrder: 0, isActive: true });
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Hapus kategori ini?')) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Kategori dihapus.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Kelola Kategori Produk</h2>
        <p className="text-sm text-slate-500">Tambah, ubah urutan, atau nonaktifkan kategori marketplace.</p>
      </div>

      <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-3 p-5 sm:grid-cols-12">
        <input
          required
          placeholder="Nama Kategori *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input-field sm:col-span-3"
        />
        <input
          placeholder="Ikon Lucide (Smartphone/Shirt)"
          value={form.icon}
          onChange={(e) => setForm({ ...form, icon: e.target.value })}
          className="input-field sm:col-span-2"
        />
        <input
          placeholder="Deskripsi singkat"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input-field sm:col-span-4"
        />
        <input
          type="number"
          placeholder="Urutan"
          value={form.sortOrder}
          onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
          className="input-field sm:col-span-1"
        />
        <button type="submit" className="btn-primary sm:col-span-2">
          <Plus className="h-4 w-4" /> {editing ? 'Update' : 'Tambah'}
        </button>
      </form>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Urutan</th>
                  <th className="px-5 py-3">Kategori</th>
                  <th className="px-5 py-3">Slug</th>
                  <th className="px-5 py-3">Produk Aktif</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono text-xs">{c.sortOrder}</td>
                    <td className="px-5 py-3 font-bold text-navy-900">{c.name}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{c.slug}</td>
                    <td className="px-5 py-3 text-xs">{c._count?.products || 0}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(c);
                            setForm({
                              name: c.name,
                              icon: c.icon || 'Tag',
                              description: c.description || '',
                              sortOrder: c.sortOrder,
                              isActive: c.isActive,
                            });
                          }}
                          className="rounded-lg border p-1.5 text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
                          className="rounded-lg border p-1.5 text-red-600 hover:bg-red-50"
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
        </div>
      )}
    </div>
  );
}
