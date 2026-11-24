import { useState, useEffect, useCallback } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Save,
  QrCode,
  Wifi,
  RefreshCw,
  LogOut,
  Loader2,
  Smartphone,
} from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useToast } from '../../context/ToastContext';
import { LoadingState, StatusBadge, Pagination } from '../../components/common/UIStates';
import QrCodeModal from '../../components/qr/QrCodeModal';
import { formatDate } from '../../utils/format';

const EVENT_LABELS = {
  ORDER_CREATED: 'Pembeli membuat pesanan',
  PAYMENT_UPLOADED: 'Bukti pembayaran diunggah',
  PAYMENT_APPROVED: 'Admin menyetujui pembayaran',
  ORDER_PROCESSING: 'Pesanan diproses seller',
  ORDER_SHIPPED: 'Pesanan dikirim & resi terbit',
  ORDER_COMPLETED: 'Pesanan selesai',
  NEW_MESSAGE: 'Ada pesan chat baru',
  QR_SCANNED: 'QR Produk / Pesanan dipindai',
};

export default function AdminNotificationsPage() {
  const toast = useToast();
  const { socket } = useSocket() || {};

  const [status, setStatus] = useState(null);
  const [waWeb, setWaWeb] = useState(null);
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [connectingWa, setConnectingWa] = useState(false);

  const [config, setConfig] = useState({
    whatsapp_enabled: true,
    telegram_enabled: true,
    events: {},
  });

  const [testForm, setTestForm] = useState({
    channel: 'WHATSAPP',
    recipient: '6285772416042',
    message: '[FerryMarket] Pengujian notifikasi WhatsApp otomatis dari Dashboard Admin.',
  });
  const [testing, setTesting] = useState(false);
  const [waQrModal, setWaQrModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/notifications', { params: { page, limit: 20 } });
      const d = res.data.data;
      setStatus(d.status);
      setWaWeb(d.status?.whatsapp?.web || null);
      setLogs(d.logs || []);
      setPagination(d.pagination || { page: 1, totalPages: 1 });
      setConfig({
        whatsapp_enabled: d.status?.whatsapp?.enabled ?? true,
        telegram_enabled: d.status?.telegram?.enabled ?? true,
        events: d.status?.events || {},
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Listen for live WhatsApp-Web.js QR & status updates over Socket.io
  useEffect(() => {
    if (!socket) return;
    const onWaStatus = (next) => {
      setWaWeb(next);
      if (next?.isReady) {
        toast.success(`WhatsApp Web terhubung (+${next.connectedPhone || ''})!`);
      }
    };
    socket.on('wa:status', onWaStatus);
    return () => socket.off('wa:status', onWaStatus);
  }, [socket, toast]);

  // Poll WhatsApp Web status every 2.5s while initializing or waiting for QR scan
  const waStatus = waWeb?.status;
  useEffect(() => {
    if (!waStatus || !['INITIALIZING', 'QR_READY', 'AUTHENTICATED'].includes(waStatus)) return;
    const timer = setInterval(async () => {
      try {
        const res = await api.get('/admin/notifications/whatsapp/status');
        setWaWeb(res.data.data);
      } catch {
        // ignore transient poll error
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [waStatus]);

  const handleConnectWa = async () => {
    setConnectingWa(true);
    try {
      const res = await api.post('/admin/notifications/whatsapp/connect');
      setWaWeb(res.data.data);
      toast.info('Menyiapkan QR WhatsApp Web... Tunggu beberapa detik hingga QR tampil.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setConnectingWa(false);
    }
  };

  const handleDisconnectWa = async () => {
    if (!window.confirm('Putuskan koneksi WhatsApp Web saat ini?')) return;
    try {
      const res = await api.post('/admin/notifications/whatsapp/disconnect');
      setWaWeb(res.data.data);
      toast.info('Sesi WhatsApp Web diputuskan.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveSettings = async () => {
    try {
      await api.put('/admin/notifications/settings', config);
      toast.success('Pengaturan channel & event notifikasi disimpan.');
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleTestSend = async (e) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await api.post('/admin/notifications/test', testForm);
      if (res.data?.data?.status === 'SENT') {
        toast.success(res.data.message);
      } else {
        toast.info(res.data.message);
      }
      load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <LoadingState message="Memuat status WhatsApp & Telegram..." />;

  const isWaWebMode = status?.whatsapp?.provider === 'whatsapp-web';
  const waConnected = isWaWebMode ? Boolean(waWeb?.isReady) : Boolean(status?.whatsapp?.configured);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">
          Integrasi Notifikasi WhatsApp (`whatsapp-web.js`) & Telegram
        </h2>
        <p className="text-sm text-slate-500">
          Scan QR WhatsApp di bawah untuk menautkan WhatsApp pengirim. Seluruh notifikasi otomatis (termasuk saat QR Produk/Pesanan di-scan) akan langsung dikirim ke nomor <strong>{status?.whatsapp?.adminPhone || '6285772416042'}</strong> beserta link IP LAN.
        </p>
      </div>

      {/* Live WhatsApp-Web.js QR Connect Card */}
      <div className="card grid grid-cols-1 gap-6 p-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1 text-xs font-bold text-white">
              <Smartphone className="h-3.5 w-3.5 text-primary-400" /> Mode: {status?.whatsapp?.provider}
            </span>
            {waConnected ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Terhubung ({waWeb?.connectedName || 'WA'} +{waWeb?.connectedPhone || ''})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <AlertTriangle className="h-3.5 w-3.5" /> {waWeb?.status || 'Belum Terhubung'}
              </span>
            )}
          </div>

          <h3 className="text-lg font-extrabold text-navy-900">
            Tautkan WhatsApp Pengirim (Scan QR Seperti WhatsApp Web)
          </h3>

          <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-600">
            <li>Klik tombol <strong>Tampilkan QR WhatsApp</strong> di bawah jika QR belum muncul.</li>
            <li>Buka aplikasi <strong>WhatsApp di HP Anda</strong> → ketuk ikon titik 3 (atau Pengaturan) → pilih <strong>Perangkat Tertaut (Linked Devices)</strong> → <strong>Tautkan Perangkat</strong>.</li>
            <li>Arahkan kamera HP ke QR Code di sebelah kanan hingga status berubah menjadi <strong>Terhubung</strong>.</li>
            <li>Setelah terhubung, setiap kali QR produk/pesanan di-scan atau ada order baru, pesan WhatsApp langsung masuk otomatis ke <strong>{status?.whatsapp?.adminPhone || '6285772416042'}</strong>!</li>
          </ol>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-1.5 font-semibold text-navy-900">
              <Wifi className="h-4 w-4 text-primary-500" /> Link IP LAN yang dikirim dalam pesan WA:
            </p>
            <p className="mt-0.5 font-mono text-primary-600">
              {status?.appUrl || import.meta.env.VITE_APP_URL}
            </p>
          </div>

          {waWeb?.lastError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <strong>Info Error:</strong> {waWeb.lastError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            {!waConnected ? (
              <button
                type="button"
                onClick={handleConnectWa}
                disabled={connectingWa || waWeb?.status === 'INITIALIZING'}
                className="btn-primary text-xs"
              >
                <RefreshCw className={`h-4 w-4 ${connectingWa || waWeb?.status === 'INITIALIZING' ? 'animate-spin' : ''}`} />
                {waWeb?.status === 'INITIALIZING' ? 'Menyiapkan QR...' : 'Hubungkan / Tampilkan QR WhatsApp'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleDisconnectWa}
                className="btn-danger text-xs"
              >
                <LogOut className="h-4 w-4" /> Logout WhatsApp Web
              </button>
            )}

            <label className="ml-2 flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={config.whatsapp_enabled}
                onChange={(e) => setConfig({ ...config, whatsapp_enabled: e.target.checked })}
                className="accent-primary-500"
              />
              Aktifkan Channel WA
            </label>
          </div>
        </div>

        {/* Live QR Display Box */}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-center lg:col-span-5">
          {waConnected ? (
            <div className="space-y-2 py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <p className="text-base font-extrabold text-emerald-800">WhatsApp Web Siap Kirim!</p>
              <p className="text-xs text-slate-600">
                Terhubung sebagai <strong>{waWeb?.connectedName}</strong> (+{waWeb?.connectedPhone})
              </p>
              <p className="text-[11px] text-slate-400">
                Sesi disimpan lokal di backend agar tidak perlu scan ulang setiap kali restart.
              </p>
            </div>
          ) : waWeb?.qrDataUrl ? (
            <>
              <img
                src={waWeb.qrDataUrl}
                alt="QR Login WhatsApp Web"
                className="h-56 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
              />
              <p className="mt-3 text-xs font-bold text-navy-900">
                Scan QR ini dari WhatsApp → Perangkat Tertaut
              </p>
              <p className="text-[11px] text-slate-500">
                QR otomatis diperbarui bila kedaluwarsa.
              </p>
            </>
          ) : waWeb?.status === 'INITIALIZING' || waWeb?.status === 'AUTHENTICATED' ? (
            <div className="space-y-2 py-10">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary-500" />
              <p className="text-sm font-bold text-navy-900">
                {waWeb.status === 'AUTHENTICATED'
                  ? 'Berhasil Scan! Menyinkronkan WhatsApp...'
                  : 'Membuka Chrome Headless & Menyiapkan QR...'}
              </p>
              <p className="text-xs text-slate-500">Mohon tunggu ±10-20 detik...</p>
            </div>
          ) : (
            <div className="space-y-3 py-8">
              <QrCode className="mx-auto h-12 w-12 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">WhatsApp Web belum aktif</p>
              <button type="button" onClick={handleConnectWa} className="btn-navy text-xs">
                Generate QR WhatsApp Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Telegram Card */}
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-navy-900">Telegram Bot API</h3>
            {status?.telegram?.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> Terhubung
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-xs font-bold text-slate-600">
                Belum Terhubung (Opsional)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Atur <code>TELEGRAM_BOT_TOKEN</code> & <code>TELEGRAM_ADMIN_CHAT_ID</code> di <code>backend/.env</code> jika ingin notifikasi Telegram juga aktif.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={config.telegram_enabled}
            onChange={(e) => setConfig({ ...config, telegram_enabled: e.target.checked })}
            className="accent-primary-500"
          />
          Aktifkan Channel Telegram
        </label>
      </div>

      {/* Event Toggles & Test Sender */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-3 text-sm font-bold text-navy-900">Trigger Event Notifikasi</h3>
          <div className="space-y-2.5">
            {Object.entries(EVENT_LABELS).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{label}</span>
                <input
                  type="checkbox"
                  checked={config.events?.[key] !== false}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      events: { ...config.events, [key]: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-primary-500"
                />
              </label>
            ))}
          </div>
          <button type="button" onClick={saveSettings} className="btn-primary mt-5">
            <Save className="h-4 w-4" /> Simpan Pengaturan Event
          </button>
        </div>

        <form onSubmit={handleTestSend} className="card space-y-3 p-5">
          <h3 className="text-sm font-bold text-navy-900">Uji Kirim Notifikasi Langsung ke HP</h3>
          <select
            value={testForm.channel}
            onChange={(e) => setTestForm({ ...testForm, channel: e.target.value })}
            className="input-field"
          >
            <option value="WHATSAPP">WhatsApp (whatsapp-web.js)</option>
            <option value="TELEGRAM">Telegram</option>
          </select>
          <input
            required
            placeholder={
              testForm.channel === 'WHATSAPP'
                ? 'Nomor WhatsApp Tujuan (misal 6285772416042)'
                : 'Telegram Chat ID Tujuan (misal 123456789)'
            }
            value={testForm.recipient}
            onChange={(e) => setTestForm({ ...testForm, recipient: e.target.value })}
            className="input-field"
          />
          <textarea
            rows={3}
            required
            value={testForm.message}
            onChange={(e) => setTestForm({ ...testForm, message: e.target.value })}
            className="input-field"
          />
          <button type="submit" disabled={testing} className="btn-navy">
            <Send className="h-4 w-4" /> {testing ? 'Mengirim...' : 'Kirim Pesan Uji Sekarang'}
          </button>
        </form>
      </div>

      {/* Notification Logs Table */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-bold text-navy-900">Log Pengiriman Notifikasi</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Tujuan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Keterangan</th>
                <th className="px-4 py-3 text-right">QR / WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Belum ada log pengiriman notifikasi.
                  </td>
                </tr>
              ) : (
                logs.map((l) => {
                  const waUrl =
                    l.payload?.waDirectUrl ||
                    (l.channel === 'WHATSAPP'
                      ? `https://wa.me/${l.recipient}?text=${encodeURIComponent(l.payload?.message || '')}`
                      : null);
                  return (
                    <tr key={l.id}>
                      <td className="px-4 py-3 text-slate-500">{formatDate(l.createdAt)}</td>
                      <td className="px-4 py-3 font-bold text-navy-900">{l.channel}</td>
                      <td className="px-4 py-3 font-mono">{l.eventType}</td>
                      <td className="px-4 py-3 font-mono">{l.recipient}</td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3 text-slate-600">{l.errorMessage || 'OK'}</td>
                      <td className="px-4 py-3 text-right">
                        {waUrl && (
                          <button
                            type="button"
                            onClick={() =>
                              setWaQrModal({
                                title: `QR Notifikasi WA (${l.eventType})`,
                                subtitle: `Scan pakai HP untuk membuka WhatsApp ke ${l.recipient}.`,
                                targetUrl: waUrl,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100"
                          >
                            <QrCode className="h-3.5 w-3.5" /> QR WA
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination page={pagination.page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      </div>

      <QrCodeModal
        open={Boolean(waQrModal)}
        onClose={() => setWaQrModal(null)}
        title={waQrModal?.title}
        subtitle={waQrModal?.subtitle}
        targetUrl={waQrModal?.targetUrl}
      />
    </div>
  );
}
