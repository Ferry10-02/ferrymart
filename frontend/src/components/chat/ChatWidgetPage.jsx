import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Send, Image as ImageIcon, MessageSquare, CheckCheck, Check, Store } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../common/UIStates';
import { formatDate } from '../../utils/format';

export default function ChatWorkspace({ title = 'Pesan Realtime' }) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const initialConvId = searchParams.get('conversationId');

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(initialConvId || null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);
  const [isSocketOnline, setIsSocketOnline] = useState(Boolean(socket?.connected));

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (initialConvId) setActiveConvId(initialConvId);
  }, [initialConvId]);

  useEffect(() => {
    if (!socket) {
      setIsSocketOnline(false);
      return;
    }
    setIsSocketOnline(Boolean(socket.connected));
    const onConnect = () => {
      setIsSocketOnline(true);
      if (activeConvId) {
        socket.emit('chat:join', { conversationId: activeConvId });
      }
    };
    const onDisconnect = () => setIsSocketOnline(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [socket, activeConvId]);

  // Automatic REST polling fallback when WebSocket is unavailable (e.g. Vercel Serverless deploy)
  useEffect(() => {
    if (isSocketOnline || !activeConvId) return;
    const poll = setInterval(async () => {
      try {
        const [msgRes, convRes] = await Promise.all([
          api.get(`/chat/conversations/${activeConvId}/messages`),
          api.get('/chat/conversations'),
        ]);
        setMessages(msgRes.data.data || []);
        setConversations(convRes.data.data || []);
      } catch {
        // ignore transient poll error
      }
    }, 3500);
    return () => clearInterval(poll);
  }, [isSocketOnline, activeConvId]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get('/chat/conversations');
      const list = res.data.data || [];
      setConversations(list);
      if (!activeConvId && list.length > 0) {
        setActiveConvId(initialConvId || list[0].id);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingList(false);
    }
  }, [activeConvId, initialConvId, toast]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!activeConvId) return;
    let mounted = true;
    setLoadingMsgs(true);

    api
      .get(`/chat/conversations/${activeConvId}/messages`)
      .then((res) => {
        if (mounted) setMessages(res.data.data || []);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => {
        if (mounted) setLoadingMsgs(false);
      });

    if (socket) {
      socket.emit('chat:join', { conversationId: activeConvId });
      socket.emit('chat:mark_read', { conversationId: activeConvId });
    }

    return () => {
      mounted = false;
      if (socket) {
        socket.emit('chat:leave', { conversationId: activeConvId });
      }
    };
  }, [activeConvId, socket, toast]);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg) => {
      if (msg.conversationId === activeConvId) {
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        if (msg.senderId !== user?.id) {
          socket.emit('chat:mark_read', { conversationId: activeConvId });
        }
      }
      loadConversations();
    };

    const onRead = ({ conversationId }) => {
      if (conversationId === activeConvId) {
        setMessages((prev) =>
          prev.map((m) => (m.senderId === user?.id ? { ...m, status: 'READ' } : m))
        );
      }
    };

    const onTyping = ({ conversationId, fullName, isTyping }) => {
      if (conversationId === activeConvId) {
        setTypingUser(isTyping ? fullName : null);
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:read', onRead);
    socket.on('chat:typing', onTyping);
    socket.on('chat:conversation_updated', loadConversations);

    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:read', onRead);
      socket.off('chat:typing', onTyping);
      socket.off('chat:conversation_updated', loadConversations);
    };
  }, [socket, activeConvId, user?.id, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendText = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeConvId || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);

    try {
      if (socket?.connected) {
        socket.emit('chat:send', { conversationId: activeConvId, content }, (ack) => {
          if (!ack?.ok) {
            toast.error(ack?.message || 'Gagal mengirim pesan');
          } else if (ack?.data) {
            setMessages((prev) =>
              prev.some((m) => m.id === ack.data.id) ? prev : [...prev, ack.data]
            );
            loadConversations();
          }
          setSending(false);
        });
      } else {
        const res = await api.post(`/chat/conversations/${activeConvId}/messages`, { content });
        setMessages((prev) =>
          prev.some((m) => m.id === res.data.data.id) ? prev : [...prev, res.data.data]
        );
        loadConversations();
        setSending(false);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
      setSending(false);
    }
  };

  const handleSendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      if (text.trim()) fd.append('content', text.trim());
      const res = await api.post(`/chat/conversations/${activeConvId}/messages`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages((prev) =>
        prev.some((m) => m.id === res.data.data.id) ? prev : [...prev, res.data.data]
      );
      setText('');
      loadConversations();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSending(false);
      e.target.value = '';
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  if (loadingList) return <LoadingState message="Memuat percakapan..." />;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-navy-900 px-5 py-3.5 text-white">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <MessageSquare className="h-5 w-5 text-primary-400" /> {title}
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            isSocketOnline
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-amber-500/20 text-amber-300'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              isSocketOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          {isSocketOnline ? 'Realtime Aktif' : 'Live Sync Aktif'}
        </span>
      </div>

      <div className="grid min-h-[540px] grid-cols-1 md:grid-cols-12">
        {/* Conversation list */}
        <div className="border-b border-slate-200 md:col-span-4 md:border-b-0 md:border-r">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              Belum ada percakapan. Mulai chat dari halaman produk atau toko.
            </div>
          ) : (
            <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">
              {conversations.map((conv) => {
                const otherName =
                  conv.otherUser?.sellerProfile?.storeName || conv.otherUser?.fullName || 'Pengguna';
                const isActive = conv.id === activeConvId;
                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setActiveConvId(conv.id)}
                    className={`flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-slate-50 ${
                      isActive ? 'bg-primary-50/70' : ''
                    }`}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-bold text-white">
                      {conv.otherUser?.sellerProfile ? (
                        <Store className="h-5 w-5 text-primary-400" />
                      ) : (
                        otherName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-navy-900">{otherName}</p>
                        {conv.unreadCount > 0 && (
                          <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {conv.lastMessagePreview || 'Mulai percakapan...'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Active chat panel */}
        <div className="flex flex-col md:col-span-8">
          {!activeConv ? (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                icon={MessageSquare}
                title="Pilih Percakapan"
                description="Pilih daftar chat di sebelah kiri untuk membaca dan membalas pesan secara realtime."
              />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-navy-900">
                    {activeConv.otherUser?.sellerProfile?.storeName || activeConv.otherUser?.fullName}
                  </p>
                  {activeConv.product && (
                    <p className="text-xs text-slate-500">
                      Terkait produk: <span className="font-medium">{activeConv.product.name}</span>
                    </p>
                  )}
                </div>
                {typingUser && (
                  <span className="text-xs italic text-primary-600">{typingUser} sedang mengetik...</span>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAFC] p-4 max-h-[420px]">
                {loadingMsgs ? (
                  <LoadingState message="Memuat pesan..." />
                ) : messages.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-400">
                    Belum ada pesan. Kirim pesan pertama Anda!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-xs ${
                            isMine
                              ? 'rounded-br-sm bg-primary-500 text-white'
                              : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          {msg.imageUrl && (
                            <a href={msg.imageUrl} target="_blank" rel="noreferrer">
                              <img
                                src={msg.imageUrl}
                                alt="Lampiran chat"
                                className="mb-2 max-h-52 rounded-lg object-cover"
                              />
                            </a>
                          )}
                          {msg.content && (
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                          )}
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                              isMine ? 'text-orange-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatDate(msg.createdAt)}</span>
                            {isMine &&
                              (msg.status === 'READ' ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form
                onSubmit={handleSendText}
                className="flex items-center gap-2 border-t border-slate-200 bg-white p-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSendImage}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                  title="Kirim Gambar"
                  className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
                >
                  <ImageIcon className="h-5 w-5" />
                </button>
                <input
                  type="text"
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    socket?.emit('chat:typing', {
                      conversationId: activeConvId,
                      isTyping: e.target.value.length > 0,
                    });
                  }}
                  placeholder="Tulis pesan..."
                  className="input-field flex-1"
                />
                <button type="submit" disabled={sending || !text.trim()} className="btn-primary">
                  <Send className="h-4 w-4" /> Kirim
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
