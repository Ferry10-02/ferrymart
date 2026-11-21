const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { generateOrderNumber, generateSubOrderNumber, formatIDR } = require('../utils/sanitize');
const { computeEffectivePrice } = require('./cart.controller');
const { notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');
const { getCache, setCache } = require('../utils/cache');

const getServiceFeeConfig = async () => {
  const cached = getCache('settings:service_fee');
  if (cached) return cached;
  const setting = await prisma.platformSetting.findUnique({ where: { key: 'service_fee' } });
  const val = {
    buyerFeeFlat: Number(setting?.value?.buyer_fee_flat ?? 2000),
    sellerCommissionPercent: Number(setting?.value?.seller_commission_percent ?? 2.5),
  };
  setCache('settings:service_fee', val, 60000);
  return val;
};

const getManualPaymentMethods = async () => {
  const cached = getCache('settings:manual_payment_methods');
  if (cached) return cached;
  const setting = await prisma.platformSetting.findUnique({ where: { key: 'manual_payment_methods' } });
  const methods = Array.isArray(setting?.value) ? setting.value : [];
  const active = methods.filter((m) => m.is_active !== false);
  setCache('settings:manual_payment_methods', active, 60000);
  return active;
};

const calculateShippingCost = (shippingMethod, totalWeightGrams) => {
  const weightKg = Math.max(1, Math.ceil(totalWeightGrams / 1000));
  const base = Number(shippingMethod.baseCost || 0);
  const perKg = Number(shippingMethod.costPerKg || 0);
  return base + Math.max(0, weightKg - 1) * perKg;
};

const validateCoupon = async (couponCode, subtotal) => {
  if (!couponCode) return { coupon: null, discountAmount: 0 };
  const code = couponCode.trim().toUpperCase();
  const now = new Date();

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon || !coupon.isActive) {
    throw new AppError('Kode kupon tidak ditemukan atau tidak aktif.', 400, 'INVALID_COUPON');
  }
  if (coupon.startsAt && new Date(coupon.startsAt) > now) {
    throw new AppError('Kupon belum berlaku.', 400, 'COUPON_NOT_STARTED');
  }
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
    throw new AppError('Kupon sudah kedaluwarsa.', 400, 'COUPON_EXPIRED');
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw new AppError('Kuota penggunaan kupon telah habis.', 400, 'COUPON_LIMIT_REACHED');
  }
  if (subtotal < Number(coupon.minPurchase)) {
    throw new AppError(
      `Minimal belanja untuk kupon ini adalah ${formatIDR(coupon.minPurchase)}.`,
      400,
      'COUPON_MIN_PURCHASE'
    );
  }

  let discountAmount = 0;
  if (coupon.discountType === 'PERCENTAGE') {
    discountAmount = Math.round((subtotal * Number(coupon.discountValue)) / 100);
    if (coupon.maxDiscount !== null) {
      discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    }
  } else {
    discountAmount = Number(coupon.discountValue);
  }

  discountAmount = Math.min(discountAmount, subtotal);
  return { coupon, discountAmount };
};

const getAvailableCoupons = async () => {
  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
      ],
    },
    orderBy: { discountValue: 'desc' },
    take: 10,
  });
  return coupons
    .filter((c) => c.usageLimit === null || c.usedCount < c.usageLimit)
    .map((c) => ({
      id: c.id,
      code: c.code,
      description: c.description,
      discountType: c.discountType,
      discountValue: Number(c.discountValue),
      minPurchase: Number(c.minPurchase || 0),
      maxDiscount: c.maxDiscount !== null ? Number(c.maxDiscount) : null,
      expiresAt: c.expiresAt,
      remainingQuota: c.usageLimit !== null ? Math.max(0, c.usageLimit - c.usedCount) : null,
    }));
};

// GET /api/checkout/coupons - List active claimable vouchers
const listAvailableCoupons = asyncHandler(async (req, res) => {
  const coupons = await getAvailableCoupons();
  res.json({ success: true, data: coupons });
});

// GET /api/checkout/options - Preview checkout options (addresses, shipping methods, payment methods, selected items)
const getCheckoutOptions = asyncHandler(async (req, res) => {
  const [addresses, shippingMethods, paymentMethods, serviceFeeCfg, availableCoupons, cart] = await Promise.all([
    prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.shippingMethod.findMany({
      where: { isActive: true },
      orderBy: { baseCost: 'asc' },
    }),
    getManualPaymentMethods(),
    getServiceFeeConfig(),
    getAvailableCoupons(),
    prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: {
          where: { isSelected: true },
          include: {
            product: {
              include: {
                images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
                seller: {
                  select: { id: true, storeName: true, storeSlug: true, city: true, verificationStatus: true },
                },
              },
            },
            variant: true,
          },
        },
      },
    }),
  ]);

  const items = cart?.items || [];
  const sellerMap = new Map();
  let subtotal = 0;

  for (const item of items) {
    const unitPrice = computeEffectivePrice(item.product, item.variant);
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;

    const sid = item.product.seller.id;
    if (!sellerMap.has(sid)) {
      sellerMap.set(sid, {
        seller: item.product.seller,
        items: [],
        subtotal: 0,
        totalWeightGrams: 0,
      });
    }
    const group = sellerMap.get(sid);
    group.items.push({
      cartItemId: item.id,
      productId: item.productId,
      variantId: item.variantId,
      name: item.product.name,
      slug: item.product.slug,
      imageUrl: item.variant?.imageUrl || item.product.images[0]?.imageUrl || null,
      variantLabel: item.variant ? `${item.variant.name}: ${item.variant.value}` : null,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
      weightGrams: item.product.weightGrams,
    });
    group.subtotal += lineTotal;
    group.totalWeightGrams += item.product.weightGrams * item.quantity;
  }

  res.json({
    success: true,
    data: {
      addresses,
      shippingMethods,
      paymentMethods,
      serviceFeeConfig: serviceFeeCfg,
      availableCoupons,
      sellerGroups: Array.from(sellerMap.values()),
      subtotal,
    },
  });
});

// POST /api/checkout/validate-coupon
const checkCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const result = await validateCoupon(code, Number(subtotal || 0));
  res.json({
    success: true,
    message: 'Kupon valid dan dapat digunakan.',
    data: {
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: Number(result.coupon.discountValue),
      discountAmount: result.discountAmount,
    },
  });
});

// POST /api/checkout - Create Master Order + Split Seller Orders + Manual Payment
const processCheckout = asyncHandler(async (req, res) => {
  const {
    addressId,
    paymentMethodCode,
    sellerShipping = {}, // { [sellerId]: shippingMethodId }
    sellerNotes = {}, // { [sellerId]: "note" }
    couponCode,
    notes,
  } = req.body;

  // 1. Validate buyer address ownership
  const address = await prisma.address.findUnique({ where: { id: addressId } });
  if (!address || address.userId !== req.user.id) {
    throw new AppError('Alamat pengiriman tidak valid.', 400, 'INVALID_ADDRESS');
  }

  // 2. Validate active manual payment method configured by Admin
  const paymentMethods = await getManualPaymentMethods();
  const chosenPayment = paymentMethods.find((m) => m.code === paymentMethodCode);
  if (!chosenPayment) {
    throw new AppError('Metode pembayaran manual tidak ditemukan atau tidak aktif.', 400, 'INVALID_PAYMENT_METHOD');
  }

  // 3. Load selected cart items
  const cart = await prisma.cart.findUnique({
    where: { userId: req.user.id },
    include: {
      items: {
        where: { isSelected: true },
        include: {
          product: {
            include: {
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
              seller: true,
            },
          },
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new AppError('Tidak ada produk yang dipilih di keranjang untuk checkout.', 400, 'EMPTY_CHECKOUT');
  }

  // 4. Load shipping methods & service fee config
  const [shippingMethods, serviceFeeCfg] = await Promise.all([
    prisma.shippingMethod.findMany({ where: { isActive: true } }),
    getServiceFeeConfig(),
  ]);
  const shippingMap = new Map(shippingMethods.map((s) => [s.id, s]));
  const defaultShipping = shippingMethods[0];
  if (!defaultShipping) {
    throw new AppError('Belum ada metode pengiriman aktif.', 500, 'NO_SHIPPING_METHOD');
  }

  // 5. Group items by seller & validate stock
  const sellerGroups = new Map();
  let totalSubtotal = 0;

  for (const item of cart.items) {
    if (item.product.status !== 'ACTIVE') {
      throw new AppError(`Produk "${item.product.name}" sudah tidak aktif.`, 400, 'PRODUCT_UNAVAILABLE');
    }
    const availableStock = item.variant ? item.variant.stock : item.product.stock;
    if (availableStock < item.quantity) {
      throw new AppError(
        `Stok "${item.product.name}" tidak mencukupi (tersisa ${availableStock}).`,
        400,
        'INSUFFICIENT_STOCK'
      );
    }

    const unitPrice = computeEffectivePrice(item.product, item.variant);
    const lineTotal = unitPrice * item.quantity;
    totalSubtotal += lineTotal;

    const sid = item.product.sellerId;
    if (!sellerGroups.has(sid)) {
      const requestedShipId = sellerShipping[sid];
      const shippingMethod = shippingMap.get(requestedShipId) || defaultShipping;
      sellerGroups.set(sid, {
        seller: item.product.seller,
        shippingMethod,
        buyerNote: sellerNotes[sid] || null,
        items: [],
        subtotal: 0,
        totalWeightGrams: 0,
      });
    }

    const grp = sellerGroups.get(sid);
    grp.items.push({
      cartItemId: item.id,
      product: item.product,
      variant: item.variant,
      unitPrice,
      quantity: item.quantity,
      lineTotal,
    });
    grp.subtotal += lineTotal;
    grp.totalWeightGrams += item.product.weightGrams * item.quantity;
  }

  // 6. Validate coupon if provided
  const { coupon, discountAmount } = await validateCoupon(couponCode, totalSubtotal);

  // 7. Compute totals per seller & grand total
  let shippingTotal = 0;
  for (const grp of sellerGroups.values()) {
    grp.shippingCost = calculateShippingCost(grp.shippingMethod, grp.totalWeightGrams);
    grp.commissionFee = Math.round((grp.subtotal * serviceFeeCfg.sellerCommissionPercent) / 100);
    grp.sellerPayout = Math.max(0, grp.subtotal + grp.shippingCost - grp.commissionFee);
    shippingTotal += grp.shippingCost;
  }

  const buyerServiceFee = serviceFeeCfg.buyerFeeFlat;
  const grandTotal = Math.max(0, totalSubtotal + shippingTotal + buyerServiceFee - discountAmount);

  // 8. Execute Atomic Transaction
  const createdOrder = await prisma.$transaction(async (tx) => {
    // Re-verify & atomically deduct stock
    for (const grp of sellerGroups.values()) {
      for (const line of grp.items) {
        if (line.variant) {
          const updatedVar = await tx.productVariant.updateMany({
            where: { id: line.variant.id, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updatedVar.count === 0) {
            throw new AppError(`Stok variasi untuk "${line.product.name}" baru saja habis.`, 409, 'STOCK_CONFLICT');
          }
        }
        const updatedProd = await tx.product.updateMany({
          where: { id: line.product.id, stock: { gte: line.quantity } },
          data: { stock: { decrement: line.quantity } },
        });
        if (updatedProd.count === 0) {
          throw new AppError(`Stok produk "${line.product.name}" tidak mencukupi.`, 409, 'STOCK_CONFLICT');
        }
      }
    }

    if (coupon) {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    const orderNumber = generateOrderNumber();
    const order = await tx.order.create({
      data: {
        orderNumber,
        buyerId: req.user.id,
        addressId: address.id,
        shippingAddressSnapshot: {
          label: address.label,
          recipientName: address.recipientName,
          phone: address.phone,
          addressLine: address.addressLine,
          district: address.district,
          city: address.city,
          province: address.province,
          postalCode: address.postalCode,
        },
        couponId: coupon ? coupon.id : null,
        subtotal: totalSubtotal,
        shippingTotal,
        serviceFee: buyerServiceFee,
        discountTotal: discountAmount,
        grandTotal,
        status: 'PENDING_PAYMENT',
        notes: notes || null,
      },
    });

    // Split into SellerOrder per Seller
    for (const grp of sellerGroups.values()) {
      const sellerOrder = await tx.sellerOrder.create({
        data: {
          orderId: order.id,
          sellerId: grp.seller.id,
          subOrderNumber: generateSubOrderNumber(),
          shippingMethodId: grp.shippingMethod.id,
          subtotal: grp.subtotal,
          shippingCost: grp.shippingCost,
          serviceFee: grp.commissionFee,
          sellerPayout: grp.sellerPayout,
          status: 'PENDING_PAYMENT',
          buyerNote: grp.buyerNote,
        },
      });

      await tx.orderItem.createMany({
        data: grp.items.map((line) => ({
          orderId: order.id,
          sellerOrderId: sellerOrder.id,
          productId: line.product.id,
          variantId: line.variant ? line.variant.id : null,
          productNameSnapshot: line.product.name,
          variantNameSnapshot: line.variant ? `${line.variant.name}: ${line.variant.value}` : null,
          productImageSnapshot:
            line.variant?.imageUrl || line.product.images[0]?.imageUrl || null,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          totalPrice: line.lineTotal,
        })),
      });
    }

    // Create Manual Payment record (24-hour payment window)
    const destinationText = `${chosenPayment.account_number} a.n. ${chosenPayment.account_holder}`;
    await tx.payment.create({
      data: {
        orderId: order.id,
        paymentMethodCode: chosenPayment.code,
        paymentMethodName: chosenPayment.name,
        paymentDestination: destinationText,
        amount: grandTotal,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Remove checked-out items from cart
    await tx.cartItem.deleteMany({
      where: { id: { in: cart.items.map((i) => i.id) } },
    });

    return order.id;
  }, { maxWait: 15000, timeout: 30000 });

  // Fetch full order summary outside the transaction to minimize lock duration
  const createdOrderFull = await prisma.order.findUnique({
    where: { id: createdOrder },
    include: {
      payment: true,
      sellerOrders: {
        include: {
          seller: { select: { id: true, userId: true, storeName: true, storeSlug: true } },
          shippingMethod: true,
          items: true,
        },
      },
    },
  });

  // 9. Dispatch Notifications (Buyer, Sellers, and Admin external channels)
  notifyUser({
    userId: req.user.id,
    eventType: NOTIFICATION_EVENTS.ORDER_CREATED,
    title: `Pesanan ${createdOrderFull.orderNumber} Berhasil Dibuat`,
    body: `Total tagihan ${formatIDR(createdOrderFull.grandTotal)}. Silakan lakukan transfer manual ke ${createdOrderFull.payment.paymentMethodName} (${createdOrderFull.payment.paymentDestination}) dan unggah bukti pembayaran.`,
    data: { orderId: createdOrderFull.id, orderNumber: createdOrderFull.orderNumber },
    notifyAdminExternal: true,
  });

  for (const so of createdOrderFull.sellerOrders) {
    notifyUser({
      userId: so.seller.userId,
      eventType: NOTIFICATION_EVENTS.ORDER_CREATED,
      title: `Pesanan Baru Masuk (${so.subOrderNumber})`,
      body: `Ada pesanan baru senilai ${formatIDR(so.subtotal)} di toko ${so.seller.storeName}. Menunggu pembayaran pembeli dan verifikasi Admin.`,
      data: { sellerOrderId: so.id, subOrderNumber: so.subOrderNumber },
    });
  }

  res.status(201).json({
    success: true,
    message:
      'Checkout berhasil! Pesanan telah dipisahkan per seller. Silakan transfer manual dan unggah bukti pembayaran.',
    data: createdOrderFull,
  });
});

module.exports = {
  listAvailableCoupons,
  getCheckoutOptions,
  checkCoupon,
  processCheckout,
  getManualPaymentMethods,
};
