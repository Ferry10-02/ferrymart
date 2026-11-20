import { useState, useEffect } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { QrCode, Download, Copy, ExternalLink } from 'lucide-react';
import api, { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { LoadingState, EmptyState } from '../../components/common/UIStates';
import { formatIDR } from '../../utils/format';

export default function SellerQrPage() {
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/sellers/products', { params: { limit: 100 } })
      .then((res) => setProducts(res.data.data.items || []))
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [toast]);

  const downloadQr = (productId, slug) => {
    const canvas = document.getElementById(`qr-canvas-${productId}`);
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `FerryMarket-QR-${slug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR Produk diunduh.');
  };

  const copyUrl = async (url) => {
    await navigator.clipboard.writeText(url);
    toast.success('Link produk berhasil disalin.');
  };

  if (loading) return <LoadingState message="Menyiapkan QR Code produk..." />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-navy-900">QR Code Generator Produk</h2>
        <p className="text-sm text-slate-500">
          Unduh atau cetak QR Code untuk ditempel pada kemasan/brosur. Pembeli yang scan menggunakan kamera HP akan langsung diarahkan ke halaman produk FerryMarket.
        </p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={QrCode}
          title="Belum Ada Produk"
          description="Tambahkan produk terlebih dahulu untuk menghasilkan QR Code produk."
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const baseUrl = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
            const url = `${baseUrl}/products/${p.slug}?src=qr`;
            return (
              <div key={p.id} className="card flex flex-col items-center p-5 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <QRCodeCanvas
                    id={`qr-canvas-${p.id}`}
                    value={url}
                    size={170}
                    fgColor="#0F172A"
                    level="M"
                    includeMargin
                  />
                </div>
                <h3 className="mt-3 line-clamp-1 text-sm font-bold text-navy-900">{p.name}</h3>
                <p className="text-xs font-bold text-primary-600">{formatIDR(p.price)}</p>
                <p className="mt-1 break-all text-[11px] text-slate-400">{url}</p>
                <div className="mt-4 flex w-full gap-2">
                  <button
                    type="button"
                    onClick={() => copyUrl(url)}
                    className="btn-outline flex-1 py-2 text-xs"
                  >
                    <Copy className="h-3.5 w-3.5" /> Salin
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadQr(p.id, p.slug)}
                    className="btn-primary flex-1 py-2 text-xs"
                  >
                    <Download className="h-3.5 w-3.5" /> Unduh PNG
                  </button>
                </div>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary-600"
                >
                  <ExternalLink className="h-3 w-3" /> Preview Halaman Produk
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
