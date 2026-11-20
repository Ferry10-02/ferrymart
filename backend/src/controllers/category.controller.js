const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { slugify } = require('../utils/sanitize');
const { logAdminActivity } = require('../utils/auditLog');
const { getCache, setCache, invalidateCachePrefix } = require('../utils/cache');

// GET /api/categories
const listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.roles?.includes('ADMIN');
  const cacheKey = `categories:list:${includeInactive ? 'all' : 'active'}`;
  const cached = getCache(cacheKey);
  if (cached) {
    return res.json({ success: true, data: cached });
  }

  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { products: { where: { status: 'ACTIVE' } } },
      },
    },
  });

  setCache(cacheKey, categories, 60000);
  res.json({ success: true, data: categories });
});

// GET /api/categories/:slug
const getCategoryBySlug = asyncHandler(async (req, res) => {
  const category = await prisma.category.findUnique({
    where: { slug: req.params.slug },
    include: {
      children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      _count: { select: { products: { where: { status: 'ACTIVE' } } } },
    },
  });

  if (!category) {
    throw new AppError('Kategori tidak ditemukan.', 404, 'CATEGORY_NOT_FOUND');
  }

  res.json({ success: true, data: category });
});

// POST /api/categories (Admin)
const createCategory = asyncHandler(async (req, res) => {
  const { name, icon, imageUrl, description, parentId, sortOrder, isActive } = req.body;
  const slug = slugify(name);

  const existing = await prisma.category.findUnique({ where: { slug } });
  const finalSlug = existing ? slugify(name, true) : slug;

  const category = await prisma.category.create({
    data: {
      name,
      slug: finalSlug,
      icon: icon || 'Tag',
      imageUrl: imageUrl || null,
      description: description || null,
      parentId: parentId || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
    },
  });

  invalidateCachePrefix('categories:');
  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'CREATE_CATEGORY', 'CATEGORY', category.id, { name });

  res.status(201).json({
    success: true,
    message: 'Kategori berhasil dibuat.',
    data: category,
  });
});

// PUT /api/categories/:id (Admin)
const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, icon, imageUrl, description, parentId, sortOrder, isActive } = req.body;

  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('Kategori tidak ditemukan.', 404, 'CATEGORY_NOT_FOUND');
  }

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(imageUrl !== undefined ? { imageUrl } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(parentId !== undefined ? { parentId: parentId || null } : {}),
      ...(sortOrder !== undefined ? { sortOrder: Number(sortOrder) } : {}),
      ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
    },
  });

  invalidateCachePrefix('categories:');
  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'UPDATE_CATEGORY', 'CATEGORY', id, { name: updated.name });

  res.json({
    success: true,
    message: 'Kategori berhasil diperbarui.',
    data: updated,
  });
});

// DELETE /api/categories/:id (Admin)
const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) {
    throw new AppError(
      `Kategori tidak dapat dihapus karena masih memiliki ${count} produk. Nonaktifkan kategori sebagai gantinya.`,
      400,
      'CATEGORY_IN_USE'
    );
  }

  await prisma.category.delete({ where: { id } });
  invalidateCachePrefix('categories:');
  invalidateCachePrefix('products:');
  await logAdminActivity(req, 'DELETE_CATEGORY', 'CATEGORY', id, {});

  res.json({ success: true, message: 'Kategori berhasil dihapus.' });
});

module.exports = {
  listCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
