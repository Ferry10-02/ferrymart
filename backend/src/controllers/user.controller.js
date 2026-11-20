const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { uploadFile } = require('../services/storage.service');
const { loadUserContext } = require('../middleware/auth.middleware');

// GET /api/users/profile
const getProfile = asyncHandler(async (req, res) => {
  const user = await loadUserContext(req.user.id, { bypassCache: true });
  res.json({ success: true, data: user });
});

// PUT /api/users/profile
const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, telegramChatId } = req.body;

  await prisma.profile.update({
    where: { id: req.user.id },
    data: {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(phone !== undefined ? { phone: phone || null } : {}),
      ...(telegramChatId !== undefined ? { telegramChatId: telegramChatId || null } : {}),
    },
  });

  const user = await loadUserContext(req.user.id, { bypassCache: true });
  res.json({
    success: true,
    message: 'Profil berhasil diperbarui.',
    data: user,
  });
});

// POST /api/users/avatar
const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('File foto profil wajib diunggah.', 400, 'FILE_REQUIRED');
  }

  const uploaded = await uploadFile(req.file, 'avatars');
  await prisma.profile.update({
    where: { id: req.user.id },
    data: { avatarUrl: uploaded.url },
  });

  const user = await loadUserContext(req.user.id, { bypassCache: true });
  res.json({
    success: true,
    message: 'Foto profil berhasil diperbarui.',
    data: { avatarUrl: uploaded.url, user },
  });
});

// GET /api/users/addresses
const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });
  res.json({ success: true, data: addresses });
});

// POST /api/users/addresses
const createAddress = asyncHandler(async (req, res) => {
  const { label, recipientName, phone, addressLine, district, city, province, postalCode, isDefault } =
    req.body;

  const existingCount = await prisma.address.count({ where: { userId: req.user.id } });
  const shouldBeDefault = Boolean(isDefault) || existingCount === 0;

  const address = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId: req.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId: req.user.id,
        label: label || 'Rumah',
        recipientName,
        phone,
        addressLine,
        district: district || null,
        city,
        province,
        postalCode,
        isDefault: shouldBeDefault,
      },
    });
  });

  res.status(201).json({
    success: true,
    message: 'Alamat berhasil ditambahkan.',
    data: address,
  });
});

// PUT /api/users/addresses/:id
const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.address.findUnique({ where: { id } });

  if (!existing || existing.userId !== req.user.id) {
    throw new AppError('Alamat tidak ditemukan.', 404, 'ADDRESS_NOT_FOUND');
  }

  const { label, recipientName, phone, addressLine, district, city, province, postalCode, isDefault } =
    req.body;

  const updated = await prisma.$transaction(async (tx) => {
    if (isDefault === true) {
      await tx.address.updateMany({
        where: { userId: req.user.id, id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id },
      data: {
        ...(label !== undefined ? { label } : {}),
        ...(recipientName !== undefined ? { recipientName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(addressLine !== undefined ? { addressLine } : {}),
        ...(district !== undefined ? { district } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(province !== undefined ? { province } : {}),
        ...(postalCode !== undefined ? { postalCode } : {}),
        ...(isDefault !== undefined ? { isDefault } : {}),
      },
    });
  });

  res.json({
    success: true,
    message: 'Alamat berhasil diperbarui.',
    data: updated,
  });
});

// DELETE /api/users/addresses/:id
const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.address.findUnique({ where: { id } });

  if (!existing || existing.userId !== req.user.id) {
    throw new AppError('Alamat tidak ditemukan.', 404, 'ADDRESS_NOT_FOUND');
  }

  await prisma.address.delete({ where: { id } });
  res.json({ success: true, message: 'Alamat berhasil dihapus.' });
});

// GET /api/users/wishlists
const getWishlists = asyncHandler(async (req, res) => {
  const wishlists = await prisma.wishlist.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      product: {
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          seller: { select: { id: true, storeName: true, storeSlug: true, city: true, verificationStatus: true } },
          category: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  res.json({ success: true, data: wishlists });
});

// POST /api/users/wishlists/toggle
const toggleWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError('Produk tidak ditemukan.', 404, 'PRODUCT_NOT_FOUND');
  }

  const existing = await prisma.wishlist.findUnique({
    where: { userId_productId: { userId: req.user.id, productId } },
  });

  if (existing) {
    await prisma.wishlist.delete({ where: { id: existing.id } });
    return res.json({
      success: true,
      message: 'Produk dihapus dari favorit.',
      data: { isWishlisted: false, productId },
    });
  }

  await prisma.wishlist.create({
    data: { userId: req.user.id, productId },
  });

  res.status(201).json({
    success: true,
    message: 'Produk ditambahkan ke favorit.',
    data: { isWishlisted: true, productId },
  });
});

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  getWishlists,
  toggleWishlist,
};
