const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errors');

const parseStartDate = (value) => {
  if (!value) return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T00:00:00.000+07:00`);
  }
  return new Date(value);
};

const parseEndDate = (value) => {
  if (!value) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999+07:00`);
  }
  return new Date(value);
};

const toWibDateKey = (dateVal) => {
  const shifted = new Date(new Date(dateVal).getTime() + 7 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
};

// GET /api/reports/admin (Marketplace-wide financial & sales report)
const getAdminReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const start = parseStartDate(startDate);
  const end = parseEndDate(endDate);

  const dateFilter = { gte: start, lte: end };

  const [orders, topProducts, topSellers] = await Promise.all([
    prisma.order.findMany({
      where: { createdAt: dateFilter },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        subtotal: true,
        shippingTotal: true,
        serviceFee: true,
        discountTotal: true,
        grandTotal: true,
        createdAt: true,
        buyer: { select: { fullName: true, email: true } },
        payment: { select: { status: true, paymentMethodName: true } },
        sellerOrders: {
          select: {
            subOrderNumber: true,
            seller: { select: { storeName: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.product.findMany({
      where: { soldCount: { gt: 0 } },
      orderBy: { soldCount: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        price: true,
        soldCount: true,
        ratingAvg: true,
        seller: { select: { storeName: true } },
      },
    }),
    prisma.sellerProfile.findMany({
      orderBy: { totalSales: 'desc' },
      take: 10,
      select: {
        id: true,
        storeName: true,
        city: true,
        totalSales: true,
        ratingAvg: true,
        verificationStatus: true,
      },
    }),
  ]);

  const paidStatuses = new Set(['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']);
  const statusBreakdown = {};
  const dailySeries = new Map();
  let totalGMV = 0;
  let totalServiceFee = 0;
  let paidOrdersCount = 0;

  for (const ord of orders) {
    statusBreakdown[ord.status] = (statusBreakdown[ord.status] || 0) + 1;
    const day = toWibDateKey(ord.createdAt);
    if (!dailySeries.has(day)) {
      dailySeries.set(day, { date: day, revenue: 0, orders: 0 });
    }
    const row = dailySeries.get(day);
    row.orders += 1;

    if (paidStatuses.has(ord.status)) {
      totalGMV += Number(ord.grandTotal);
      totalServiceFee += Number(ord.serviceFee);
      paidOrdersCount += 1;
      row.revenue += Number(ord.grandTotal);
    }
  }

  res.json({
    success: true,
    data: {
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalOrders: orders.length,
        paidOrdersCount,
        totalGMV,
        totalServiceFee,
        avgOrderValue: paidOrdersCount > 0 ? Math.round(totalGMV / paidOrdersCount) : 0,
      },
      statusBreakdown,
      dailySeries: Array.from(dailySeries.values()),
      topProducts,
      topSellers,
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        buyerName: o.buyer?.fullName || '-',
        buyerEmail: o.buyer?.email || '-',
        sellers: o.sellerOrders?.map((s) => s.seller?.storeName).filter(Boolean).join(', ') || '-',
        paymentMethod: o.payment?.paymentMethodName || '-',
        paymentStatus: o.payment?.status || '-',
        status: o.status,
        subtotal: Number(o.subtotal),
        shippingTotal: Number(o.shippingTotal),
        serviceFee: Number(o.serviceFee),
        discountTotal: Number(o.discountTotal),
        grandTotal: Number(o.grandTotal),
        createdAt: o.createdAt,
      })),
    },
  });
});

// GET /api/reports/seller (Seller's own sales report)
const getSellerReport = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { startDate, endDate } = req.query;
  const start = parseStartDate(startDate);
  const end = parseEndDate(endDate);

  const [sellerOrders, topProducts] = await Promise.all([
    prisma.sellerOrder.findMany({
      where: { sellerId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
      include: {
        items: true,
        shippingMethod: { select: { name: true, courier: true } },
        shipment: { select: { courierName: true, trackingNumber: true, status: true } },
        order: {
          select: {
            orderNumber: true,
            buyer: { select: { fullName: true, phone: true } },
            payment: { select: { status: true, paymentMethodName: true } },
          },
        },
      },
    }),
    prisma.product.findMany({
      where: { sellerId },
      orderBy: { soldCount: 'desc' },
      take: 10,
      select: { id: true, name: true, price: true, stock: true, soldCount: true, ratingAvg: true },
    }),
  ]);

  const paidStatuses = new Set(['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED']);
  const dailyMap = new Map();
  let grossRevenue = 0;
  let netPayout = 0;
  let totalCommission = 0;
  let totalUnitsSold = 0;

  for (const so of sellerOrders) {
    const day = toWibDateKey(so.createdAt);
    if (!dailyMap.has(day)) {
      dailyMap.set(day, { date: day, revenue: 0, payout: 0, orders: 0 });
    }
    const row = dailyMap.get(day);
    row.orders += 1;

    if (paidStatuses.has(so.status)) {
      grossRevenue += Number(so.subtotal);
      netPayout += Number(so.sellerPayout);
      totalCommission += Number(so.serviceFee);
      totalUnitsSold += so.items.reduce((sum, i) => sum + i.quantity, 0);
      row.revenue += Number(so.subtotal);
      row.payout += Number(so.sellerPayout);
    }
  }

  const paidOrdersCount = sellerOrders.filter((so) => paidStatuses.has(so.status)).length;

  res.json({
    success: true,
    data: {
      storeName: req.user.sellerProfile?.storeName || 'Toko Seller',
      period: { startDate: start.toISOString(), endDate: end.toISOString() },
      summary: {
        totalOrders: sellerOrders.length,
        paidOrdersCount,
        totalUnitsSold,
        grossRevenue,
        totalCommission,
        netPayout,
      },
      dailySeries: Array.from(dailyMap.values()),
      topProducts,
      orders: sellerOrders.map((so) => ({
        id: so.id,
        subOrderNumber: so.subOrderNumber,
        orderNumber: so.order?.orderNumber || '-',
        buyerName: so.order?.buyer?.fullName || '-',
        buyerPhone: so.order?.buyer?.phone || '-',
        itemsSummary: so.items.map((i) => `${i.productNameSnapshot} (x${i.quantity})`).join(', '),
        totalQty: so.items.reduce((s, i) => s + i.quantity, 0),
        courier: so.shipment?.courierName || so.shippingMethod?.name || '-',
        trackingNumber: so.shipment?.trackingNumber || '-',
        paymentStatus: so.order?.payment?.status || '-',
        status: so.status,
        subtotal: Number(so.subtotal),
        shippingCost: Number(so.shippingCost),
        serviceFee: Number(so.serviceFee),
        sellerPayout: Number(so.sellerPayout),
        createdAt: so.createdAt,
      })),
    },
  });
});

module.exports = {
  getAdminReport,
  getSellerReport,
};
