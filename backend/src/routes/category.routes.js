const express = require('express');
const { z } = require('zod');
const categoryController = require('../controllers/category.controller');
const {
  authenticate,
  optionalAuthenticate,
  requireAdminPermission,
} = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

const categorySchema = z.object({
  name: z.string().min(2, 'Nama kategori minimal 2 karakter').max(120),
  icon: z.string().max(80).optional(),
  imageUrl: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', optionalAuthenticate, categoryController.listCategories);
router.get('/:slug', categoryController.getCategoryBySlug);

router.post(
  '/',
  authenticate,
  requireAdminPermission('MANAGE_CATEGORIES'),
  validate(categorySchema),
  categoryController.createCategory
);
router.put(
  '/:id',
  authenticate,
  requireAdminPermission('MANAGE_CATEGORIES'),
  validate(categorySchema.partial()),
  categoryController.updateCategory
);
router.delete(
  '/:id',
  authenticate,
  requireAdminPermission('MANAGE_CATEGORIES'),
  categoryController.deleteCategory
);

module.exports = router;
