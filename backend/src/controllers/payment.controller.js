const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { uploadFile } = require('../services/storage.service');
const { getManualPaymentMethods } = require('./checkout.controller');
const { notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');
const { formatIDR } = require('../utils/sanitize');

// GET /api/payments/methods
const listPaymentMethods = asyncHandler(async (req, res) => {
  const methods = await getManualPaymentMethods();
  res.json({
    success: true,
    data: {
      methods,
      disclaimer:
        'Pembayaran diproses secara manual melalui verifikasi bukti transfer oleh Admin FerryMarket (bukan payment gateway otomatis).',
    },
  });
});

// GET /api/payments/order/:orderId
const getPaymentByOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: {
      order: { select: { id: true, orderNumber: true, buyerId: true, grandTotal: true, status: true } },
      proofs: { orderBy: { createdAt: 'desc' } },
      verifier: { select: { id: true, fullName: true } },
    },
  });

  if (!payment) {
    throw new AppError('Data pembayaran tidak ditemukan.', 404, 'PAYMENT_NOT_FOUND');
  }

  const isOwner = payment.order.buyerId === req.user.id;
  const isAdmin = req.user.roles.includes('ADMIN');
  if (!isOwner && !isAdmin) {
    throw new AppError('Akses ditolak untuk melihat bukti pembayaran ini.', 403, 'PAYMENT_ACCESS_DENIED');
  }

  res.json({ success: true, data: payment });
});

// POST /api/payments/:orderId/proof (Buyer uploads manual transfer proof)
const uploadPaymentProof = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { senderName, senderBank, transferAmount, transferDate, notes } = req.body;

  if (!req.file) {
    throw new AppError('Gambar bukti pembayaran wajib diunggah.', 400, 'PROOF_IMAGE_REQUIRED');
  }

  const payment = await prisma.payment.findUnique({
    where: { orderId },
    include: {
      order: {
        include: {
          sellerOrders: {
            include: { seller: { select: { id: true, userId: true, storeName: true } } },
          },
        },
      },
    },
  });

  if (!payment || payment.order.buyerId !== req.user.id) {
    throw new AppError('Pembayaran tidak ditemukan atau bukan milik Anda.', 404, 'PAYMENT_NOT_FOUND');
  }

  if (!['PENDING', 'REJECTED', 'WAITING_VERIFICATION'].includes(payment.status)) {
    throw new AppError(
      `Bukti pembayaran tidak dapat diunggah pada status ${payment.status}.`,
      400,
      'INVALID_PAYMENT_STATUS'
    );
  }

  const uploaded = await uploadFile(req.file, 'payment-proofs', { isPrivateProof: true });

  const result = await prisma.$transaction(async (tx) => {
    const proof = await tx.paymentProof.create({
      data: {
        paymentId: payment.id,
        uploadedBy: req.user.id,
        fileUrl: uploaded.url,
        senderName: senderName.trim(),
        senderBank: senderBank.trim(),
        transferAmount: Number(transferAmount),
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        notes: notes || null,
      },
    });

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'WAITING_VERIFICATION',
        rejectionReason: null,
      },
      include: { proofs: { orderBy: { createdAt: 'desc' } } },
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: 'WAITING_VERIFICATION' },
    });

    await tx.sellerOrder.updateMany({
      where: { orderId },
      data: { status: 'WAITING_VERIFICATION' },
    });

    return { proof, payment: updatedPayment };
  });

  // Notify buyer & Admin
  notifyUser({
    userId: req.user.id,
    eventType: NOTIFICATION_EVENTS.PAYMENT_UPLOADED,
    title: `Bukti Pembayaran ${payment.order.orderNumber} Diterima`,
    body: `Bukti transfer sebesar ${formatIDR(transferAmount)} telah diunggah dan sedang menunggu verifikasi manual dari Admin FerryMarket.`,
    data: { orderId, orderNumber: payment.order.orderNumber, paymentId: payment.id },
    notifyAdminExternal: true,
  });

  // Also notify involved Seller(s) (In-App + Telegram/WhatsApp) that buyer uploaded payment proof
  for (const so of payment.order.sellerOrders || []) {
    if (so.seller?.userId && so.seller.userId !== req.user.id) {
      notifyUser({
        userId: so.seller.userId,
        eventType: NOTIFICATION_EVENTS.PAYMENT_UPLOADED,
        title: `Bukti Bayar Diunggah: ${so.subOrderNumber}`,
        body: `Pembeli ${req.user.fullName} telah mengunggah bukti transfer ${formatIDR(transferAmount)} (${senderBank}) untuk pesanan di toko ${so.seller.storeName}. Menunggu verifikasi Admin.`,
        data: { orderId, orderNumber: payment.order.orderNumber, sellerOrderId: so.id },
      });
    }
  }

  // Also notify all Admins in-app
  const admins = await prisma.userRole.findMany({ where: { role: 'ADMIN' }, select: { userId: true } });
  for (const adm of admins) {
    notifyUser({
      userId: adm.userId,
      eventType: NOTIFICATION_EVENTS.PAYMENT_UPLOADED,
      title: `Verifikasi Pembayaran Baru: ${payment.order.orderNumber}`,
      body: `Pembeli ${req.user.fullName} mengunggah bukti transfer ${formatIDR(transferAmount)} (${senderBank}).`,
      data: { orderId, paymentId: payment.id },
    });
  }

  res.status(201).json({
    success: true,
    message: 'Bukti pembayaran berhasil diunggah. Menunggu verifikasi Admin.',
    data: result,
  });
});

module.exports = {
  listPaymentMethods,
  getPaymentByOrder,
  uploadPaymentProof,
};
