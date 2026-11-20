import { useState, useEffect, useCallback } from 'react';
import { Search, Ban, CheckCircle } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge, Pagination, ConfirmModal } from '../../components/common/UIStates';
import { formatDate } from '../../utils/format';

export default function AdminUsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [targetUser, setTargetUser] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', { params: { q: q || undefined, role, page, limit: 20 } });
      setUsers(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [q, role, page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleSuspend = async () => {
    if (!targetUser) return;
    try {
      const next = !targetUser.isSuspended;
      const res = await api.put(`/admin/users/${targetUser.id}/suspend`, {
        isSuspended: next,
        reason: next ? reason || 'Pelanggaran aturan FerryMarket' : null,
      });
      toast.success(res.data.message);
      setTargetUser(null);
      setReason('');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Manajemen Pengguna</h2>
        <p className="text-sm text-slate-500">Kelola akun pembeli, seller, dan status penangguhan (suspend).</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Cari nama, email, atau nomor HP..."
            className="input-field pl-9 py-2"
          />
        </div>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="input-field w-auto py-2 text-xs"
        >
          <option value="ALL">Semua Role</option>
          <option value="BUYER">BUYER</option>
          <option value="SELLER">SELLER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Pengguna</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Toko</th>
                  <th className="px-5 py-3">Order</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Terdaftar</th>
                  <th className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-navy-900">{u.fullName}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-slate-700">
                      {u.roles?.join(', ')}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {u.sellerProfile?.storeName || '-'}
                    </td>
                    <td className="px-5 py-3 text-xs">{u._count?.buyerOrders || 0}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.isSuspended ? 'SUSPENDED' : 'ACTIVE'} />
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">{formatDate(u.createdAt, false)}</td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setTargetUser(u)}
                        className={
                          u.isSuspended
                            ? 'btn-outline px-3 py-1.5 text-xs text-emerald-700'
                            : 'btn-danger px-3 py-1.5 text-xs'
                        }
                      >
                        {u.isSuspended ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5" /> Aktifkan
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5" /> Suspend
                          </>
                        )}
                      </button>
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

      <ConfirmModal
        open={Boolean(targetUser)}
        onClose={() => setTargetUser(null)}
        onConfirm={handleToggleSuspend}
        danger={!targetUser?.isSuspended}
        title={targetUser?.isSuspended ? 'Aktifkan Kembali Akun?' : 'Tangguhkan (Suspend) Akun?'}
        description={`Pengguna: ${targetUser?.fullName} (${targetUser?.email})`}
        confirmLabel={targetUser?.isSuspended ? 'Ya, Aktifkan' : 'Ya, Suspend'}
      />
    </div>
  );
}
