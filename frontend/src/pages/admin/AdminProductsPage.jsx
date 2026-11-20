import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Star } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge, Pagination } from '../../components/common/UIStates';
import { formatIDR } from '../../utils/format';

export default function AdminProductsPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/products', { params: { status, page, limit: 20 } });
      setProducts(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [status, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const moderate = async (id, payload) => {
    try {
      const res = await api.put(`/admin/products/${id}/moderate`, payload);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Moderasi Produk Marketplace</h2>
        <p className="text-sm text-slate-500">Tinjau produk seller, tandai produk unggulan, atau tolak produk yang melanggar.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'ACTIVE', 'DRAFT', 'INACTIVE', 'MODERATED_REJECTED'].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => {
              setStatus(st);
              setPage(1);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              status === st
                ? 'bg-primary-500 text-white'
                : 'border border-slate-200 bg-white text-slate-600'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : products.length === 0 ? (
        <EmptyState title="Belum Ada Produk" description="Tidak ada produk pada filter ini." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Produk</th>
                  <th className="px-5 py-3">Seller</th>
                  <th className="px-5 py-3">Harga</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Moderasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-navy-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.category?.name} • Stok {p.stock}
                        {p.isFeatured ? ' • ⭐ Unggulan' : ''}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium">{p.seller?.storeName}</td>
                    <td className="px-5 py-3 font-bold text-primary-600">{formatIDR(p.price)}</td>
                    <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => moderate(p.id, { isFeatured: !p.isFeatured })}
                          className="btn-outline px-2.5 py-1 text-xs"
                        >
                          <Star className={`h-3.5 w-3.5 ${p.isFeatured ? 'fill-amber-400 text-amber-400' : ''}`} />
                          {p.isFeatured ? 'Unfeature' : 'Unggulan'}
                        </button>
                        {p.status !== 'ACTIVE' && (
                          <button
                            type="button"
                            onClick={() => moderate(p.id, { status: 'ACTIVE', moderationNote: null })}
                            className="btn-primary px-2.5 py-1 text-xs"
                          >
                            <CheckCircle className="h-3.5 w-3.5" /> Aktifkan
                          </button>
                        )}
                        {p.status !== 'MODERATED_REJECTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              const note = window.prompt('Alasan penolakan moderasi:') || 'Melanggar kebijakan produk';
                              moderate(p.id, { status: 'MODERATED_REJECTED', moderationNote: note });
                            }}
                            className="btn-danger px-2.5 py-1 text-xs"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Tolak
                          </button>
                        )}
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
    </div>
  );
}
