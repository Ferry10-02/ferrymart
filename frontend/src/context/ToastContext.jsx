import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message, type = 'info', duration = 4000) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => {
        // Prevent duplicate toast spam with the exact same message
        if (prev.some((t) => t.message === message && t.type === type)) {
          return prev;
        }
        return [...prev.slice(-2), { id, message, type }];
      });
      setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  // Memoize toast object so pages putting `toast` in useCallback/useEffect deps NEVER infinite-loop!
  const toast = useMemo(
    () => ({
      success: (msg) => addToast(msg, 'success'),
      error: (msg) => addToast(msg, 'error', 5500),
      info: (msg) => addToast(msg, 'info'),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex max-w-sm flex-col gap-2.5">
        {toasts.map((t) => {
          const styles =
            t.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : t.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-slate-200 bg-white text-slate-900';
          const Icon =
            t.type === 'success' ? CheckCircle2 : t.type === 'error' ? AlertCircle : Info;
          const iconColor =
            t.type === 'success'
              ? 'text-emerald-600'
              : t.type === 'error'
                ? 'text-red-600'
                : 'text-primary-500';

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 rounded-xl border p-3.5 shadow-lg ${styles}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
              <p className="flex-1 text-sm font-medium leading-snug">{t.message}</p>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
