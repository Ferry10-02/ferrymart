const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { generateProductQr } = require('../services/qr.service');
const { notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');
const { getCache, setCache } = require('../utils/cache');

const productListInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 2 },
  category: { select: { id: true, name: true, slug: true } },
  seller: {
    select: {
      id: true,
      storeName: true,
      storeSlug: true,
      city: true,
      province: true,
      verificationStatus: true,
      ratingAvg: true,
    },
  },
};

// GET /api/products/home - Aggregated marketplace home payload (cached 30s)
const getHomeData = asyncHandler(async (req, res) => {
  if (req.query.refresh !== 'true') {
    const cached = getCache('products:home');
    if (cached) return res.json({ success: true, data: cached });
  }

  const now = new Date();
  const activeWhere = {
    status: 'ACTIVE',
    seller: { verificationStatus: { not: 'SUSPENDED' } },
  };

  // Fetch in 4 parallel queries instead of 8+ nested product queries (cuts remote roundtrips by ~80%)
  const [banners, categories, allActiveProducts, siteSettings] = await Promise.all([
    prisma.banner.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.product.findMany({
      where: activeWhere,
      include: productListInclude,
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.platformSetting.findMany({
      where: { isPublic: true },
      select: { key: true, value: true },
    }),
  ]);

  const flashSale = allActiveProducts
    .filter((p) => p.isFlashSale && (!p.flashSaleEndsAt || new Date(p.flashSaleEndsAt) > now))
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0))
    .slice(0, 12);

  const bestSelling = [...allActiveProducts]
    .sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0) || Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0))
    .slice(0, 12);

  const newest = allActiveProducts.slice(0, 12);

  const discounted = allActiveProducts
    .filter((p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price))
    .slice(0, 12);

  const recommended = [...allActiveProducts]
    .sort(
      (a, b) =>
        Number(b.isFeatured) - Number(a.isFeatured) ||
        Number(b.ratingAvg || 0) - Number(a.ratingAvg || 0) ||
        (b.viewCount || 0) - (a.viewCount || 0)
    )
    .slice(0, 18);

  const payload = {
    banners,
    categories,
    flashSale,
    bestSelling,
    newest,
    discounted,
    recommended,
    settings: Object.fromEntries(siteSettings.map((s) => [s.key, s.value])),
  };

  setCache('products:home', payload, 30000);

  res.json({
    success: true,
    data: payload,
  });
});

// GET /api/products
const listProducts = asyncHandler(async (req, res) => {
  const listCacheKey = `products:list:${JSON.stringify(req.query)}`;
  const cachedList = getCache(listCacheKey);
  if (cachedList) {
    return res.json({ success: true, data: cachedList });
  }
  const {
    q,
    category,
    sellerSlug,
    minPrice,
    maxPrice,
    minRating,
    flashSale,
    discounted,
    condition,
    sort = 'recommended',
    page = 1,
    limit = 20,
  } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 20));

  const where = {
    status: 'ACTIVE',
    seller: { verificationStatus: { not: 'SUSPENDED' } },
  };

  if (q && q.trim()) {
    where.OR = [
      { name: { contains: q.trim(), mode: 'insensitive' } },
      { description: { contains: q.trim(), mode: 'insensitive' } },
      { seller: { storeName: { contains: q.trim(), mode: 'insensitive' } } },
    ];
  }

  if (category) {
    where.category = { OR: [{ slug: category }, { id: category.length === 36 ? category : undefined }] };
  }

  if (sellerSlug) {
    where.seller = { ...where.seller, storeSlug: sellerSlug };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = Number(minPrice);
    if (maxPrice) where.price.lte = Number(maxPrice);
  }

  if (minRating) {
    where.ratingAvg = { gte: Number(minRating) };
  }

  if (flashSale === 'true') {
    where.isFlashSale = true;
  }

  if (discounted === 'true') {
    where.compareAtPrice = { not: null };
  }

  if (condition && ['NEW', 'USED'].includes(condition.toUpperCase())) {
    where.condition = condition.toUpperCase();
  }

  let orderBy = [{ isFeatured: 'desc' }, { soldCount: 'desc' }, { createdAt: 'desc' }];
  switch (sort) {
    case 'newest':
      orderBy = [{ createdAt: 'desc' }];
      break;
    case 'bestselling':
      orderBy = [{ soldCount: 'desc' }, { ratingAvg: 'desc' }];
      break;
    case 'price_asc':
      orderBy = [{ price: 'asc' }];
      break;
    case 'price_desc':
      orderBy = [{ price: 'desc' }];
      break;
    case 'rating':
      orderBy = [{ ratingAvg: 'desc' }, { reviewCount: 'desc' }];
      break;
    default:
      break;
  }

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productListInclude,
      orderBy,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.product.count({ where }),
  ]);

  const resultData = {
    items,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
    },
  };

  setCache(listCacheKey, resultData, 20000);

  res.json({
    success: true,
    data: resultData,
  });
});

// GET /api/products/:slugOrId
const getProductDetail = asyncHandler(async (req, res) => {
  const { slugOrId } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  const product = await prisma.product.findFirst({
    where: isUuid ? { id: slugOrId } : { slug: slugOrId },
    include: {
      images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }] },
      variants: { where: { isActive: true }, orderBy: [{ name: 'asc' }, { value: 'asc' }] },
      category: true,
      seller: {
        include: {
          user: { select: { id: true, fullName: true, avatarUrl: true } },
          _count: { select: { products: { where: { status: 'ACTIVE' } } } },
        },
      },
      reviews: {
        where: { isVisible: true },
        orderBy: { createdAt: 'desc' },
        take: 15,
        include: {
          buyer: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
    },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan.', 404, 'PRODUCT_NOT_FOUND');
  }

  const isOwner = req.user?.sellerProfile?.id === product.sellerId;
  const isAdmin = req.user?.roles?.includes('ADMIN');

  if (product.status !== 'ACTIVE' && !isOwner && !isAdmin) {
    throw new AppError('Produk tidak tersedia.', 404, 'PRODUCT_UNAVAILABLE');
  }

  // Increment view count asynchronously
  prisma.product
    .update({ where: { id: product.id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {});

  // Check if wishlisted by current user
  let isWishlisted = false;
  if (req.user) {
    const wish = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId: req.user.id, productId: product.id } },
    });
    isWishlisted = Boolean(wish);
  }

  const [related, qr] = await Promise.all([
    prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id: { not: product.id },
        status: 'ACTIVE',
      },
      include: productListInclude,
      take: 6,
      orderBy: { soldCount: 'desc' },
    }),
    generateProductQr(product),
  ]);

  // Trigger realtime & WhatsApp/Telegram notification when product is opened via QR scan (?src=qr)
  let qrScanNotified = false;
  if (req.query.src === 'qr') {
    qrScanNotified = true;
    const scannerLabel = req.user ? `${req.user.fullName} (${req.user.email})` : 'Pengunjung (Belum Login)';
    if (product.seller?.userId) {
      notifyUser({
        userId: product.seller.userId,
        eventType: NOTIFICATION_EVENTS.QR_SCANNED,
        title: `QR Produk Dipindai: ${product.name}`,
        body: `${scannerLabel} baru saja memindai QR Code produk "${product.name}" dari toko ${product.seller.storeName}.`,
        data: { productId: product.id, slug: product.slug, source: 'QR_PRODUCT' },
        notifyAdminExternal: true,
      });
    }
    if (req.user && req.user.id !== product.seller?.userId) {
      notifyUser({
        userId: req.user.id,
        eventType: NOTIFICATION_EVENTS.QR_SCANNED,
        title: `QR Produk Terverifikasi: ${product.name}`,
        body: `Anda berhasil memindai QR produk "${product.name}" dari toko ${product.seller?.storeName || 'FerryMarket'}.`,
        data: { productId: product.id, slug: product.slug, source: 'QR_PRODUCT' },
      });
    }
  }

  res.json({
    success: true,
    data: {
      product,
      isWishlisted,
      related,
      qr,
      qrScanNotified,
    },
  });
});

// GET /api/products/:slugOrId/qr
const getProductQr = asyncHandler(async (req, res) => {
  const { slugOrId } = req.params;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slugOrId);

  const product = await prisma.product.findFirst({
    where: isUuid ? { id: slugOrId } : { slug: slugOrId },
    select: { id: true, name: true, slug: true, price: true, status: true, sellerId: true },
  });

  if (!product) {
    throw new AppError('Produk tidak ditemukan.', 404, 'PRODUCT_NOT_FOUND');
  }

  const qr = await generateProductQr(product);
  res.json({ success: true, data: { product, ...qr } });
});

module.exports = {
  getHomeData,
  listProducts,
  getProductDetail,
  getProductQr,
};
