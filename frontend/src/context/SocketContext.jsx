import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import api from '../services/api';

const SocketContext = createContext(null);

const EMPTY_SUMMARY = {
  total: 0,
  belumBayar: 0,
  dikemas: 0,
  dikirim: 0,
  beriPenilaian: 0,
  selesai: 0,
  dibatalkan: 0,
  wishlistCount: 0,
  unreadNotifications: 0,
};

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [orderSummary, setOrderSummary] = useState(EMPTY_SUMMARY);

  const refreshOrderSummary = useCallback(async () => {
    const token = localStorage.getItem('fm_access_token');
    if (!isAuthenticated || !token) {
      setOrderSummary(EMPTY_SUMMARY);
      setUnreadNotifications(0);
      return null;
    }
    try {
      const res = await api.get('/orders/summary');
      const data = res.data?.data || EMPTY_SUMMARY;
      setOrderSummary(data);
      if (typeof data.unreadNotifications === 'number') {
        setUnreadNotifications(data.unreadNotifications);
      }
      return data;
    } catch {
      return null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOrderSummary(EMPTY_SUMMARY);
      setUnreadNotifications(0);
      return;
    }
    refreshOrderSummary();

    // Keep badges fresh when user returns to browser tab
    const onFocus = () => refreshOrderSummary();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [isAuthenticated, refreshOrderSummary]);

  useEffect(() => {
    const token = localStorage.getItem('fm_access_token');
    if (!isAuthenticated || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const explicitSocketUrl = import.meta.env.VITE_SOCKET_URL;
    const isLocalOrLan = /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(
      window.location.hostname
    );
    // On serverless hosts (e.g. Vercel without dedicated socket server), skip WebSocket & use REST Live Sync cleanly
    if (!explicitSocketUrl && !isLocalOrLan) {
      return;
    }

    const socketUrl = explicitSocketUrl || window.location.origin;
    const s = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    s.on('notification:new', (notif) => {
      setUnreadNotifications((c) => c + 1);
      if (notif?.title) {
        toast.info(notif.title);
      }
      // Automatically sync Shopee-style order counters (Belum Bayar / Dikemas / Dikirim / Beri Penilaian)
      refreshOrderSummary();
      window.dispatchEvent(new CustomEvent('fm:order-updated', { detail: notif }));
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        unreadNotifications,
        setUnreadNotifications,
        orderSummary,
        refreshOrderSummary,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
