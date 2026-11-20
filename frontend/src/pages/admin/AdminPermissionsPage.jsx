import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState } from '../../components/common/UIStates';

export default function AdminPermissionsPage() {
  const toast = useToast();
  const [available, setAvailable] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/permissions');
      setAvailable(res.data.data.availablePermissions || []);
      setAdmins(res.data.data.admins || []);
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

  const togglePerm = (adminId, perm) => {
    setAdmins((prev) =>
      prev.map((a) => {
        if (a.id !== adminId) return a;
        const has = a.permissions.includes(perm);
        return {
          ...a,
          permissions: has ? a.permissions.filter((p) => p !== perm) : [...a.permissions, perm],
        };
      })
    );
  };

  const saveAdminPerms = async (admin) => {
    try {
      await api.put(`/admin/permissions/${admin.id}`, { permissions: admin.permissions });
      toast.success(`Hak akses untuk ${admin.fullName} disimpan.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memuat matriks hak akses admin..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Hak Akses & Permission Admin</h2>
        <p className="text-sm text-slate-500">Atur permission granular berdasarkan peran administrator.</p>
      </div>

      <div className="space-y-4">
        {admins.map((admin) => (
          <div key={admin.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <p className="text-base font-bold text-navy-900">{admin.fullName}</p>
                <p className="text-xs text-slate-500">{admin.email}</p>
              </div>
              <button
                type="button"
                onClick={() => saveAdminPerms(admin)}
                className="btn-primary px-3.5 py-2 text-xs"
              >
                <Save className="h-4 w-4" /> Simpan Hak Akses
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {available.map((perm) => (
                <label
                  key={perm}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={admin.permissions.includes(perm)}
                    onChange={() => togglePerm(admin.id, perm)}
                    className="accent-primary-500"
                  />
                  <span className="truncate">{perm}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
