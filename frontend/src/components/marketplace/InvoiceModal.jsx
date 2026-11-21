import { X, Printer, CheckCircle2, Store, MapPin, CreditCard } from 'lucide-react';
import { formatIDR, formatDate } from '../../utils/format';

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export default function InvoiceModal({ open, onClose, order }) {
  if (!open || !order) return null;

  const addr = order.shippingAddressSnapshot || {};
  const payment = order.payment || null;

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=860,height=920');
    if (!win) {
      window.print();
      return;
    }

    const sellerBlocks = (order.sellerOrders || [])
      .map((so) => {
        const rows = (so.items || [])
          .map(
            (item) => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;">
              <strong>${escapeHtml(item.productNameSnapshot)}</strong>
              ${item.variantNameSnapshot ? `<div style="font-size:11px;color:#64748b;">${escapeHtml(item.variantNameSnapshot)}</div>` : ''}
            </td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${escapeHtml(formatIDR(item.unitPrice))}</td>
            <td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">${escapeHtml(formatIDR(item.totalPrice))}</td>
          </tr>`
          )
          .join('');

        return `
          <div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
            <div style="background:#0f172a;color:#fff;padding:8px 12px;font-size:12px;display:flex;justify-content:space-between;">
              <strong>Toko: ${escapeHtml(so.seller?.storeName || '-')} (${escapeHtml(so.subOrderNumber)})</strong>
              <span>Kurir: ${escapeHtml(so.shipment?.courierName || so.shippingMethod?.name || '-')}${so.shipment?.trackingNumber ? ` • Resi: ${escapeHtml(so.shipment.trackingNumber)}` : ''}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#f8fafc;color:#475569;text-align:left;">
                  <th style="padding:8px;border-bottom:1px solid #e2e8f0;">Produk</th>
                  <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:center;width:60px;">Qty</th>
                  <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;width:120px;">Harga</th>
                  <th style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;width:130px;">Subtotal</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        `;
      })
      .join('');

    win.document.write(`
      <!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8" />
          <title>Invoice ${escapeHtml(order.orderNumber)} - FerryMarket</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 28px; }
            @media print { body { margin: 12px; } .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #f97316;padding-bottom:14px;">
            <div>
              <h1 style="margin:0;color:#f97316;font-size:24px;">FerryMarket</h1>
              <p style="margin:4px 0 0;font-size:12px;color:#64748b;">Invoice Resmi Transaksi Marketplace</p>
            </div>
            <div style="text-align:right;font-size:12px;">
              <div style="font-weight:700;font-size:15px;">${escapeHtml(order.orderNumber)}</div>
              <div style="color:#64748b;margin-top:2px;">Tanggal: ${escapeHtml(formatDate(order.createdAt))}</div>
              <div style="margin-top:4px;font-weight:700;color:#059669;">Status: ${escapeHtml(order.status)}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;font-size:12px;">
            <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;">Penerima & Alamat Pengiriman</div>
              <div style="font-weight:700;margin-top:4px;">${escapeHtml(addr.recipientName || order.buyer?.fullName || '-')} (${escapeHtml(addr.phone || '-')})</div>
              <div style="color:#475569;margin-top:2px;">${escapeHtml(addr.addressLine || '-')}, ${escapeHtml(addr.city || '')}, ${escapeHtml(addr.province || '')} ${escapeHtml(addr.postalCode || '')}</div>
            </div>
            <div style="background:#f8fafc;padding:12px;border-radius:8px;border:1px solid #e2e8f0;">
              <div style="font-weight:700;color:#64748b;text-transform:uppercase;font-size:10px;">Informasi Pembayaran</div>
              <div style="font-weight:700;margin-top:4px;">${escapeHtml(payment?.paymentMethodName || 'Transfer Manual')}</div>
              <div style="color:#475569;margin-top:2px;">${escapeHtml(payment?.paymentDestination || '-')}</div>
              <div style="color:#475569;margin-top:2px;">Status Bayar: <strong>${escapeHtml(payment?.status || '-')}</strong></div>
            </div>
          </div>

          ${sellerBlocks}

          <div style="margin-top:20px;margin-left:auto;max-width:320px;font-size:13px;">
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Subtotal Produk</span><span>${escapeHtml(formatIDR(order.subtotal))}</span></div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Ongkos Kirim</span><span>${escapeHtml(formatIDR(order.shippingTotal))}</span></div>
            <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Biaya Layanan</span><span>${escapeHtml(formatIDR(order.serviceFee))}</span></div>
            ${Number(order.discountTotal) > 0 ? `<div style="display:flex;justify-content:space-between;padding:4px 0;color:#059669;"><span>Diskon Voucher</span><span>-${escapeHtml(formatIDR(order.discountTotal))}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;padding:10px 0 4px;margin-top:6px;border-top:2px solid #0f172a;font-size:16px;font-weight:800;color:#ea580c;">
              <span>TOTAL BAYAR</span><span>${escapeHtml(formatIDR(order.grandTotal))}</span>
            </div>
          </div>

          <p style="margin-top:28px;font-size:11px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:10px;">
            Invoice ini diterbitkan secara elektronik oleh FerryMarket dan sah sebagai bukti transaksi.
          </p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-navy-900 px-6 py-4 text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-400">
              Invoice Resmi FerryMarket
            </p>
            <h3 className="font-mono text-lg font-extrabold">{order.orderNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-primary-600"
            >
              <Printer className="h-4 w-4" /> Cetak / Simpan PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto p-6 text-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <p className="mb-1 flex items-center gap-1 font-bold uppercase text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-primary-500" /> Alamat Penerima
              </p>
              <p className="font-bold text-navy-900">
                {addr.recipientName || order.buyer?.fullName} ({addr.phone})
              </p>
              <p className="mt-0.5 text-slate-600">
                {addr.addressLine}, {addr.city}, {addr.province} {addr.postalCode}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <p className="mb-1 flex items-center gap-1 font-bold uppercase text-slate-500">
                <CreditCard className="h-3.5 w-3.5 text-primary-500" /> Pembayaran & Tanggal
              </p>
              <p className="font-bold text-navy-900">{payment?.paymentMethodName || 'Transfer Manual'}</p>
              <p className="mt-0.5 text-slate-600">{formatDate(order.createdAt)}</p>
              <p className="mt-1 inline-flex items-center gap-1 font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Status: {order.status}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {(order.sellerOrders || []).map((so) => (
              <div key={so.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-4 py-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-navy-900">
                    <Store className="h-3.5 w-3.5 text-primary-600" /> {so.seller?.storeName}
                  </span>
                  <span className="font-mono text-slate-500">{so.subOrderNumber}</span>
                </div>
                <div className="divide-y divide-slate-100 px-4">
                  {(so.items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between py-2.5 text-xs">
                      <div>
                        <p className="font-semibold text-navy-900">{item.productNameSnapshot}</p>
                        <p className="text-slate-500">
                          {item.variantNameSnapshot ? `${item.variantNameSnapshot} • ` : ''}
                          {item.quantity} × {formatIDR(item.unitPrice)}
                        </p>
                      </div>
                      <span className="font-bold text-navy-900">{formatIDR(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="ml-auto max-w-xs space-y-1.5 border-t border-slate-200 pt-3 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal Produk</span>
              <span>{formatIDR(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Ongkos Kirim</span>
              <span>{formatIDR(order.shippingTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Biaya Layanan</span>
              <span>{formatIDR(order.serviceFee)}</span>
            </div>
            {Number(order.discountTotal) > 0 && (
              <div className="flex justify-between font-semibold text-emerald-600">
                <span>Diskon Voucher</span>
                <span>-{formatIDR(order.discountTotal)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-extrabold text-primary-600">
              <span>Total Pembayaran</span>
              <span>{formatIDR(order.grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
