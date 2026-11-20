import { useState, useEffect, useCallback } from 'react';
import { BadgeCheck, XCircle, Ban } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, StatusBadge, Pagination } from '../../components/common/UIStates';
import { formatDate } from '../../utils/format';

export default function AdminSellersPage({ defaultStatus = 'ALL', title = 'Manajemen Seller' }) {
  const toast = useToast();
  const [sellers, setSellers] = useState([]);
  const [status, setStatus] = useState(defaultStatus);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setStatus(defaultStatus);
    setPage(1);
  }, [defaultStatus]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/sellers', { params: { status, page, limit: 20 } });
      setSellers(res.data.data.items || []);
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

  const handleVerify = async (sellerId, verificationStatus) => {
    const note =
      verificationStatus === 'VERIFIED'
        ? 'Toko memenuhi syarat verifikasi FerryMarket'
        : window.prompt(`Masukkan catatan untuk status ${verificationStatus}:`) || '';

    try {
      const res = await api.put(`/admin/sellers/${sellerId}/verify`, {
        verificationStatus,
        verificationNote: note,
      });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">{title}</h2>
        <p className="text-sm text-slate-500">Verifikasi toko seller baru, kelola toko aktif, atau tangguhkan toko.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {['ALL', 'PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].map((st) => (
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
            {st === 'ALL' ? 'Semua' : st}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState />
      ) : sellers.length === 0 ? (
        <EmptyState title="Tidak Ada Seller" description="Tidak ada data seller pada filter status ini." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Nama Toko</th>
                  <th className="px-5 py-3">Pemilik</th>
                  <th className="px-5 py-3">Kota</th>
                  <th className="px-5 py-3">Produk / Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Daftar</th>
                  <th className="px-5 py-3 text-right">Verifikasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sellers.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-bold text-navy-900">{s.storeName}</p>
                      <p className="text-xs text-slate-400">/{s.storeSlug}</p>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <p className="font-semibold text-slate-800">{s.user?.fullName}</p>
                      <p className="text-slate-500">{s.user?.email}</p>
                    </td>
                    <td className="px-5 py-3 text-xs">{s.city || '-'}</td>
                    <td className="px-5 py-3 text-xs">
                      {s._count?.products || 0} produk • {s._count?.sellerOrders || 0} order
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={s.verificationStatus} />
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(s.createdAt, false)}</td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1.5">
                        {s.verificationStatus !== 'VERIFIED' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(s.id, 'VERIFIED')}
                            className="btn-primary px-2.5 py-1.5 text-xs"
                          >
                            <BadgeCheck className="h-3.5 w-3.5" /> Verifikasi
                          </button>
                        )}
                        {s.verificationStatus === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(s.id, 'REJECTED')}
                            className="btn-outline px-2.5 py-1.5 text-xs text-red-600"
                          >
                            <XCircle className="h-3.5 w-3.5" /> Tolak
                          </button>
                        )}
                        {s.verificationStatus !== 'SUSPENDED' && (
                          <button
                            type="button"
                            onClick={() => handleVerify(s.id, 'SUSPENDED')}
                            className="btn-danger px-2.5 py-1.5 text-xs"
                          >
                            <Ban className="h-3.5 w-3.5" /> Suspend
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
