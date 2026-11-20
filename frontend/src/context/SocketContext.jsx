import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const toast = useToast();
  const [socket, setSocket] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket, unreadNotifications, setUnreadNotifications }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
