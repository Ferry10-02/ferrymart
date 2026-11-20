const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { generateOrderQr } = require('../services/qr.service');
const { notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');
const { formatIDR } = require('../utils/sanitize');

// Short 5-second dedup cache so React StrictMode or double-tap doesn't send duplicate WA messages
const recentQrScanNotify = new Map();

// GET /api/orders (Buyer's own orders)
const listMyOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const where = { buyerId: req.user.id };
  if (status && status !== 'ALL') {
    where.status = status;
  }

  const [items, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        payment: {
          include: { proofs: { orderBy: { createdAt: 'desc' } } },
        },
        sellerOrders: {
          include: {
            seller: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true } },
            shippingMethod: true,
            shipment: true,
            items: {
              include: {
                review: { select: { id: true, rating: true } },
              },
            },
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
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    },
  });
});

// GET /api/orders/:id (Buyer owner, involved Seller, or Admin)
const getOrderDetail = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  const order = await prisma.order.findFirst({
    where: isUuid ? { id } : { orderNumber: id },
    include: {
      buyer: { select: { id: true, fullName: true, email: true, phone: true } },
      payment: {
        include: { proofs: { orderBy: { createdAt: 'desc' } } },
      },
      sellerOrders: {
        include: {
          seller: { select: { id: true, userId: true, storeName: true, storeSlug: true, city: true, logoUrl: true } },
          shippingMethod: true,
          shipment: true,
          items: {
            include: {
              product: { select: { id: true, slug: true } },
              review: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  }

  const isBuyer = order.buyerId === req.user.id;
  const isAdmin = req.user.roles.includes('ADMIN');
  const mySellerId = req.user.sellerProfile?.id;
  const isInvolvedSeller = mySellerId && order.sellerOrders.some((so) => so.sellerId === mySellerId);

  if (!isBuyer && !isAdmin && !isInvolvedSeller) {
    throw new AppError(
      'Akses ditolak. Anda tidak berwenang melihat data pesanan ini.',
      403,
      'ORDER_ACCESS_DENIED'
    );
  }

  // If seller views order, only return their own sellerOrders (protect other sellers' data)
  const sanitizedOrder =
    isInvolvedSeller && !isBuyer && !isAdmin
      ? {
          ...order,
          sellerOrders: order.sellerOrders.filter((so) => so.sellerId === mySellerId),
          payment: { status: order.payment?.status, paymentMethodName: order.payment?.paymentMethodName },
        }
      : order;

  const qr = await generateOrderQr(order);

  res.json({
    success: true,
    data: {
      order: sanitizedOrder,
      qr,
    },
  });
});

// GET /api/orders/qr/:orderNumber (STRICTLY AUTHENTICATED + OWNERSHIP CHECK!)
// Never displays personal info or order data to unauthorized users.
const getOrderByQr = asyncHandler(async (req, res) => {
  const { orderNumber } = req.params;

  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: {
      buyer: { select: { id: true, fullName: true, phone: true, email: true } },
      payment: {
        select: {
          id: true,
          status: true,
          paymentMethodName: true,
          paymentDestination: true,
          amount: true,
          verifiedAt: true,
          proofs: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      },
      sellerOrders: {
        include: {
          seller: { select: { id: true, userId: true, storeName: true, storeSlug: true } },
          shippingMethod: { select: { name: true, courier: true } },
          shipment: { select: { courierName: true, trackingNumber: true, status: true, shippedAt: true, deliveredAt: true } },
          items: {
            select: {
              id: true,
              productNameSnapshot: true,
              variantNameSnapshot: true,
              quantity: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new AppError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  }

  const isBuyer = order.buyerId === req.user.id;
  const isAdmin = req.user.roles.includes('ADMIN');
  const mySellerId = req.user.sellerProfile?.id;
  const isInvolvedSeller = mySellerId && order.sellerOrders.some((so) => so.sellerId === mySellerId);

  if (!isBuyer && !isAdmin && !isInvolvedSeller) {
    throw new AppError(
      'Akses ditolak. QR Pesanan ini hanya dapat dilihat oleh Pembeli pemilik pesanan, Seller terkait, atau Admin.',
      403,
      'QR_ORDER_FORBIDDEN'
    );
  }

  const visibleSellerOrders =
    isInvolvedSeller && !isBuyer && !isAdmin
      ? order.sellerOrders.filter((so) => so.sellerId === mySellerId)
      : order.sellerOrders;

  const authorizedAs = isAdmin ? 'ADMIN' : isBuyer ? 'BUYER' : 'SELLER';
  const buyerPhone = order.shippingAddressSnapshot?.phone || order.buyer?.phone || '-';
  const buyerName = order.shippingAddressSnapshot?.recipientName || order.buyer?.fullName || 'Pembeli';
  const itemSummary = visibleSellerOrders
    .flatMap((so) => so.items.map((i) => `${i.productNameSnapshot} (x${i.quantity})`))
    .slice(0, 5)
    .join(', ');

  const scanDedupKey = `${order.id}:${req.user.id}`;
  const lastSentAt = recentQrScanNotify.get(scanDedupKey) || 0;
  const shouldNotify = Date.now() - lastSentAt > 5000;

  if (shouldNotify) {
    recentQrScanNotify.set(scanDedupKey, Date.now());

    const detailedMessage = [
      `No. Pesanan: ${order.orderNumber}`,
      `Pembeli: ${buyerName} (HP/WA: ${buyerPhone})`,
      `Produk: ${itemSummary || '-'}`,
      `Total Pembayaran: ${formatIDR(order.grandTotal)}`,
      `Status Pesanan: ${order.status} | Pembayaran: ${order.payment?.status || '-'}`,
      `Dipindai oleh: ${req.user.fullName} (${authorizedAs})`,
      '',
      'Harap segera hubungi pembeli untuk konfirmasi pengiriman barang dan penerimaan pembayaran.',
    ].join('\n');

    // Dispatch QR_SCANNED notification to Buyer & Admin WhatsApp (6285772416042)
    notifyUser({
      userId: order.buyerId,
      eventType: NOTIFICATION_EVENTS.QR_SCANNED,
      title: `Scan QR Pesanan ${order.orderNumber}`,
      body: detailedMessage,
      data: { orderId: order.id, orderNumber: order.orderNumber, scannedBy: req.user.id, source: 'QR_ORDER' },
      notifyAdminExternal: true,
    });

    // Notify involved Seller(s) as well
    for (const so of order.sellerOrders) {
      if (so.seller?.userId && so.seller.userId !== order.buyerId) {
        notifyUser({
          userId: so.seller.userId,
          eventType: NOTIFICATION_EVENTS.QR_SCANNED,
          title: `Scan QR Pesanan ${order.orderNumber} (${so.seller.storeName})`,
          body: detailedMessage,
          data: { orderId: order.id, orderNumber: order.orderNumber, sellerOrderId: so.id, source: 'QR_ORDER' },
        });
      }
    }
  }

  res.json({
    success: true,
    data: {
      authorizedAs,
      isAdmin,
      isBuyer,
      isSeller: Boolean(isInvolvedSeller),
      qrScanNotified: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      grandTotal: order.grandTotal,
      createdAt: order.createdAt,
      buyer: {
        id: order.buyer?.id,
        fullName: buyerName,
        phone: buyerPhone,
        email: order.buyer?.email,
      },
      shippingAddress: order.shippingAddressSnapshot,
      payment: order.payment,
      sellerOrders: visibleSellerOrders,
    },
  });
});

// POST /api/orders/seller-orders/:sellerOrderId/complete (Buyer confirms receipt)
const confirmOrderReceived = asyncHandler(async (req, res) => {
  const { sellerOrderId } = req.params;

  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: { id: sellerOrderId },
    include: {
      order: true,
      seller: { select: { id: true, userId: true, storeName: true } },
      items: true,
    },
  });

  if (!sellerOrder || sellerOrder.order.buyerId !== req.user.id) {
    throw new AppError('Sub-pesanan tidak ditemukan.', 404, 'SELLER_ORDER_NOT_FOUND');
  }

  if (!['SHIPPED', 'DELIVERED'].includes(sellerOrder.status)) {
    throw new AppError('Pesanan hanya dapat diselesaikan setelah dikirim oleh seller.', 400, 'INVALID_ORDER_STATE');
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.sellerOrder.update({
      where: { id: sellerOrderId },
      data: { status: 'COMPLETED', deliveredAt: sellerOrder.deliveredAt || now, completedAt: now },
    });

    await tx.shipment.updateMany({
      where: { sellerOrderId },
      data: { status: 'DELIVERED', deliveredAt: now },
    });

    // Update product sold_count & seller total_sales
    for (const item of sellerOrder.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { soldCount: { increment: item.quantity } },
      });
    }

    const totalQty = sellerOrder.items.reduce((sum, i) => sum + i.quantity, 0);
    await tx.sellerProfile.update({
      where: { id: sellerOrder.sellerId },
      data: { totalSales: { increment: totalQty } },
    });

    // Sync master order if all seller orders completed
    const remaining = await tx.sellerOrder.count({
      where: { orderId: sellerOrder.orderId, status: { not: 'COMPLETED' } },
    });
    if (remaining === 0) {
      await tx.order.update({
        where: { id: sellerOrder.orderId },
        data: { status: 'COMPLETED' },
      });
    }
  });

  notifyUser({
    userId: sellerOrder.seller.userId,
    eventType: NOTIFICATION_EVENTS.ORDER_COMPLETED,
    title: `Pesanan ${sellerOrder.subOrderNumber} Selesai`,
    body: `Pembeli telah mengonfirmasi penerimaan pesanan di toko ${sellerOrder.seller.storeName}.`,
    data: { sellerOrderId, orderId: sellerOrder.orderId },
  });

  notifyUser({
    userId: req.user.id,
    eventType: NOTIFICATION_EVENTS.ORDER_COMPLETED,
    title: `Pesanan ${sellerOrder.subOrderNumber} Telah Selesai`,
    body: `Terima kasih telah berbelanja di FerryMarket! Jangan lupa berikan ulasan produk.`,
    data: { sellerOrderId, orderId: sellerOrder.orderId },
  });

  res.json({
    success: true,
    message: 'Pesanan berhasil dikonfirmasi selesai. Anda kini dapat memberikan ulasan produk.',
  });
});

// POST /api/orders/:id/cancel (Buyer cancels unpaid order)
const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payment: true },
  });

  if (!order || order.buyerId !== req.user.id) {
    throw new AppError('Pesanan tidak ditemukan.', 404, 'ORDER_NOT_FOUND');
  }

  if (!['PENDING_PAYMENT', 'WAITING_VERIFICATION'].includes(order.status)) {
    throw new AppError(
      'Pesanan yang sudah dibayar atau diproses tidak dapat dibatalkan langsung.',
      400,
      'CANNOT_CANCEL_ORDER'
    );
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    await tx.sellerOrder.updateMany({
      where: { orderId: id },
      data: { status: 'CANCELLED', cancelledAt: now },
    });
    if (order.payment) {
      await tx.payment.update({
        where: { id: order.payment.id },
        data: { status: 'REJECTED', rejectionReason: 'Dibatalkan oleh pembeli' },
      });
    }
    // Restore stock
    for (const item of order.items) {
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
  });

  res.json({ success: true, message: 'Pesanan berhasil dibatalkan dan stok dikembalikan.' });
});

module.exports = {
  listMyOrders,
  getOrderDetail,
  getOrderByQr,
  confirmOrderReceived,
  cancelOrder,
};
