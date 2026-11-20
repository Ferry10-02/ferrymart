const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { slugify } = require('../utils/sanitize');
const { uploadFile } = require('../services/storage.service');
const { generateProductQr } = require('../services/qr.service');
const {
  notifyUser,
  getTelegramBotInfo,
  detectRecentTelegramChats,
  sendTelegramMessage,
} = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');
const { invalidateCachePrefix } = require('../utils/cache');
const { invalidateUserCache } = require('../middleware/auth.middleware');

// PUBLIC: GET /api/sellers/store/:slug
const getPublicStore = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const seller = await prisma.sellerProfile.findUnique({
    where: { storeSlug: slug },
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
      _count: { select: { products: { where: { status: 'ACTIVE' } }, reviews: true } },
    },
  });

  if (!seller || seller.verificationStatus === 'SUSPENDED') {
    throw new AppError('Toko tidak ditemukan.', 404, 'STORE_NOT_FOUND');
  }

  const products = await prisma.product.findMany({
    where: { sellerId: seller.id, status: 'ACTIVE' },
    include: {
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
      category: { select: { id: true, name: true, slug: true } },
    },
    orderBy: [{ soldCount: 'desc' }, { createdAt: 'desc' }],
    take: 40,
  });

  res.json({
    success: true,
    data: { seller, products },
  });
});

// SELLER DASHBOARD: GET /api/sellers/dashboard
const getSellerDashboard = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    totalProducts,
    revenueAgg,
    recentOrders,
    chartOrders,
  ] = await Promise.all([
    prisma.sellerOrder.count({ where: { sellerId } }),
    prisma.sellerOrder.count({
      where: { sellerId, status: { in: ['PAID', 'CONFIRMED', 'PROCESSING'] } },
    }),
    prisma.sellerOrder.count({ where: { sellerId, status: 'COMPLETED' } }),
    prisma.product.count({ where: { sellerId } }),
    prisma.sellerOrder.aggregate({
      where: { sellerId, status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] } },
      _sum: { subtotal: true, sellerPayout: true },
    }),
    prisma.sellerOrder.findMany({
      where: { sellerId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      include: {
        order: { select: { orderNumber: true, buyer: { select: { fullName: true } } } },
        items: true,
      },
    }),
    prisma.sellerOrder.findMany({
      where: {
        sellerId,
        createdAt: { gte: thirtyDaysAgo },
        status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'] },
      },
      select: { createdAt: true, subtotal: true, sellerPayout: true },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // Group sales by day for Recharts chart
  const dailyMap = new Map();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyMap.set(key, { date: key, revenue: 0, orders: 0 });
  }
  for (const ord of chartOrders) {
    const key = new Date(ord.createdAt).toISOString().slice(0, 10);
    if (dailyMap.has(key)) {
      const entry = dailyMap.get(key);
      entry.revenue += Number(ord.subtotal);
      entry.orders += 1;
    }
  }

  res.json({
    success: true,
    data: {
      sellerProfile: req.user.sellerProfile,
      stats: {
        totalOrders,
        pendingOrders,
        completedOrders,
        totalProducts,
        grossRevenue: Number(revenueAgg._sum.subtotal || 0),
        netPayout: Number(revenueAgg._sum.sellerPayout || 0),
        ratingAvg: Number(req.user.sellerProfile.ratingAvg || 0),
      },
      salesChart: Array.from(dailyMap.values()),
      recentOrders,
    },
  });
});

// GET /api/sellers/settings & PUT /api/sellers/settings
const getStoreSettings = asyncHandler(async (req, res) => {
  const [seller, profile, telegramBot] = await Promise.all([
    prisma.sellerProfile.findUnique({ where: { id: req.user.sellerProfile.id } }),
    prisma.profile.findUnique({ where: { id: req.user.id }, select: { telegramChatId: true } }),
    getTelegramBotInfo(),
  ]);
  res.json({
    success: true,
    data: {
      ...seller,
      telegramChatId: profile?.telegramChatId || '',
      telegramBot,
    },
  });
});

const updateStoreSettings = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const {
    storeName,
    description,
    phone,
    address,
    city,
    province,
    postalCode,
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    telegramChatId,
  } = req.body;

  const updated = await prisma.sellerProfile.update({
    where: { id: sellerId },
    data: {
      ...(storeName !== undefined ? { storeName } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(address !== undefined ? { address } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(province !== undefined ? { province } : {}),
      ...(postalCode !== undefined ? { postalCode } : {}),
      ...(bankName !== undefined ? { bankName } : {}),
      ...(bankAccountNumber !== undefined ? { bankAccountNumber } : {}),
      ...(bankAccountHolder !== undefined ? { bankAccountHolder } : {}),
    },
  });

  if (telegramChatId !== undefined) {
    await prisma.profile.update({
      where: { id: req.user.id },
      data: { telegramChatId: telegramChatId ? String(telegramChatId).trim() : null },
    });
    invalidateUserCache(req.user.id);
  }

  const [profile, telegramBot] = await Promise.all([
    prisma.profile.findUnique({ where: { id: req.user.id }, select: { telegramChatId: true } }),
    getTelegramBotInfo(),
  ]);

  res.json({
    success: true,
    message: 'Pengaturan toko & Telegram berhasil disimpan.',
    data: {
      ...updated,
      telegramChatId: profile?.telegramChatId || '',
      telegramBot,
    },
  });
});

// POST /api/sellers/telegram/detect - Auto-detect Seller's Telegram Chat ID from recent /start messages
const detectSellerTelegram = asyncHandler(async (req, res) => {
  const chats = await detectRecentTelegramChats();
  if (chats.length === 0) {
    throw new AppError(
      'Belum ada pesan masuk ke bot Telegram. Silakan buka bot Telegram FerryMarket lalu tekan tombol START terlebih dahulu, kemudian klik deteksi lagi.',
      404,
      'NO_TELEGRAM_UPDATES'
    );
  }

  const latest = chats[0];
  await prisma.profile.update({
    where: { id: req.user.id },
    data: { telegramChatId: latest.chatId },
  });
  invalidateUserCache(req.user.id);

  // Send immediate confirmation message to the Seller's Telegram
  await sendTelegramMessage({
    userId: req.user.id,
    chatId: latest.chatId,
    eventType: 'TELEGRAM_CONNECTED',
    message: `✅ <b>Notifikasi Telegram Seller Aktif!</b>\n\nToko <b>${req.user.sellerProfile.storeName}</b> berhasil terhubung ke FerryMarket.\nAnda akan otomatis menerima notifikasi saat ada pesanan baru, bukti pembayaran, pembayaran disetujui, scan QR, dan chat pembeli.`,
  });

  res.json({
    success: true,
    message: `Chat ID Telegram (${latest.chatId} - ${latest.firstName}) berhasil terdeteksi & otomatis tersimpan! Cek pesan konfirmasi di Telegram Anda.`,
    data: { chatId: latest.chatId, detected: latest, allRecentChats: chats },
  });
});

// POST /api/sellers/telegram/test - Send test Telegram notification to Seller
const testSellerTelegram = asyncHandler(async (req, res) => {
  const profile = await prisma.profile.findUnique({
    where: { id: req.user.id },
    select: { telegramChatId: true },
  });
  const targetChatId = req.body.telegramChatId || profile?.telegramChatId;
  if (!targetChatId) {
    throw new AppError('Isi atau deteksi Telegram Chat ID Anda terlebih dahulu.', 400, 'TELEGRAM_CHAT_ID_REQUIRED');
  }

  const log = await sendTelegramMessage({
    userId: req.user.id,
    chatId: String(targetChatId).trim(),
    eventType: 'SELLER_TEST',
    message: `🔔 <b>[FerryMarket] Tes Notifikasi Seller</b>\n\nHalo Seller <b>${req.user.sellerProfile.storeName}</b>! Notifikasi Telegram otomatis Anda sudah aktif dan berfungsi normal.`,
  });

  if (log?.status !== 'SENT') {
    throw new AppError(log?.errorMessage || 'Gagal mengirim pesan uji Telegram.', 400, 'TELEGRAM_SEND_FAILED');
  }

  res.json({
    success: true,
    message: `Pesan uji berhasil dikirim ke Telegram Chat ID ${targetChatId}!`,
    data: log,
  });
});

// POST /api/sellers/media (Upload logo or banner)
const uploadStoreMedia = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('File gambar wajib diunggah.', 400, 'FILE_REQUIRED');
  }
  const type = req.body.type === 'banner' ? 'bannerUrl' : 'logoUrl';
  const uploaded = await uploadFile(req.file, 'stores');

  const updated = await prisma.sellerProfile.update({
    where: { id: req.user.sellerProfile.id },
    data: { [type]: uploaded.url },
  });

  res.json({ success: true, message: 'Gambar toko berhasil diunggah.', data: updated });
});

// GET /api/sellers/products
const listSellerProducts = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { q, status, categoryId, page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

  const where = { sellerId };
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
        images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
        variants: true,
        category: { select: { id: true, name: true, slug: true } },
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

// POST /api/sellers/products
const createSellerProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const {
    categoryId,
    name,
    sku,
    description,
    price,
    compareAtPrice,
    stock,
    weightGrams = 500,
    condition = 'NEW',
    status = 'ACTIVE',
    isFlashSale = false,
    flashSalePrice,
    flashSaleEndsAt,
    images = [],
    variants = [],
  } = req.body;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    throw new AppError('Kategori tidak ditemukan.', 404, 'CATEGORY_NOT_FOUND');
  }

  const slug = slugify(name, true);
  const parsedVariants = Array.isArray(variants) ? variants : [];
  const totalStock =
    parsedVariants.length > 0
      ? parsedVariants.reduce((sum, v) => sum + Math.max(0, parseInt(v.stock || 0, 10)), 0)
      : Math.max(0, parseInt(stock || 0, 10));

  const product = await prisma.product.create({
    data: {
      sellerId,
      categoryId,
      name: name.trim(),
      slug,
      sku: sku || null,
      description,
      price: Number(price),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      stock: totalStock,
      weightGrams: Math.max(1, parseInt(weightGrams, 10) || 500),
      condition: ['NEW', 'USED'].includes(condition) ? condition : 'NEW',
      status: ['DRAFT', 'ACTIVE', 'INACTIVE'].includes(status) ? status : 'ACTIVE',
      isFlashSale: Boolean(isFlashSale),
      flashSalePrice: isFlashSale && flashSalePrice ? Number(flashSalePrice) : null,
      flashSaleEndsAt: isFlashSale && flashSaleEndsAt ? new Date(flashSaleEndsAt) : null,
      images: {
        create: (Array.isArray(images) ? images : []).map((img, idx) => ({
          imageUrl: typeof img === 'string' ? img : img.imageUrl,
          altText: typeof img === 'string' ? name : img.altText || name,
          isPrimary: idx === 0,
          sortOrder: idx,
        })),
      },
      variants: {
        create: parsedVariants.map((v) => ({
          name: String(v.name || 'Variasi').trim(),
          value: String(v.value || 'Standar').trim(),
          sku: v.sku || null,
          priceAdjustment: Number(v.priceAdjustment || 0),
          stock: Math.max(0, parseInt(v.stock || 0, 10)),
          imageUrl: v.imageUrl || null,
          isActive: true,
        })),
      },
    },
    include: { images: true, variants: true, category: true },
  });

  const qr = await generateProductQr(product);
  await prisma.product.update({
    where: { id: product.id },
    data: { qrCodeUrl: qr.targetUrl },
  });
  invalidateCachePrefix('products:');

  res.status(201).json({
    success: true,
    message: 'Produk berhasil ditambahkan.',
    data: { ...product, qrCodeUrl: qr.targetUrl, qr },
  });
});

// PUT /api/sellers/products/:id
const updateSellerProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.sellerId !== sellerId) {
    throw new AppError('Produk tidak ditemukan di toko Anda.', 404, 'PRODUCT_NOT_FOUND');
  }

  const {
    categoryId,
    name,
    sku,
    description,
    price,
    compareAtPrice,
    stock,
    weightGrams,
    condition,
    status,
    isFlashSale,
    flashSalePrice,
    flashSaleEndsAt,
    images,
    variants,
  } = req.body;

  const updated = await prisma.$transaction(async (tx) => {
    if (Array.isArray(images)) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (images.length > 0) {
        await tx.productImage.createMany({
          data: images.map((img, idx) => ({
            productId: id,
            imageUrl: typeof img === 'string' ? img : img.imageUrl,
            altText: typeof img === 'string' ? name || existing.name : img.altText || existing.name,
            isPrimary: idx === 0,
            sortOrder: idx,
          })),
        });
      }
    }

    let computedStock = stock !== undefined ? Math.max(0, parseInt(stock, 10)) : existing.stock;

    if (Array.isArray(variants)) {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      if (variants.length > 0) {
        await tx.productVariant.createMany({
          data: variants.map((v) => ({
            productId: id,
            name: String(v.name || 'Variasi').trim(),
            value: String(v.value || 'Standar').trim(),
            sku: v.sku || null,
            priceAdjustment: Number(v.priceAdjustment || 0),
            stock: Math.max(0, parseInt(v.stock || 0, 10)),
            imageUrl: v.imageUrl || null,
            isActive: v.isActive !== false,
          })),
        });
        computedStock = variants.reduce((sum, v) => sum + Math.max(0, parseInt(v.stock || 0, 10)), 0);
      }
    }

    return tx.product.update({
      where: { id },
      data: {
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(sku !== undefined ? { sku: sku || null } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(compareAtPrice !== undefined
          ? { compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null }
          : {}),
        stock: computedStock,
        ...(weightGrams !== undefined ? { weightGrams: Math.max(1, parseInt(weightGrams, 10)) } : {}),
        ...(condition !== undefined ? { condition } : {}),
        ...(status !== undefined && ['DRAFT', 'ACTIVE', 'INACTIVE'].includes(status)
          ? { status }
          : {}),
        ...(isFlashSale !== undefined ? { isFlashSale: Boolean(isFlashSale) } : {}),
        ...(flashSalePrice !== undefined
          ? { flashSalePrice: flashSalePrice ? Number(flashSalePrice) : null }
          : {}),
        ...(flashSaleEndsAt !== undefined
          ? { flashSaleEndsAt: flashSaleEndsAt ? new Date(flashSaleEndsAt) : null }
          : {}),
      },
      include: { images: true, variants: true, category: true },
    });
  });

  invalidateCachePrefix('products:');
  res.json({ success: true, message: 'Produk berhasil diperbarui.', data: updated });
});

// DELETE /api/sellers/products/:id
const deleteSellerProduct = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { id } = req.params;

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing || existing.sellerId !== sellerId) {
    throw new AppError('Produk tidak ditemukan di toko Anda.', 404, 'PRODUCT_NOT_FOUND');
  }

  const orderCount = await prisma.orderItem.count({ where: { productId: id } });
  if (orderCount > 0) {
    // Archive product if already referenced by orders
    await prisma.product.update({ where: { id }, data: { status: 'INACTIVE' } });
    return res.json({
      success: true,
      message: 'Produk dinonaktifkan karena sudah memiliki riwayat transaksi.',
    });
  }

  await prisma.product.delete({ where: { id } });
  invalidateCachePrefix('products:');
  res.json({ success: true, message: 'Produk berhasil dihapus.' });
});

// POST /api/sellers/products/upload-images
const uploadProductImages = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    throw new AppError('Minimal 1 file gambar produk harus diunggah.', 400, 'FILES_REQUIRED');
  }

  const uploaded = [];
  for (const file of files) {
    const resUpload = await uploadFile(file, 'products');
    uploaded.push(resUpload.url);
  }

  res.status(201).json({
    success: true,
    message: `${uploaded.length} gambar produk berhasil diunggah.`,
    data: { urls: uploaded },
  });
});

// GET /api/sellers/products/:id/qr (Seller QR generator)
const getSellerProductQr = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const product = await prisma.product.findUnique({ where: { id: req.params.id } });

  if (!product || product.sellerId !== sellerId) {
    throw new AppError('Produk tidak ditemukan di toko Anda.', 404, 'PRODUCT_NOT_FOUND');
  }

  const qr = await generateProductQr(product);
  res.json({ success: true, data: { product, ...qr } });
});

// GET /api/sellers/orders
const listSellerOrders = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { status, page = 1, limit = 15 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));

  const where = { sellerId };
  if (status && status !== 'ALL') {
    if (status === 'BELUM_BAYAR') {
      where.status = { in: ['PENDING_PAYMENT', 'WAITING_VERIFICATION'] };
    } else if (status === 'DIKEMAS') {
      where.status = { in: ['PAID', 'CONFIRMED', 'PROCESSING'] };
    } else if (status === 'DIKIRIM') {
      where.status = { in: ['SHIPPED', 'DELIVERED'] };
    } else if (status === 'SELESAI') {
      where.status = 'COMPLETED';
    } else if (status === 'DIBATALKAN') {
      where.status = { in: ['CANCELLED', 'REFUNDED'] };
    } else {
      where.status = status;
    }
  }

  const [items, total, grouped] = await Promise.all([
    prisma.sellerOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            shippingAddressSnapshot: true,
            buyer: { select: { id: true, fullName: true, phone: true } },
            payment: { select: { status: true, paymentMethodName: true, verifiedAt: true } },
          },
        },
        shippingMethod: true,
        shipment: true,
        items: true,
      },
    }),
    prisma.sellerOrder.count({ where }),
    prisma.sellerOrder.groupBy({
      by: ['status'],
      where: { sellerId },
      _count: { _all: true },
    }),
  ]);

  const byStatus = {};
  let allTotal = 0;
  for (const row of grouped) {
    byStatus[row.status] = row._count._all;
    allTotal += row._count._all;
  }

  const counts = {
    total: allTotal,
    belumBayar: (byStatus.PENDING_PAYMENT || 0) + (byStatus.WAITING_VERIFICATION || 0),
    dikemas: (byStatus.PAID || 0) + (byStatus.CONFIRMED || 0) + (byStatus.PROCESSING || 0),
    dikirim: (byStatus.SHIPPED || 0) + (byStatus.DELIVERED || 0),
    selesai: byStatus.COMPLETED || 0,
    dibatalkan: (byStatus.CANCELLED || 0) + (byStatus.REFUNDED || 0),
  };

  res.json({
    success: true,
    data: {
      items,
      counts,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

// PUT /api/sellers/orders/:id/status (Seller confirm / process order)
const updateSellerOrderStatus = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { id } = req.params;
  const { status, sellerNote } = req.body;

  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: { id },
    include: {
      order: true,
      seller: { select: { storeName: true } },
    },
  });

  if (!sellerOrder || sellerOrder.sellerId !== sellerId) {
    throw new AppError('Pesanan toko tidak ditemukan.', 404, 'SELLER_ORDER_NOT_FOUND');
  }

  const allowedTargets = ['CONFIRMED', 'PROCESSING', 'CANCELLED'];
  if (!allowedTargets.includes(status)) {
    throw new AppError('Status pesanan tidak valid. Gunakan endpoint pengiriman untuk status SHIPPED.', 400, 'INVALID_STATUS');
  }

  if (['CONFIRMED', 'PROCESSING'].includes(status) && !['PAID', 'CONFIRMED'].includes(sellerOrder.status)) {
    throw new AppError(
      'Pesanan hanya dapat dikonfirmasi/diproses setelah pembayaran disetujui oleh Admin.',
      400,
      'PAYMENT_REQUIRED'
    );
  }

  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const so = await tx.sellerOrder.update({
      where: { id },
      data: {
        status,
        sellerNote: sellerNote !== undefined ? sellerNote : sellerOrder.sellerNote,
        ...(status === 'CONFIRMED' ? { confirmedAt: now } : {}),
        ...(status === 'CANCELLED' ? { cancelledAt: now } : {}),
      },
    });

    if (status === 'PROCESSING' || status === 'CONFIRMED') {
      await tx.order.update({
        where: { id: sellerOrder.orderId },
        data: { status: 'PROCESSING' },
      });
    }

    return so;
  });

  if (status === 'CONFIRMED' || status === 'PROCESSING') {
    notifyUser({
      userId: sellerOrder.order.buyerId,
      eventType: NOTIFICATION_EVENTS.ORDER_PROCESSING,
      title: `Pesanan ${sellerOrder.subOrderNumber} Sedang Diproses`,
      body: `Toko ${sellerOrder.seller.storeName} telah mengonfirmasi dan sedang mengemas pesanan Anda.`,
      data: { orderId: sellerOrder.orderId, sellerOrderId: id },
    });
  }

  res.json({
    success: true,
    message: `Status pesanan berhasil diubah menjadi ${status}.`,
    data: updated,
  });
});

// GET /api/sellers/transactions
const listSellerTransactions = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const transactions = await prisma.sellerOrder.findMany({
    where: {
      sellerId,
      status: { in: ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'REFUNDED'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      order: { select: { orderNumber: true, buyer: { select: { fullName: true } } } },
    },
  });

  const summary = transactions.reduce(
    (acc, t) => {
      if (t.status !== 'REFUNDED') {
        acc.grossTotal += Number(t.subtotal);
        acc.shippingTotal += Number(t.shippingCost);
        acc.serviceFeeTotal += Number(t.serviceFee);
        acc.netPayoutTotal += Number(t.sellerPayout);
      }
      return acc;
    },
    { grossTotal: 0, shippingTotal: 0, serviceFeeTotal: 0, netPayoutTotal: 0 }
  );

  res.json({ success: true, data: { items: transactions, summary } });
});

module.exports = {
  getPublicStore,
  getSellerDashboard,
  getStoreSettings,
  updateStoreSettings,
  detectSellerTelegram,
  testSellerTelegram,
  uploadStoreMedia,
  listSellerProducts,
  createSellerProduct,
  updateSellerProduct,
  deleteSellerProduct,
  uploadProductImages,
  getSellerProductQr,
  listSellerOrders,
  updateSellerOrderStatus,
  listSellerTransactions,
};
