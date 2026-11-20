import { useState, useEffect } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/common/UIStates';
import { formatDate } from '../../utils/format';

export default function NotificationsPage() {
  const toast = useToast();
  const { setUnreadNotifications } = useSocket() || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setItems(res.data.data.items || []);
      setUnreadNotifications?.(res.data.data.unreadCount || 0);
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

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifications?.(0);
      toast.success('Semua notifikasi ditandai sudah dibaca.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const markRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch {
      // ignore
    }
  };

  if (loading) return <LoadingState message="Memuat notifikasi..." />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy-900">Notifikasi</h1>
        {items.some((n) => !n.isRead) && (
          <button type="button" onClick={markAllRead} className="btn-outline px-3 py-1.5 text-xs">
            <CheckCheck className="h-4 w-4" /> Tandai Semua Dibaca
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Belum Ada Notifikasi"
          description="Pembaruan pesanan, verifikasi pembayaran, dan pesan chat akan tampil di sini."
        />
      ) : (
        <div className="card divide-y divide-slate-100">
          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markRead(n.id)}
              className={`cursor-pointer p-4 transition hover:bg-slate-50 ${
                !n.isRead ? 'bg-primary-50/40' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-navy-900">{n.title}</p>
                <span className="text-[11px] text-slate-400">{formatDate(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
