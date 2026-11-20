import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('fm_access_token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get('/auth/me');
      setUser(res.data?.data?.user || null);
    } catch {
      localStorage.removeItem('fm_access_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: loggedUser } = res.data.data;
    localStorage.setItem('fm_access_token', accessToken);
    setUser(loggedUser);
    return loggedUser;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    const { accessToken, user: createdUser } = res.data.data;
    localStorage.setItem('fm_access_token', accessToken);
    setUser(createdUser);
    return { user: createdUser, message: res.data.message };
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network error on logout
    }
    localStorage.removeItem('fm_access_token');
    setUser(null);
  };

  const hasRole = (role) => Boolean(user?.roles?.includes(role));
  const hasPermission = (perm) =>
    Boolean(
      user?.roles?.includes('ADMIN') &&
        (user?.adminPermissions?.includes('SUPER_ADMIN') ||
          user?.adminPermissions?.includes(perm))
    );

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser: fetchMe,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
