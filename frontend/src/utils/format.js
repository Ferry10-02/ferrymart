export const formatIDR = (amount) => {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatDate = (dateStr, withTime = true) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(d);
};

export const getEffectivePrice = (product) => {
  if (!product) return 0;
  const now = new Date();
  if (
    product.isFlashSale &&
    product.flashSalePrice !== null &&
    product.flashSalePrice !== undefined &&
    (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt) > now)
  ) {
    return Number(product.flashSalePrice);
  }
  return Number(product.price || 0);
};

export const getDiscountPercent = (product) => {
  if (!product) return 0;
  const effective = getEffectivePrice(product);
  const original = Number(product.compareAtPrice || product.price || 0);
  if (original <= effective || original <= 0) return 0;
  return Math.round(((original - effective) / original) * 100);
};

export const STATUS_LABELS = {
  PENDING: { label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  PENDING_PAYMENT: { label: 'Menunggu Pembayaran', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  WAITING_VERIFICATION: { label: 'Menunggu Verifikasi', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  APPROVED: { label: 'Disetujui', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  PAID: { label: 'Sudah Dibayar', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CONFIRMED: { label: 'Dikonfirmasi Seller', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  PROCESSING: { label: 'Diproses', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  SHIPPED: { label: 'Dikirim', color: 'bg-sky-100 text-sky-800 border-sky-200' },
  DELIVERED: { label: 'Tiba di Tujuan', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  COMPLETED: { label: 'Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  REJECTED: { label: 'Ditolak', color: 'bg-red-100 text-red-800 border-red-200' },
  CANCELLED: { label: 'Dibatalkan', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  REFUNDED: { label: 'Refund', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  VERIFIED: { label: 'Terverifikasi', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  SUSPENDED: { label: 'Ditangguhkan', color: 'bg-red-100 text-red-800 border-red-200' },
  ACTIVE: { label: 'Aktif', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  INACTIVE: { label: 'Nonaktif', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  DRAFT: { label: 'Draft', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  MODERATED_REJECTED: { label: 'Ditolak Moderasi', color: 'bg-red-100 text-red-800 border-red-200' },
  SENT: { label: 'Terkirim', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  FAILED: { label: 'Gagal', color: 'bg-red-100 text-red-800 border-red-200' },
  NOT_CONFIGURED: { label: 'Belum Terhubung', color: 'bg-slate-100 text-slate-700 border-slate-200' },
};
