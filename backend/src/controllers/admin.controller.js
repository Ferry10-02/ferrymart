const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { logAdminActivity } = require('../utils/auditLog');
const {
  getIntegrationStatus,
  notifyUser,
  sendWhatsAppMessage,
  sendTelegramMessage,
} = require('../services/notification.service');
const whatsappWeb = require('../services/whatsappWeb.service');
const { uploadFile } = require('../services/storage.service');
const { ADMIN_PERMISSIONS, NOTIFICATION_EVENTS } = require('../utils/constants');
const { formatIDR } = require('../utils/sanitize');
const { invalidateUserCache } = require('../middleware/auth.middleware');
const { invalidateCachePrefix } = require('../utils/cache');

// GET /api/admin/dashboard
const getAdminDashboard = asyncHandler(async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalBuyers,
    totalSellers,
    pendingSellers,
    totalProducts,
    activeProducts,
    totalOrders,
    pendingPayments,
    gmvAgg,
    recentOrders,
    recentPayments,
    chartOrders,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.userRole.count({ where: { role: 'BUYER' } }),
    prisma.sellerProfile.count(),
    prisma.sellerProfile.count({ where: { verificationStatus: 'PENDING' } }),
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.order.count(),
    prisma.payment.count({ where: { status: 'WAITING_VERIFICATION' } }),
    prisma.order.aggregate({
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
      _sum: { grandTotal: true, serviceFee: true },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        buyer: { select: { fullName: true, email: true } },
        payment: { select: { status: true, paymentMethodName: true } },
      },
    }),
    prisma.payment.findMany({
      where: { status: 'WAITING_VERIFICATION' },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        order: { select: { orderNumber: true, buyer: { select: { fullName: true } } } },
        proofs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    }),
    prisma.order.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      select: { createdAt: true, grandTotal: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const dailyMap = new Map();
  for (let i = 13; i >= 0; i--) {
    const key = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, revenue: 0, orders: 0 });
  }
  for (const ord of chartOrders) {
    const key = new Date(ord.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key);
      entry.revenue += Number(ord.grandTotal);
      entry.orders += 1;
    }
  }

  res.json({
    success: true,
    data: {
      stats: {
        totalUsers,
        totalBuyers,
        totalSellers,
        pendingSellers,
        totalProducts,
        activeProducts,
        totalOrders,
        pendingPayments,
        totalGMV: Number(gmvAgg._sum.grandTotal || 0),
        totalServiceFee: Number(gmvAgg._sum.serviceFee || 0),
      },
      salesChart: Array.from(dailyMap.values()),
      recentOrders,
      pendingPaymentVerifications: recentPayments,
    },
  });
});

// ==================== USERS ====================
const listUsers = asyncHandler(async (req, res) => {
  const { q, role, status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (role && role !== 'ALL') {
    where.roles = { some: { role } };
  }
  if (status === 'SUSPENDED') where.isSuspended = true;
  if (status === 'ACTIVE') where.isSuspended = false;

  const [items, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        isSuspended: true,
        suspendedReason: true,
        createdAt: true,
        roles: { select: { role: true } },
        sellerProfile: { select: { id: true, storeName: true, verificationStatus: true } },
        _count: { select: { buyerOrders: true } },
      },
    }),
    prisma.profile.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items: items.map((u) => ({ ...u, roles: u.roles.map((r) => r.role) })),
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

const toggleSuspendUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isSuspended, reason } = req.body;

  if (id === req.user.id) {
    throw new AppError('Anda tidak dapat menangguhkan akun Anda sendiri.', 400, 'SELF_SUSPEND_FORBIDDEN');
  }

  const updated = await prisma.profile.update({
    where: { id },
    data: {
      isSuspended: Boolean(isSuspended),
      suspendedReason: isSuspended ? reason || 'Pelanggaran kebijakan FerryMarket' : null,
    },
    select: { id: true, email: true, fullName: true, isSuspended: true, suspendedReason: true },
  });

  invalidateUserCache(id);
  await logAdminActivity(req, isSuspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER', 'USER', id, {
    reason: updated.suspendedReason,
  });

  res.json({
    success: true,
    message: isSuspended ? 'Akun pengguna berhasil ditangguhkan.' : 'Penangguhan akun dicabut.',
    data: updated,
  });
});

// ==================== SELLERS & VERIFICATION ====================
const listSellers = asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (q) {
    where.OR = [
      { storeName: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { user: { email: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (status && status !== 'ALL') {
    where.verificationStatus = status;
  }

  const [items, total] = await Promise.all([
    prisma.sellerProfile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, isSuspended: true } },
        _count: { select: { products: true, sellerOrders: true } },
      },
    }),
    prisma.sellerProfile.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

const verifySeller = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { verificationStatus, verificationNote } = req.body;

  if (!['VERIFIED', 'REJECTED', 'SUSPENDED', 'PENDING'].includes(verificationStatus)) {
    throw new AppError('Status verifikasi seller tidak valid.', 400, 'INVALID_STATUS');
  }

  const updated = await prisma.sellerProfile.update({
    where: { id },
    data: {
      verificationStatus,
      verificationNote: verificationNote || null,
      verifiedAt: verificationStatus === 'VERIFIED' ? new Date() : null,
      verifiedBy: req.user.id,
    },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });

  invalidateUserCache(updated.userId);
  await logAdminActivity(req, 'VERIFY_SELLER', 'SELLER', id, {
    storeName: updated.storeName,
    verificationStatus,
    verificationNote,
  });

  notifyUser({
    userId: updated.userId,
    eventType: 'SELLER_VERIFICATION',
    title: `Status Toko ${updated.storeName}: ${verificationStatus}`,
    body:
      verificationStatus === 'VERIFIED'
        ? 'Selamat! Toko Anda telah diverifikasi oleh Admin FerryMarket.'
        : `Status verifikasi toko Anda diubah menjadi ${verificationStatus}. ${verificationNote || ''}`,
    data: { sellerId: id, verificationStatus },
  });

  res.json({
    success: true,
    message: `Status seller berhasil diubah menjadi ${verificationStatus}.`,
    data: updated,
  });
});

// ==================== PRODUCTS MODERATION ====================
const listAdminProducts = asyncHandler(async (req, res) => {
  const { q, status, categoryId, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (status && status !== 'ALL') where.status = status;
  if (categoryId) where.categoryId = categoryId;

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
        category: { select: { id: true, name: true } },
        seller: { select: { id: true, storeName: true, storeSlug: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

const moderateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, moderationNote, isFeatured, isFlashSale, flashSalePrice } = req.body;

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(moderationNote !== undefined ? { moderationNote } : {}),
      ...(isFeatured !== undefined ? { isFeatured: Boolean(isFeatured) } : {}),
      ...(isFlashSale !== undefined ? { isFlashSale: Boolean(isFlashSale) } : {}),
      ...(flashSalePrice !== undefined
        ? { flashSalePrice: flashSalePrice ? Number(flashSalePrice) : null }
        : {}),
    },
  });

  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'MODERATE_PRODUCT', 'PRODUCT', id, {
    status: updated.status,
    moderationNote,
    isFeatured: updated.isFeatured,
  });

  res.json({ success: true, message: 'Moderasi produk berhasil disimpan.', data: updated });
});

// ==================== ORDERS & PAYMENTS VERIFICATION ====================
const listAdminOrders = asyncHandler(async (req, res) => {
  const { q, status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: 'insensitive' } },
      { buyer: { fullName: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (status && status !== 'ALL') where.status = status;

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        buyer: { select: { id: true, fullName: true, email: true, phone: true } },
        payment: { include: { proofs: { orderBy: { createdAt: 'desc' } } } },
        sellerOrders: {
          include: {
            seller: { select: { id: true, storeName: true } },
            items: true,
          },
        },
      },
    }),
    prisma.order.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

const listAdminPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = {};
  if (status && status !== 'ALL') where.status = status;

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        order: {
          include: {
            buyer: { select: { id: true, fullName: true, email: true, phone: true } },
            sellerOrders: {
              include: { seller: { select: { id: true, userId: true, storeName: true } } },
            },
          },
        },
        proofs: { orderBy: { createdAt: 'desc' } },
        verifier: { select: { id: true, fullName: true } },
      },
    }),
    prisma.payment.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

// PUT /api/admin/payments/:id/verify (APPROVED / REJECTED / REFUNDED)
const verifyPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, rejectionReason, adminNotes } = req.body;

  if (!['APPROVED', 'REJECTED', 'REFUNDED'].includes(status)) {
    throw new AppError('Status verifikasi pembayaran harus APPROVED, REJECTED, atau REFUNDED.', 400, 'INVALID_STATUS');
  }

  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          items: true,
          sellerOrders: {
            include: { seller: { select: { id: true, userId: true, storeName: true } } },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new AppError('Data pembayaran tidak ditemukan.', 404, 'PAYMENT_NOT_FOUND');
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const pay = await tx.payment.update({
      where: { id },
      data: {
        status,
        verifiedBy: req.user.id,
        verifiedAt: now,
        rejectionReason: status === 'REJECTED' ? rejectionReason || 'Bukti pembayaran tidak valid' : null,
        adminNotes: adminNotes || null,
      },
    });

    if (status === 'APPROVED') {
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PAID' } });
      await tx.sellerOrder.updateMany({ where: { orderId: payment.orderId }, data: { status: 'PAID' } });
    } else if (status === 'REJECTED') {
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'PENDING_PAYMENT' } });
      await tx.sellerOrder.updateMany({ where: { orderId: payment.orderId }, data: { status: 'PENDING_PAYMENT' } });
    } else if (status === 'REFUNDED') {
      await tx.order.update({ where: { id: payment.orderId }, data: { status: 'REFUNDED' } });
      await tx.sellerOrder.updateMany({ where: { orderId: payment.orderId }, data: { status: 'REFUNDED' } });

      // Restore stock on refund
      for (const item of payment.order.items) {
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

    return pay;
  });

  await logAdminActivity(req, `PAYMENT_${status}`, 'PAYMENT', id, {
    orderNumber: payment.order.orderNumber,
    amount: Number(payment.amount),
    rejectionReason,
  });

  if (status === 'APPROVED') {
    notifyUser({
      userId: payment.order.buyerId,
      eventType: NOTIFICATION_EVENTS.PAYMENT_APPROVED,
      title: `Pembayaran ${payment.order.orderNumber} Disetujui`,
      body: `Pembayaran sebesar ${formatIDR(payment.amount)} telah diverifikasi Admin. Seller akan segera memproses pesanan Anda.`,
      data: { orderId: payment.orderId, orderNumber: payment.order.orderNumber },
    });

    for (const so of payment.order.sellerOrders) {
      notifyUser({
        userId: so.seller.userId,
        eventType: NOTIFICATION_EVENTS.PAYMENT_APPROVED,
        title: `Pembayaran Terverifikasi: ${so.subOrderNumber}`,
        body: `Pembayaran pesanan di toko ${so.seller.storeName} telah disetujui Admin. Silakan segera konfirmasi dan proses pengiriman.`,
        data: { sellerOrderId: so.id, subOrderNumber: so.subOrderNumber },
      });
    }
  } else if (status === 'REJECTED') {
    notifyUser({
      userId: payment.order.buyerId,
      eventType: NOTIFICATION_EVENTS.PAYMENT_REJECTED,
      title: `Bukti Pembayaran ${payment.order.orderNumber} Ditolak`,
      body: `Alasan: ${rejectionReason || 'Bukti pembayaran tidak sesuai'}. Silakan unggah ulang bukti pembayaran yang valid.`,
      data: { orderId: payment.orderId },
    });
  }

  res.json({
    success: true,
    message: `Pembayaran berhasil diverifikasi dengan status ${status}.`,
    data: updated,
  });
});

// ==================== NOTIFICATIONS (WHATSAPP & TELEGRAM) ====================
const getNotificationIntegrations = asyncHandler(async (req, res) => {
  const { page = 1, limit = 25, channel } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));

  const where = {};
  if (channel && channel !== 'ALL') where.channel = channel;

  const [status, logs, total] = await Promise.all([
    getIntegrationStatus(),
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { user: { select: { fullName: true, email: true } } },
    }),
    prisma.notificationLog.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      status,
      logs,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

const updateNotificationSettings = asyncHandler(async (req, res) => {
  const { whatsapp_enabled, telegram_enabled, events } = req.body;
  const updated = await prisma.platformSetting.upsert({
    where: { key: 'notification_channels' },
    update: {
      value: {
        whatsapp_enabled: Boolean(whatsapp_enabled),
        telegram_enabled: Boolean(telegram_enabled),
        events: events || {},
      },
      updatedBy: req.user.id,
    },
    create: {
      key: 'notification_channels',
      category: 'NOTIFICATIONS',
      isPublic: false,
      value: {
        whatsapp_enabled: Boolean(whatsapp_enabled),
        telegram_enabled: Boolean(telegram_enabled),
        events: events || {},
      },
      updatedBy: req.user.id,
    },
  });

  invalidateCachePrefix('settings:');
  await logAdminActivity(req, 'UPDATE_NOTIFICATION_SETTINGS', 'SETTING', 'notification_channels', updated.value);
  res.json({ success: true, message: 'Pengaturan notifikasi diperbarui.', data: updated.value });
});

const testExternalNotification = asyncHandler(async (req, res) => {
  const { channel, recipient, message } = req.body;
  let log = null;

  if (channel === 'WHATSAPP') {
    log = await sendWhatsAppMessage({
      userId: req.user.id,
      phone: recipient,
      eventType: 'ADMIN_TEST',
      message: message || '[FerryMarket] Pesan uji notifikasi WhatsApp dari Dashboard Admin.',
    });
  } else if (channel === 'TELEGRAM') {
    log = await sendTelegramMessage({
      userId: req.user.id,
      chatId: recipient,
      eventType: 'ADMIN_TEST',
      message: message || '<b>[FerryMarket]</b> Pesan uji notifikasi Telegram dari Dashboard Admin.',
    });
  } else {
    throw new AppError('Channel uji harus WHATSAPP atau TELEGRAM.', 400, 'INVALID_CHANNEL');
  }

  res.json({
    success: true,
    message:
      log?.status === 'SENT'
        ? `Pesan uji ${channel} berhasil dikirim.`
        : log?.status === 'NOT_CONFIGURED'
          ? `${channel} API belum dikonfigurasi di .env backend (tercatat di log sebagai NOT_CONFIGURED).`
          : `Pengiriman uji ${channel} gagal: ${log?.errorMessage || 'Error'}`,
    data: log,
  });
});

const connectWhatsAppWeb = asyncHandler(async (req, res) => {
  const status = await whatsappWeb.initializeWhatsAppWeb();
  res.json({
    success: true,
    message: 'WhatsApp Web sedang diinisialisasi. Tunggu QR Code muncul untuk dipindai.',
    data: status,
  });
});

const disconnectWhatsAppWeb = asyncHandler(async (req, res) => {
  const status = await whatsappWeb.disconnectWhatsAppWeb();
  await logAdminActivity(req, 'DISCONNECT_WHATSAPP_WEB', 'NOTIFICATION', 'whatsapp-web', {});
  res.json({
    success: true,
    message: 'Sesi WhatsApp Web berhasil diputuskan.',
    data: status,
  });
});

const getWhatsAppWebStatus = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: whatsappWeb.getStatus(),
  });
});

// ==================== CHATS MONITOR ====================
const listAdminConversations = asyncHandler(async (req, res) => {
  const conversations = await prisma.conversation.findMany({
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
    include: {
      members: {
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      },
      product: { select: { id: true, name: true, slug: true } },
      _count: { select: { messages: true } },
    },
  });

  res.json({ success: true, data: conversations });
});

// ==================== ACTIVITY LOGS ====================
const listActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));

  const [items, total] = await Promise.all([
    prisma.adminActivityLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { admin: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.adminActivityLog.count(),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

// ==================== ADMIN PERMISSIONS ====================
const listAdminPermissions = asyncHandler(async (req, res) => {
  const adminUsers = await prisma.profile.findMany({
    where: { roles: { some: { role: 'ADMIN' } } },
    select: {
      id: true,
      email: true,
      fullName: true,
      isSuspended: true,
      adminPermissions: { select: { permission: true, createdAt: true } },
    },
  });

  res.json({
    success: true,
    data: {
      availablePermissions: ADMIN_PERMISSIONS,
      admins: adminUsers.map((a) => ({
        ...a,
        permissions: a.adminPermissions.map((p) => p.permission),
      })),
    },
  });
});

const updateAdminPermissions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { permissions = [] } = req.body;

  const validPerms = permissions.filter((p) => ADMIN_PERMISSIONS.includes(p));

  await prisma.$transaction(async (tx) => {
    await tx.userRole.upsert({
      where: { userId_role: { userId, role: 'ADMIN' } },
      update: {},
      create: { userId, role: 'ADMIN' },
    });

    await tx.adminPermission.deleteMany({ where: { userId } });
    if (validPerms.length > 0) {
      await tx.adminPermission.createMany({
        data: validPerms.map((permission) => ({
          userId,
          permission,
          grantedBy: req.user.id,
        })),
      });
    }
  });

  invalidateUserCache(userId);
  await logAdminActivity(req, 'UPDATE_ADMIN_PERMISSIONS', 'ADMIN_PERMISSION', userId, {
    permissions: validPerms,
  });

  res.json({
    success: true,
    message: 'Hak akses admin berhasil diperbarui.',
    data: { userId, permissions: validPerms },
  });
});

// ==================== BANNERS & PLATFORM SETTINGS ====================
const listBanners = asyncHandler(async (req, res) => {
  const banners = await prisma.banner.findMany({
    orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
  });
  res.json({ success: true, data: banners });
});

const createBanner = asyncHandler(async (req, res) => {
  const { title, subtitle, imageUrl, linkUrl, position = 'HERO', sortOrder = 0, isActive = true } = req.body;
  let finalImageUrl = imageUrl;

  if (req.file) {
    const uploaded = await uploadFile(req.file, 'banners');
    finalImageUrl = uploaded.url;
  }
  if (!finalImageUrl) {
    throw new AppError('Gambar banner wajib diisi atau diunggah.', 400, 'IMAGE_REQUIRED');
  }

  const banner = await prisma.banner.create({
    data: {
      title,
      subtitle: subtitle || null,
      imageUrl: finalImageUrl,
      linkUrl: linkUrl || null,
      position,
      sortOrder: parseInt(sortOrder, 10) || 0,
      isActive: isActive !== 'false' && Boolean(isActive),
      createdBy: req.user.id,
    },
  });

  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'CREATE_BANNER', 'BANNER', banner.id, { title });
  res.status(201).json({ success: true, message: 'Banner berhasil dibuat.', data: banner });
});

const updateBanner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, imageUrl, linkUrl, position, sortOrder, isActive } = req.body;

  const updated = await prisma.banner.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(subtitle !== undefined ? { subtitle } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(linkUrl !== undefined ? { linkUrl } : {}),
      ...(position !== undefined ? { position } : {}),
      ...(sortOrder !== undefined ? { sortOrder: parseInt(sortOrder, 10) } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
  });

  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'UPDATE_BANNER', 'BANNER', id, { title: updated.title });
  res.json({ success: true, message: 'Banner berhasil diperbarui.', data: updated });
});

const deleteBanner = asyncHandler(async (req, res) => {
  await prisma.banner.delete({ where: { id: req.params.id } });
  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'DELETE_BANNER', 'BANNER', req.params.id, {});
  res.json({ success: true, message: 'Banner berhasil dihapus.' });
});

const listSettings = asyncHandler(async (req, res) => {
  const settings = await prisma.platformSetting.findMany({ orderBy: { key: 'asc' } });
  res.json({ success: true, data: settings });
});

const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value, category, description, isPublic } = req.body;

  const updated = await prisma.platformSetting.upsert({
    where: { key },
    update: {
      value,
      ...(category !== undefined ? { category } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(isPublic !== undefined ? { isPublic: Boolean(isPublic) } : {}),
      updatedBy: req.user.id,
    },
    create: {
      key,
      value,
      category: category || 'GENERAL',
      description: description || null,
      isPublic: Boolean(isPublic),
      updatedBy: req.user.id,
    },
  });

  invalidateCachePrefix('settings:');
  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'UPDATE_SETTING', 'SETTING', key, { key });
  res.json({ success: true, message: `Pengaturan "${key}" berhasil disimpan.`, data: updated });
});

module.exports = {
  getAdminDashboard,
  listUsers,
  toggleSuspendUser,
  listSellers,
  verifySeller,
  listAdminProducts,
  moderateProduct,
  listAdminOrders,
  listAdminPayments,
  verifyPayment,
  getNotificationIntegrations,
  updateNotificationSettings,
  testExternalNotification,
  connectWhatsAppWeb,
  disconnectWhatsAppWeb,
  getWhatsAppWebStatus,
  listAdminConversations,
  listActivityLogs,
  listAdminPermissions,
  updateAdminPermissions,
  listBanners,
  createBanner,
  updateBanner,
  deleteBanner,
  listSettings,
  updateSetting,
};
