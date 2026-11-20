import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const WA_ADMIN_PHONE = import.meta.env.VITE_WHATSAPP_ADMIN_PHONE || '6285772416042';

export default function QrCodeModal({ open, onClose, title, subtitle, targetUrl }) {
  const canvasWrapRef = useRef(null);
  const toast = useToast();

  if (!open || !targetUrl) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      toast.success('URL QR berhasil disalin.');
    } catch {
      toast.error('Gagal menyalin URL.');
    }
  };

  const handleDownload = () => {
    const canvas = canvasWrapRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `FerryMarket-QR-${Date.now()}.png`;
    a.click();
    toast.success('QR Code berhasil diunduh.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-navy-900">{title || 'QR Code FerryMarket'}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          ref={canvasWrapRef}
          className="my-5 flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-6"
        >
          <QRCodeCanvas
            value={targetUrl}
            size={210}
            bgColor="#FFFFFF"
            fgColor="#0F172A"
            level="M"
            includeMargin
          />
          <p className="mt-3 break-all text-center text-[11px] text-slate-500">{targetUrl}</p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={handleCopy} className="btn-outline">
            <Copy className="h-4 w-4" /> Salin Link
          </button>
          <button type="button" onClick={handleDownload} className="btn-primary">
            <Download className="h-4 w-4" /> Unduh PNG
          </button>
        </div>
        <a
          href={`https://wa.me/${WA_ADMIN_PHONE}?text=${encodeURIComponent(
            `[FerryMarket] ${title || 'QR Code'}\nBuka link via IP Wi-Fi:\n${targetUrl}`
          )}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <MessageCircle className="h-4 w-4" /> Kirim Link QR ke WhatsApp
        </a>
        <a
          href={targetUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Buka Halaman Target
        </a>
      </div>
    </div>
  );
}
