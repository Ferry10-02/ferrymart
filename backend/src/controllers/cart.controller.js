const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');

const getOrCreateCart = async (userId) => {
  let cart = await prisma.cart.findUnique({ where: { userId } });
  if (!cart) {
    cart = await prisma.cart.create({ data: { userId } });
  }
  return cart;
};

const computeEffectivePrice = (product, variant) => {
  const now = new Date();
  const useFlash =
    product.isFlashSale &&
    product.flashSalePrice !== null &&
    (!product.flashSaleEndsAt || new Date(product.flashSaleEndsAt) > now);
  const base = useFlash ? Number(product.flashSalePrice) : Number(product.price);
  const adjustment = variant ? Number(variant.priceAdjustment || 0) : 0;
  return Math.max(0, base + adjustment);
};

const formatCartResponse = async (userId) => {
  const cart = await getOrCreateCart(userId);
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          seller: {
            select: {
              id: true,
              storeName: true,
              storeSlug: true,
              city: true,
              verificationStatus: true,
            },
          },
        },
      },
      variant: true,
    },
  });

  // Group items by Seller for Shopee-style multi-seller cart
  const sellerMap = new Map();
  let selectedCount = 0;
  let selectedSubtotal = 0;
  let totalItems = 0;

  for (const item of items) {
    const unitPrice = computeEffectivePrice(item.product, item.variant);
    const availableStock = item.variant ? item.variant.stock : item.product.stock;
    const lineTotal = unitPrice * item.quantity;

    totalItems += item.quantity;
    if (item.isSelected) {
      selectedCount += item.quantity;
      selectedSubtotal += lineTotal;
    }

    const sellerId = item.product.seller.id;
    if (!sellerMap.has(sellerId)) {
      sellerMap.set(sellerId, {
        seller: item.product.seller,
        items: [],
        subtotal: 0,
        totalWeightGrams: 0,
      });
    }

    const group = sellerMap.get(sellerId);
    group.items.push({
      id: item.id,
      productId: item.productId,
      variantId: item.variantId,
      quantity: item.quantity,
      isSelected: item.isSelected,
      unitPrice,
      lineTotal,
      availableStock,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        status: item.product.status,
        weightGrams: item.product.weightGrams,
        imageUrl: item.variant?.imageUrl || item.product.images[0]?.imageUrl || null,
      },
      variant: item.variant
        ? {
            id: item.variant.id,
            name: item.variant.name,
            value: item.variant.value,
            priceAdjustment: Number(item.variant.priceAdjustment),
            stock: item.variant.stock,
          }
        : null,
    });

    if (item.isSelected) {
      group.subtotal += lineTotal;
      group.totalWeightGrams += item.product.weightGrams * item.quantity;
    }
  }

  return {
    cartId: cart.id,
    groups: Array.from(sellerMap.values()),
    summary: {
      totalItems,
      selectedCount,
      selectedSubtotal,
    },
  };
};

// GET /api/cart
const getCart = asyncHandler(async (req, res) => {
  const data = await formatCartResponse(req.user.id);
  res.json({ success: true, data });
});

// POST /api/cart/items
const addToCart = asyncHandler(async (req, res) => {
  const { productId, variantId = null, quantity = 1 } = req.body;
  const qty = Math.max(1, parseInt(quantity, 10));

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { seller: true, variants: { where: { isActive: true } } },
  });

  if (!product || product.status !== 'ACTIVE') {
    throw new AppError('Produk tidak ditemukan atau tidak aktif.', 404, 'PRODUCT_UNAVAILABLE');
  }

  if (product.seller.userId === req.user.id) {
    throw new AppError('Anda tidak dapat membeli produk dari toko Anda sendiri.', 400, 'SELF_PURCHASE_FORBIDDEN');
  }

  let variant = null;
  if (variantId) {
    variant = product.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new AppError('Variasi produk tidak ditemukan.', 404, 'VARIANT_NOT_FOUND');
    }
  } else if (product.variants.length > 0) {
    throw new AppError('Silakan pilih variasi produk terlebih dahulu.', 400, 'VARIANT_REQUIRED');
  }

  const availableStock = variant ? variant.stock : product.stock;
  if (availableStock < qty) {
    throw new AppError(`Stok tidak mencukupi. Sisa stok tersedia: ${availableStock}.`, 400, 'INSUFFICIENT_STOCK');
  }

  const cart = await getOrCreateCart(req.user.id);
  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
      variantId: variantId || null,
    },
  });

  if (existing) {
    const nextQty = existing.quantity + qty;
    if (nextQty > availableStock) {
      throw new AppError(`Maksimal stok yang bisa ditambahkan adalah ${availableStock}.`, 400, 'INSUFFICIENT_STOCK');
    }
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: nextQty, isSelected: true },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        variantId: variantId || null,
        quantity: qty,
        isSelected: true,
      },
    });
  }

  const data = await formatCartResponse(req.user.id);
  res.status(201).json({
    success: true,
    message: 'Produk berhasil ditambahkan ke keranjang.',
    data,
  });
});

// PUT /api/cart/items/:itemId
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity, isSelected } = req.body;

  const cart = await getOrCreateCart(req.user.id);
  const item = await prisma.cartItem.findUnique({
    where: { id: itemId },
    include: { product: true, variant: true },
  });

  if (!item || item.cartId !== cart.id) {
    throw new AppError('Item keranjang tidak ditemukan.', 404, 'CART_ITEM_NOT_FOUND');
  }

  const updateData = {};
  if (quantity !== undefined) {
    const qty = parseInt(quantity, 10);
    if (qty < 1) {
      throw new AppError('Jumlah minimal 1.', 400, 'INVALID_QUANTITY');
    }
    const availableStock = item.variant ? item.variant.stock : item.product.stock;
    if (qty > availableStock) {
      throw new AppError(`Stok tersedia hanya ${availableStock}.`, 400, 'INSUFFICIENT_STOCK');
    }
    updateData.quantity = qty;
  }

  if (isSelected !== undefined) {
    updateData.isSelected = Boolean(isSelected);
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: updateData,
  });

  const data = await formatCartResponse(req.user.id);
  res.json({ success: true, message: 'Keranjang diperbarui.', data });
});

// DELETE /api/cart/items/:itemId
const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const cart = await getOrCreateCart(req.user.id);

  const item = await prisma.cartItem.findUnique({ where: { id: itemId } });
  if (!item || item.cartId !== cart.id) {
    throw new AppError('Item keranjang tidak ditemukan.', 404, 'CART_ITEM_NOT_FOUND');
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  const data = await formatCartResponse(req.user.id);
  res.json({ success: true, message: 'Produk dihapus dari keranjang.', data });
});

// DELETE /api/cart
const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user.id);
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  const data = await formatCartResponse(req.user.id);
  res.json({ success: true, message: 'Keranjang dikosongkan.', data });
});

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  computeEffectivePrice,
};
