const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');

// GET /api/shipments/methods
const listShippingMethods = asyncHandler(async (req, res) => {
  const methods = await prisma.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { baseCost: 'asc' },
  });
  res.json({ success: true, data: methods });
});

// GET /api/shipments/:sellerOrderId
const getShipment = asyncHandler(async (req, res) => {
  const { sellerOrderId } = req.params;
  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: { id: sellerOrderId },
    include: {
      order: { select: { id: true, buyerId: true, orderNumber: true } },
      shipment: { include: { shippingMethod: true } },
    },
  });

  if (!sellerOrder) {
    throw new AppError('Pesanan tidak ditemukan.', 404, 'SELLER_ORDER_NOT_FOUND');
  }

  const isBuyer = sellerOrder.order.buyerId === req.user.id;
  const isSeller = req.user.sellerProfile?.id === sellerOrder.sellerId;
  const isAdmin = req.user.roles.includes('ADMIN');

  if (!isBuyer && !isSeller && !isAdmin) {
    throw new AppError('Akses ditolak.', 403, 'SHIPMENT_FORBIDDEN');
  }

  res.json({ success: true, data: sellerOrder.shipment });
});

// POST /api/shipments/:sellerOrderId (Seller sets tracking number & ships order)
const upsertShipment = asyncHandler(async (req, res) => {
  const { sellerOrderId } = req.params;
  const { courierName, trackingNumber, status = 'IN_TRANSIT', note } = req.body;

  const sellerOrder = await prisma.sellerOrder.findUnique({
    where: { id: sellerOrderId },
    include: {
      order: true,
      shippingMethod: true,
      shipment: true,
      seller: { select: { id: true, storeName: true } },
    },
  });

  if (!sellerOrder || sellerOrder.sellerId !== req.user.sellerProfile.id) {
    throw new AppError('Pesanan toko tidak ditemukan.', 404, 'SELLER_ORDER_NOT_FOUND');
  }

  if (!['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED'].includes(sellerOrder.status)) {
    throw new AppError(
      'Pengiriman hanya dapat diatur setelah pembayaran disetujui Admin.',
      400,
      'PAYMENT_NOT_APPROVED'
    );
  }

  const now = new Date();
  const prevHistory = Array.isArray(sellerOrder.shipment?.trackingHistory)
    ? sellerOrder.shipment.trackingHistory
    : [];

  const nextHistory = [
    ...prevHistory,
    {
      status,
      timestamp: now.toISOString(),
      description: note || `Paket diproses oleh kurir ${courierName || sellerOrder.shippingMethod.courier} (Resi: ${trackingNumber || '-'})`,
    },
  ];

  const shipment = await prisma.$transaction(async (tx) => {
    const saved = await tx.shipment.upsert({
      where: { sellerOrderId },
      update: {
        courierName: courierName || sellerOrder.shippingMethod.courier,
        trackingNumber: trackingNumber || sellerOrder.shipment?.trackingNumber || null,
        status,
        shippedAt: sellerOrder.shipment?.shippedAt || now,
        deliveredAt: status === 'DELIVERED' ? now : sellerOrder.shipment?.deliveredAt,
        trackingHistory: nextHistory,
      },
      create: {
        sellerOrderId,
        shippingMethodId: sellerOrder.shippingMethodId,
        courierName: courierName || sellerOrder.shippingMethod.courier,
        trackingNumber: trackingNumber || null,
        status,
        shippedAt: now,
        trackingHistory: nextHistory,
      },
    });

    const nextOrderStatus = status === 'DELIVERED' ? 'DELIVERED' : 'SHIPPED';
    await tx.sellerOrder.update({
      where: { id: sellerOrderId },
      data: {
        status: nextOrderStatus,
        shippedAt: sellerOrder.shippedAt || now,
        ...(status === 'DELIVERED' ? { deliveredAt: now } : {}),
      },
    });

    await tx.order.update({
      where: { id: sellerOrder.orderId },
      data: { status: nextOrderStatus },
    });

    return saved;
  });

  notifyUser({
    userId: sellerOrder.order.buyerId,
    eventType: NOTIFICATION_EVENTS.ORDER_SHIPPED,
    title: `Pesanan ${sellerOrder.subOrderNumber} Dikirim`,
    body: `Toko ${sellerOrder.seller.storeName} telah mengirim pesanan via ${shipment.courierName}. Nomor resi: ${shipment.trackingNumber || 'Menunggu update'}.`,
    data: { orderId: sellerOrder.orderId, sellerOrderId, trackingNumber: shipment.trackingNumber },
  });

  res.json({
    success: true,
    message: 'Informasi pengiriman & nomor resi berhasil disimpan.',
    data: shipment,
  });
});

module.exports = {
  listShippingMethods,
  getShipment,
  upsertShipment,
};
