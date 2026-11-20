import { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState, Pagination } from '../../components/common/UIStates';
import { formatDate } from '../../utils/format';

export default function AdminLogsPage() {
  const toast = useToast();
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/logs', { params: { page, limit: 30 } });
      setLogs(res.data.data.items || []);
      setPagination(res.data.data.pagination || { page: 1, totalPages: 1 });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState message="Memuat log aktivitas admin..." />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Log Aktivitas Admin</h2>
        <p className="text-sm text-slate-500">Audit trail setiap perubahan penting yang dilakukan oleh Administrator.</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Belum Ada Log Aktivitas" description="Aktivitas verifikasi, moderasi, dan pengaturan akan tercatat di sini." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Admin</th>
                  <th className="px-4 py-3">Aksi</th>
                  <th className="px-4 py-3">Entitas</th>
                  <th className="px-4 py-3">Detail</th>
                  <th className="px-4 py-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">{formatDate(l.createdAt)}</td>
                    <td className="px-4 py-3 font-semibold text-navy-900">{l.admin?.fullName}</td>
                    <td className="px-4 py-3 font-mono font-bold text-primary-600">{l.action}</td>
                    <td className="px-4 py-3 font-mono">{l.entityType}</td>
                    <td className="px-4 py-3 max-w-xs truncate font-mono text-slate-600">
                      {JSON.stringify(l.details)}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-400">{l.ipAddress || '-'}</td>
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
