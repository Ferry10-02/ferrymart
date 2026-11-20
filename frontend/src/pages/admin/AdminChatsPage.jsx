import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/common/UIStates';
import { formatDate } from '../../utils/format';

export default function AdminChatsPage() {
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/admin/chats')
      .then((res) => setConversations(res.data.data || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [toast]);

  const openConv = async (id) => {
    setActiveId(id);
    try {
      const res = await api.get(`/chat/conversations/${id}/messages`);
      setMessages(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) return <LoadingState message="Memuat daftar percakapan..." />;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">Moderasi Percakapan Chat</h2>
        <p className="text-sm text-slate-500">Audit percakapan antara pembeli dan seller untuk penyelesaian sengketa.</p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState icon={MessageSquare} title="Belum Ada Percakapan" description="Belum ada percakapan di marketplace." />
      ) : (
        <div className="card grid min-h-[480px] grid-cols-1 overflow-hidden md:grid-cols-12">
          <div className="divide-y divide-slate-100 border-r md:col-span-5">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConv(c.id)}
                className={`w-full p-4 text-left hover:bg-slate-50 ${
                  activeId === c.id ? 'bg-primary-50/70' : ''
                }`}
              >
                <p className="text-sm font-bold text-navy-900">
                  {c.members?.map((m) => m.user?.fullName).join(' ↔ ')}
                </p>
                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {c.lastMessagePreview || 'Belum ada pesan'}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {c._count?.messages || 0} pesan • {formatDate(c.lastMessageAt || c.createdAt)}
                </p>
              </button>
            ))}
          </div>
          <div className="flex flex-col bg-slate-50 p-4 md:col-span-7">
            {!activeId ? (
              <p className="m-auto text-sm text-slate-400">Pilih percakapan untuk meninjau riwayat pesan.</p>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[440px]">
                {messages.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                    <div className="flex justify-between font-bold text-navy-900">
                      <span>{m.sender?.fullName}</span>
                      <span className="font-normal text-slate-400">{formatDate(m.createdAt)}</span>
                    </div>
                    {m.imageUrl && (
                      <img src={m.imageUrl} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />
                    )}
                    {m.content && <p className="mt-1 text-slate-700">{m.content}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
