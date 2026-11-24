const crypto = require('crypto');
const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { notifyUser } = require('../services/notification.service');
const { formatIDR } = require('../utils/sanitize');

const PAYOUTS_SETTING_KEY = 'seller_payout_requests';
const REFUNDS_SETTING_KEY = 'order_refund_requests';

const readJsonListSetting = async (key) => {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return Array.isArray(row?.value) ? row.value : [];
};

const writeJsonListSetting = async (key, list, updatedBy = null, description = '') => {
  await prisma.platformSetting.upsert({
    where: { key },
    update: { value: list, updatedBy },
    create: {
      key,
      value: list,
      category: 'OPERATIONS',
      description,
      isPublic: false,
      updatedBy,
    },
  });
};

const logAdminAction = async (req, action, entityType, entityId, details = {}) => {
  try {
    await prisma.adminActivityLog.create({
      data: {
        adminId: req.user.id,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null,
      },
    });
  } catch {
    // non-fatal
  }
};

// ============================================================================
// 1. ADMIN VOUCHER / COUPON CRUD
// ============================================================================

const listAdminCoupons = asyncHandler(async (req, res) => {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: coupons });
});

const createAdminCoupon = asyncHandler(async (req, res) => {
  const {
    code,
    discountType = 'PERCENTAGE',
    discountValue,
    minPurchase = 0,
    maxDiscount,
    usageLimit,
    startsAt,
    expiresAt,
    isActive = true,
  } = req.body;

  const cleanCode = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!cleanCode || cleanCode.length < 3) {
    throw new AppError('Kode voucher minimal 3 karakter tanpa spasi.', 400, 'INVALID_COUPON_CODE');
  }

  const parsedValue = Number(discountValue);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    throw new AppError('Nilai diskon harus lebih dari 0.', 400, 'INVALID_DISCOUNT_VALUE');
  }
  if (discountType === 'PERCENTAGE' && parsedValue > 100) {
    throw new AppError('Diskon persentase maksimal 100%.', 400, 'INVALID_PERCENTAGE');
  }

  const existing = await prisma.coupon.findUnique({ where: { code: cleanCode } });
  if (existing) {
    throw new AppError(`Kode voucher "${cleanCode}" sudah digunakan.`, 409, 'COUPON_EXISTS');
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: cleanCode,
      discountType: discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
      discountValue: parsedValue,
      minPurchase: Math.max(0, Number(minPurchase || 0)),
      maxDiscount: maxDiscount !== undefined && maxDiscount !== '' && maxDiscount !== null ? Number(maxDiscount) : null,
      usageLimit: usageLimit !== undefined && usageLimit !== '' && usageLimit !== null ? parseInt(usageLimit, 10) : null,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: Boolean(isActive),
    },
  });

  await logAdminAction(req, 'CREATE_COUPON', 'COUPON', coupon.id, { code: coupon.code });

  res.status(201).json({
    success: true,
    message: `Voucher ${coupon.code} berhasil dibuat dan langsung bisa diklaim pembeli!`,
    data: coupon,
  });
});

const updateAdminCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Voucher tidak ditemukan.', 404, 'COUPON_NOT_FOUND');
  }

  const {
    code,
    discountType,
    discountValue,
    minPurchase,
    maxDiscount,
    usageLimit,
    startsAt,
    expiresAt,
    isActive,
  } = req.body;

  const data = {};
  if (code !== undefined) data.code = String(code).trim().toUpperCase().replace(/\s+/g, '');
  if (discountType !== undefined) data.discountType = discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
  if (discountValue !== undefined) data.discountValue = Number(discountValue);
  if (minPurchase !== undefined) data.minPurchase = Math.max(0, Number(minPurchase || 0));
  if (maxDiscount !== undefined) {
    data.maxDiscount = maxDiscount === '' || maxDiscount === null ? null : Number(maxDiscount);
  }
  if (usageLimit !== undefined) {
    data.usageLimit = usageLimit === '' || usageLimit === null ? null : parseInt(usageLimit, 10);
  }
  if (startsAt) data.startsAt = new Date(startsAt);
  if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  const updated = await prisma.coupon.update({ where: { id }, data });
  await logAdminAction(req, 'UPDATE_COUPON', 'COUPON', id, { code: updated.code, isActive: updated.isActive });

  res.json({
    success: true,
    message: `Voucher ${updated.code} berhasil diperbarui.`,
    data: updated,
  });
});

const deleteAdminCoupon = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.coupon.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Voucher tidak ditemukan.', 404, 'COUPON_NOT_FOUND');
  }

  await prisma.coupon.delete({ where: { id } });
  await logAdminAction(req, 'DELETE_COUPON', 'COUPON', id, { code: existing.code });

  res.json({ success: true, message: `Voucher ${existing.code} berhasil dihapus.` });
});

// ============================================================================
// 2. SELLER PAYOUT / WITHDRAWAL REQUESTS & ADMIN APPROVAL
// ============================================================================

const computeSellerBalance = async (sellerId) => {
  const [completedAgg, allRequests] = await Promise.all([
    prisma.sellerOrder.aggregate({
      where: { sellerId, status: 'COMPLETED' },
      _sum: { sellerPayout: true },
    }),
    readJsonListSetting(PAYOUTS_SETTING_KEY),
  ]);

  const sellerRequests = allRequests
    .filter((r) => r.sellerId === sellerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const completedNetBalance = Number(completedAgg._sum.sellerPayout || 0);
  const withdrawnTotal = sellerRequests
    .filter((r) => r.status === 'APPROVED')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const lockedPendingAmount = sellerRequests
    .filter((r) => r.status === 'PENDING')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  const availableBalance = Math.max(0, completedNetBalance - withdrawnTotal - lockedPendingAmount);

  return {
    completedNetBalance,
    withdrawnTotal,
    lockedPendingAmount,
    availableBalance,
    requests: sellerRequests,
    allRequests,
  };
};

// GET /api/sellers/payouts
const getSellerPayouts = asyncHandler(async (req, res) => {
  const seller = req.user.sellerProfile;
  const balance = await computeSellerBalance(seller.id);

  res.json({
    success: true,
    data: {
      completedNetBalance: balance.completedNetBalance,
      withdrawnTotal: balance.withdrawnTotal,
      lockedPendingAmount: balance.lockedPendingAmount,
      availableBalance: balance.availableBalance,
      bankInfo: {
        bankName: seller.bankName || '',
        bankAccountNumber: seller.bankAccountNumber || '',
        bankAccountHolder: seller.bankAccountHolder || '',
      },
      requests: balance.requests,
    },
  });
});

// POST /api/sellers/payouts
const requestSellerPayout = asyncHandler(async (req, res) => {
  const seller = req.user.sellerProfile;
  const { amount, bankName, bankAccountNumber, bankAccountHolder, note } = req.body;

  const parsedAmount = Math.round(Number(amount || 0));
  if (!Number.isFinite(parsedAmount) || parsedAmount < 10000) {
    throw new AppError('Minimal penarikan saldo adalah Rp 10.000.', 400, 'MIN_PAYOUT_AMOUNT');
  }

  const resolvedBank = (bankName || seller.bankName || '').trim();
  const resolvedAcc = (bankAccountNumber || seller.bankAccountNumber || '').trim();
  const resolvedHolder = (bankAccountHolder || seller.bankAccountHolder || '').trim();

  if (!resolvedBank || !resolvedAcc || !resolvedHolder) {
    throw new AppError(
      'Lengkapi nama bank, nomor rekening, dan nama pemilik rekening terlebih dahulu.',
      400,
      'BANK_INFO_REQUIRED'
    );
  }

  const balance = await computeSellerBalance(seller.id);
  if (parsedAmount > balance.availableBalance) {
    throw new AppError(
      `Saldo tersedia tidak mencukupi. Maksimal yang dapat ditarik saat ini adalah ${formatIDR(balance.availableBalance)}.`,
      400,
      'INSUFFICIENT_PAYOUT_BALANCE'
    );
  }

  const newRequest = {
    id: crypto.randomUUID(),
    sellerId: seller.id,
    sellerUserId: req.user.id,
    storeName: seller.storeName,
    amount: parsedAmount,
    bankName: resolvedBank,
    bankAccountNumber: resolvedAcc,
    bankAccountHolder: resolvedHolder,
    note: note?.trim() || null,
    status: 'PENDING',
    transferRef: null,
    adminNote: null,
    createdAt: new Date().toISOString(),
    processedAt: null,
  };

  const nextList = [newRequest, ...balance.allRequests];
  await writeJsonListSetting(
    PAYOUTS_SETTING_KEY,
    nextList,
    req.user.id,
    'Daftar pengajuan tarik saldo / pencairan dana Seller FerryMarket'
  );

  // Notify all Admins
  const admins = await prisma.userRole.findMany({ where: { role: 'ADMIN' }, select: { userId: true } });
  for (const adm of admins) {
    notifyUser({
      userId: adm.userId,
      eventType: 'PAYOUT_REQUESTED',
      title: `Pengajuan Tarik Saldo Seller: ${seller.storeName}`,
      body: `Toko ${seller.storeName} mengajukan pencairan dana ${formatIDR(parsedAmount)} ke ${resolvedBank} ${resolvedAcc} a.n. ${resolvedHolder}.`,
      data: { payoutId: newRequest.id, sellerId: seller.id },
    });
  }

  res.status(201).json({
    success: true,
    message: `Pengajuan penarikan ${formatIDR(parsedAmount)} berhasil dikirim! Menunggu persetujuan & transfer Admin.`,
    data: newRequest,
  });
});

// GET /api/admin/payouts
const listAdminPayouts = asyncHandler(async (req, res) => {
  const { status = 'ALL' } = req.query;
  const all = await readJsonListSetting(PAYOUTS_SETTING_KEY);
  const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = status === 'ALL' ? sorted : sorted.filter((r) => r.status === status);

  const summary = {
    total: sorted.length,
    pending: sorted.filter((r) => r.status === 'PENDING').length,
    approved: sorted.filter((r) => r.status === 'APPROVED').length,
    rejected: sorted.filter((r) => r.status === 'REJECTED').length,
    pendingAmount: sorted
      .filter((r) => r.status === 'PENDING')
      .reduce((s, r) => s + Number(r.amount || 0), 0),
    approvedAmount: sorted
      .filter((r) => r.status === 'APPROVED')
      .reduce((s, r) => s + Number(r.amount || 0), 0),
  };

  res.json({ success: true, data: { items: filtered, summary } });
});

// PUT /api/admin/payouts/:id/process
const processAdminPayout = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, transferRef, adminNote } = req.body;
  if (!['APPROVE', 'REJECT'].includes(action)) {
    throw new AppError('Aksi harus APPROVE atau REJECT.', 400, 'INVALID_ACTION');
  }

  const all = await readJsonListSetting(PAYOUTS_SETTING_KEY);
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new AppError('Pengajuan penarikan saldo tidak ditemukan.', 404, 'PAYOUT_NOT_FOUND');
  }

  const target = all[idx];
  if (target.status !== 'PENDING') {
    throw new AppError('Pengajuan penarikan saldo ini sudah diproses sebelumnya.', 400, 'ALREADY_PROCESSED');
  }

  const updated = {
    ...target,
    status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    transferRef: transferRef?.trim() || null,
    adminNote: adminNote?.trim() || null,
    processedAt: new Date().toISOString(),
    processedBy: req.user.fullName,
  };

  const nextList = [...all];
  nextList[idx] = updated;

  await writeJsonListSetting(PAYOUTS_SETTING_KEY, nextList, req.user.id);
  await logAdminAction(req, `PAYOUT_${action}`, 'PAYOUT', id, {
    storeName: updated.storeName,
    amount: updated.amount,
    transferRef: updated.transferRef,
  });

  if (updated.sellerUserId) {
    notifyUser({
      userId: updated.sellerUserId,
      eventType: action === 'APPROVE' ? 'PAYOUT_APPROVED' : 'PAYOUT_REJECTED',
      title:
        action === 'APPROVE'
          ? `Pencairan Dana ${formatIDR(updated.amount)} Berhasil!`
          : `Pengajuan Pencairan ${formatIDR(updated.amount)} Ditolak`,
      body:
        action === 'APPROVE'
          ? `Dana sebesar ${formatIDR(updated.amount)} telah ditransfer ke ${updated.bankName} ${updated.bankAccountNumber} a.n. ${updated.bankAccountHolder}.${updated.transferRef ? ` Ref: ${updated.transferRef}` : ''}`
          : `Pengajuan penarikan saldo Anda ditolak Admin.${updated.adminNote ? ` Alasan: ${updated.adminNote}` : ''} Saldo telah dikembalikan ke saldo tersedia.`,
      data: { payoutId: updated.id },
    });
  }

  res.json({
    success: true,
    message:
      action === 'APPROVE'
        ? `Pencairan ${formatIDR(updated.amount)} ke ${updated.storeName} ditandai SELESAI ditransfer!`
        : `Pengajuan pencairan ${updated.storeName} ditolak dan saldo dikembalikan.`,
    data: updated,
  });
});

// ============================================================================
// 3. BUYER REFUND / COMPLAINT REQUESTS & ADMIN APPROVAL
// ============================================================================

const getOrderRefundRequests = async (orderId) => {
  const all = await readJsonListSetting(REFUNDS_SETTING_KEY);
  return all.filter((r) => r.orderId === orderId);
};

// POST /api/orders/seller-orders/:sellerOrderId/refund-request
const createRefundRequest = asyncHandler(async (req, res) => {
  const { sellerOrderId } = req.params;
  const { reason, description, refundAccount } = req.body;

  if (!reason || String(reason).trim().length < 3) {
    throw new AppError('Pilih atau tulis alasan komplain/pengembalian terlebih dahulu.', 400, 'REASON_REQUIRED');
  }

  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: { id: sellerOrderId },
    include: {
      order: { include: { buyer: { select: { id: true, fullName: true, phone: true } } } },
      seller: { select: { id: true, userId: true, storeName: true } },
      items: true,
    },
  });

  if (!sellerOrder) {
    throw new AppError('Sub-pesanan tidak ditemukan.', 404, 'SELLER_ORDER_NOT_FOUND');
  }

  if (sellerOrder.order.buyerId !== req.user.id) {
    throw new AppError(
      'Pengajuan komplain/refund hanya dapat dilakukan oleh akun Pembeli pemilik pesanan ini.',
      403,
      'BUYER_ONLY_ACTION'
    );
  }

  if (!['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(sellerOrder.status)) {
    throw new AppError(
      'Pengajuan komplain/refund hanya tersedia untuk pesanan yang sudah dibayar.',
      400,
      'INVALID_REFUND_STATE'
    );
  }

  const all = await readJsonListSetting(REFUNDS_SETTING_KEY);
  const existingOpen = all.find(
    (r) => r.sellerOrderId === sellerOrderId && ['PENDING', 'APPROVED'].includes(r.status)
  );
  if (existingOpen) {
    throw new AppError(
      existingOpen.status === 'APPROVED'
        ? 'Pesanan ini sudah disetujui untuk refund.'
        : 'Anda sudah mengajukan komplain/refund untuk pesanan ini dan sedang ditinjau Admin.',
      409,
      'REFUND_ALREADY_REQUESTED'
    );
  }

  const refundAmount = Number(sellerOrder.subtotal) + Number(sellerOrder.shippingCost);
  const newRefund = {
    id: crypto.randomUUID(),
    orderId: sellerOrder.orderId,
    orderNumber: sellerOrder.order.orderNumber,
    sellerOrderId: sellerOrder.id,
    subOrderNumber: sellerOrder.subOrderNumber,
    buyerId: req.user.id,
    buyerName: sellerOrder.order.buyer?.fullName || req.user.fullName,
    buyerPhone: sellerOrder.order.buyer?.phone || '-',
    sellerId: sellerOrder.sellerId,
    sellerUserId: sellerOrder.seller.userId,
    storeName: sellerOrder.seller.storeName,
    amount: refundAmount,
    itemsSummary: sellerOrder.items.map((i) => `${i.productNameSnapshot} (x${i.quantity})`).join(', '),
    reason: String(reason).trim(),
    description: description?.trim() || '',
    refundAccount: refundAccount?.trim() || '',
    status: 'PENDING',
    adminNote: null,
    createdAt: new Date().toISOString(),
    processedAt: null,
  };

  await writeJsonListSetting(
    REFUNDS_SETTING_KEY,
    [newRefund, ...all],
    req.user.id,
    'Daftar komplain & pengajuan pengembalian/refund pembeli FerryMarket'
  );

  // Notify Seller
  if (sellerOrder.seller?.userId) {
    notifyUser({
      userId: sellerOrder.seller.userId,
      eventType: 'REFUND_REQUESTED',
      title: `Komplain / Refund Masuk: ${sellerOrder.subOrderNumber}`,
      body: `Pembeli ${newRefund.buyerName} mengajukan komplain/refund (${newRefund.reason}) untuk pesanan di toko ${sellerOrder.seller.storeName}. Tim Admin akan meninjau pengajuan ini.`,
      data: { orderId: sellerOrder.orderId, sellerOrderId, refundId: newRefund.id },
    });
  }

  // Notify Admins
  const admins = await prisma.userRole.findMany({ where: { role: 'ADMIN' }, select: { userId: true } });
  for (const adm of admins) {
    notifyUser({
      userId: adm.userId,
      eventType: 'REFUND_REQUESTED',
      title: `Pengajuan Refund Baru: ${sellerOrder.subOrderNumber}`,
      body: `Pembeli ${newRefund.buyerName} mengajukan refund ${formatIDR(refundAmount)} (${newRefund.reason}).`,
      data: { orderId: sellerOrder.orderId, refundId: newRefund.id },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Pengajuan komplain/refund berhasil dikirim! Tim Admin akan segera meninjau.',
    data: newRefund,
  });
});

// GET /api/admin/refunds
const listAdminRefunds = asyncHandler(async (req, res) => {
  const { status = 'ALL' } = req.query;
  const all = await readJsonListSetting(REFUNDS_SETTING_KEY);
  const sorted = [...all].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const filtered = status === 'ALL' ? sorted : sorted.filter((r) => r.status === status);

  const summary = {
    total: sorted.length,
    pending: sorted.filter((r) => r.status === 'PENDING').length,
    approved: sorted.filter((r) => r.status === 'APPROVED').length,
    rejected: sorted.filter((r) => r.status === 'REJECTED').length,
  };

  res.json({ success: true, data: { items: filtered, summary } });
});

// PUT /api/admin/refunds/:id/process
const processAdminRefund = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, adminNote, restoreStock = true } = req.body;
  if (!['APPROVE', 'REJECT'].includes(action)) {
    throw new AppError('Aksi harus APPROVE atau REJECT.', 400, 'INVALID_ACTION');
  }

  const all = await readJsonListSetting(REFUNDS_SETTING_KEY);
  const idx = all.findIndex((r) => r.id === id);
  if (idx === -1) {
    throw new AppError('Data pengajuan refund tidak ditemukan.', 404, 'REFUND_NOT_FOUND');
  }

  const target = all[idx];
  if (target.status !== 'PENDING') {
    throw new AppError('Pengajuan refund ini sudah diproses sebelumnya.', 400, 'ALREADY_PROCESSED');
  }

  if (action === 'APPROVE') {
    const sellerOrder = await prisma.sellerOrder.findUnique({
      where: { id: target.sellerOrderId },
      include: { items: true },
    });

    if (sellerOrder) {
      await prisma.$transaction(async (tx) => {
        await tx.sellerOrder.update({
          where: { id: sellerOrder.id },
          data: { status: 'REFUNDED' },
        });

        if (restoreStock) {
          for (const item of sellerOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
            if (item.variantId) {
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
        }

        const remainingNonRefunded = await tx.sellerOrder.count({
          where: { orderId: sellerOrder.orderId, status: { not: 'REFUNDED' } },
        });
        if (remainingNonRefunded === 0) {
          await tx.order.update({
            where: { id: sellerOrder.orderId },
            data: { status: 'REFUNDED' },
          });
        }
      });
    }
  }

  const updated = {
    ...target,
    status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
    adminNote: adminNote?.trim() || null,
    processedAt: new Date().toISOString(),
    processedBy: req.user.fullName,
  };

  const nextList = [...all];
  nextList[idx] = updated;
  await writeJsonListSetting(REFUNDS_SETTING_KEY, nextList, req.user.id);

  await logAdminAction(req, `REFUND_${action}`, 'REFUND', id, {
    subOrderNumber: updated.subOrderNumber,
    amount: updated.amount,
    adminNote: updated.adminNote,
  });

  // Notify Buyer
  notifyUser({
    userId: updated.buyerId,
    eventType: action === 'APPROVE' ? 'REFUND_APPROVED' : 'REFUND_REJECTED',
    title:
      action === 'APPROVE'
        ? `Refund ${updated.subOrderNumber} Disetujui`
        : `Pengajuan Refund ${updated.subOrderNumber} Ditolak`,
    body:
      action === 'APPROVE'
        ? `Pengajuan pengembalian dana ${formatIDR(updated.amount)} telah disetujui Admin.${updated.adminNote ? ` Catatan: ${updated.adminNote}` : ''}`
        : `Pengajuan komplain/refund Anda ditolak Admin.${updated.adminNote ? ` Alasan: ${updated.adminNote}` : ''}`,
    data: { orderId: updated.orderId, refundId: updated.id },
  });

  // Notify Seller
  if (updated.sellerUserId) {
    notifyUser({
      userId: updated.sellerUserId,
      eventType: action === 'APPROVE' ? 'REFUND_APPROVED' : 'REFUND_REJECTED',
      title:
        action === 'APPROVE'
          ? `Status Refund ${updated.subOrderNumber}: Disetujui Admin`
          : `Komplain ${updated.subOrderNumber} Ditolak Admin`,
      body:
        action === 'APPROVE'
          ? `Admin menyetujui refund pembeli pada sub-pesanan ${updated.subOrderNumber} (${formatIDR(updated.amount)}).`
          : `Admin menolak pengajuan komplain pembeli pada sub-pesanan ${updated.subOrderNumber}.`,
      data: { orderId: updated.orderId, sellerOrderId: updated.sellerOrderId, refundId: updated.id },
    });
  }

  res.json({
    success: true,
    message:
      action === 'APPROVE'
        ? `Refund ${updated.subOrderNumber} disetujui & status pesanan diubah menjadi REFUNDED.`
        : `Pengajuan refund ${updated.subOrderNumber} ditolak.`,
    data: updated,
  });
});

module.exports = {
  computeSellerBalance,
  listAdminCoupons,
  createAdminCoupon,
  updateAdminCoupon,
  deleteAdminCoupon,
  getSellerPayouts,
  requestSellerPayout,
  listAdminPayouts,
  processAdminPayout,
  getOrderRefundRequests,
  createRefundRequest,
  listAdminRefunds,
  processAdminRefund,
};
