const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { notifyUser } = require('../services/notification.service');

const recalculateRatings = async (productId, sellerId) => {
  const [prodAgg, sellerAgg] = await Promise.all([
    prisma.review.aggregate({
      where: { productId, isVisible: true },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.review.aggregate({
      where: { sellerId, isVisible: true },
      _avg: { rating: true },
    }),
  ]);

  await Promise.all([
    prisma.product.update({
      where: { id: productId },
      data: {
        ratingAvg: Number((prodAgg._avg.rating || 0).toFixed(2)),
        reviewCount: prodAgg._count.id,
      },
    }),
    prisma.sellerProfile.update({
      where: { id: sellerId },
      data: {
        ratingAvg: Number((sellerAgg._avg.rating || 0).toFixed(2)),
      },
    }),
  ]);
};

// GET /api/reviews/product/:productId
const listProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const where = { productId, isVisible: true };
  if (rating) where.rating = parseInt(rating, 10);

  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

// POST /api/reviews (Buyer creates review for delivered/completed order item)
const createReview = asyncHandler(async (req, res) => {
  const { orderItemId, productId, rating, comment, images = [] } = req.body;

  let resolvedProductId = productId;
  let sellerId = null;

  if (orderItemId) {
    const orderItem = await prisma.orderItem.findUnique({
      where: { id: orderItemId },
      include: {
        order: true,
        sellerOrder: true,
        review: true,
      },
    });

    if (!orderItem || orderItem.order.buyerId !== req.user.id) {
      throw new AppError('Item pesanan tidak ditemukan.', 404, 'ORDER_ITEM_NOT_FOUND');
    }

    if (!['DELIVERED', 'COMPLETED'].includes(orderItem.sellerOrder.status)) {
      throw new AppError('Ulasan hanya dapat diberikan setelah pesanan diterima/selesai.', 400, 'ORDER_NOT_COMPLETED');
    }

    if (orderItem.review) {
      throw new AppError('Anda sudah memberikan ulasan untuk item pesanan ini.', 409, 'ALREADY_REVIEWED');
    }

    resolvedProductId = orderItem.productId;
    sellerId = orderItem.sellerOrder.sellerId;
  } else {
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) {
      throw new AppError('Produk tidak ditemukan.', 404, 'PRODUCT_NOT_FOUND');
    }
    // Verify buyer actually purchased and completed this product
    const purchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { buyerId: req.user.id },
        sellerOrder: { status: { in: ['DELIVERED', 'COMPLETED'] } },
      },
    });
    if (!purchased) {
      throw new AppError(
        'Anda harus menyelesaikan pembelian produk ini terlebih dahulu sebelum menulis ulasan.',
        403,
        'PURCHASE_REQUIRED'
      );
    }
    sellerId = prod.sellerId;
  }

  const review = await prisma.review.create({
    data: {
      productId: resolvedProductId,
      sellerId,
      orderItemId: orderItemId || null,
      buyerId: req.user.id,
      rating: parseInt(rating, 10),
      comment: comment || null,
      images: Array.isArray(images) ? images : [],
    },
    include: {
      buyer: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  await recalculateRatings(resolvedProductId, sellerId);

  res.status(201).json({
    success: true,
    message: 'Ulasan Anda berhasil ditambahkan.',
    data: review,
  });
});

// GET /api/reviews/seller (Seller's own store reviews + rating stats)
const listSellerReviews = asyncHandler(async (req, res) => {
  const sellerId = req.user.sellerProfile.id;
  const { filter = 'ALL', rating, page = 1, limit = 15 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));

  const where = { sellerId };
  if (filter === 'UNREPLIED') where.sellerReply = null;
  if (filter === 'REPLIED') where.sellerReply = { not: null };
  if (rating) where.rating = parseInt(rating, 10);

  const [items, total, agg, unrepliedCount, groupedRatings] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          },
        },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { id: true },
    }),
    prisma.review.count({ where: { sellerId, sellerReply: null } }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { sellerId },
      _count: { _all: true },
    }),
  ]);

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of groupedRatings) {
    if (breakdown[row.rating] !== undefined) breakdown[row.rating] = row._count._all;
  }

  res.json({
    success: true,
    data: {
      items,
      summary: {
        averageRating: Number((agg._avg.rating || 0).toFixed(2)),
        totalReviews: agg._count.id || 0,
        unrepliedCount,
        repliedCount: Math.max(0, (agg._count.id || 0) - unrepliedCount),
        breakdown,
      },
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

// PUT /api/reviews/:id/reply (Seller replies to a review on their product)
const replyReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sellerReply } = req.body;

  const review = await prisma.review.findUnique({
    where: { id },
    include: { product: { select: { name: true, slug: true } } },
  });
  if (!review || review.sellerId !== req.user.sellerProfile.id) {
    throw new AppError('Ulasan tidak ditemukan di toko Anda.', 404, 'REVIEW_NOT_FOUND');
  }

  const updated = await prisma.review.update({
    where: { id },
    data: {
      sellerReply,
      sellerRepliedAt: new Date(),
    },
  });

  if (review.buyerId) {
    notifyUser({
      userId: review.buyerId,
      eventType: 'REVIEW_REPLIED',
      title: `Balasan Seller untuk Ulasan ${review.product?.name || 'Produk'}`,
      body: `Toko ${req.user.sellerProfile.storeName} membalas ulasan Anda: "${sellerReply}"`,
      data: { productId: review.productId, reviewId: review.id },
    });
  }

  res.json({
    success: true,
    message: 'Balasan ulasan berhasil disimpan.',
    data: updated,
  });
});

module.exports = {
  listProductReviews,
  listSellerReviews,
  createReview,
  replyReview,
};
