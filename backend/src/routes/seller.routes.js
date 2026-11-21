const express = require('express');
const { z } = require('zod');
const sellerController = require('../controllers/seller.controller');
const adminExtraController = require('../controllers/adminExtra.controller');
const { authenticate, requireRole, requireSellerProfile } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadImage } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// Public storefront route
router.get('/store/:slug', sellerController.getPublicStore);

// Protected Seller-only routes
const sellerGuard = [authenticate, requireRole('SELLER'), requireSellerProfile];

const productSchema = z.object({
  categoryId: z.string().uuid('Pilih kategori yang valid'),
  name: z.string().min(3, 'Nama produk minimal 3 karakter').max(220),
  sku: z.string().max(100).optional().nullable(),
  description: z.string().min(10, 'Deskripsi produk minimal 10 karakter'),
  price: z.coerce.number().min(100, 'Harga minimal Rp 100'),
  compareAtPrice: z.coerce.number().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).default(0),
  weightGrams: z.coerce.number().int().min(1).default(500),
  condition: z.enum(['NEW', 'USED']).optional().default('NEW'),
  status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).optional().default('ACTIVE'),
  isFlashSale: z.boolean().optional().default(false),
  flashSalePrice: z.coerce.number().min(0).optional().nullable(),
  flashSaleEndsAt: z.string().optional().nullable(),
  images: z.array(z.union([z.string(), z.object({ imageUrl: z.string(), altText: z.string().optional() })])).optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        value: z.string().min(1).max(100),
        sku: z.string().max(100).optional().nullable(),
        priceAdjustment: z.coerce.number().optional().default(0),
        stock: z.coerce.number().int().min(0).default(0),
        imageUrl: z.string().optional().nullable(),
      })
    )
    .optional(),
});

router.get('/dashboard', ...sellerGuard, sellerController.getSellerDashboard);
router.get('/settings', ...sellerGuard, sellerController.getStoreSettings);
router.put('/settings', ...sellerGuard, sellerController.updateStoreSettings);
router.post('/telegram/detect', ...sellerGuard, sellerController.detectSellerTelegram);
router.post('/telegram/test', ...sellerGuard, sellerController.testSellerTelegram);
router.post('/media', ...sellerGuard, uploadLimiter, uploadImage.single('file'), sellerController.uploadStoreMedia);

router.get('/products', ...sellerGuard, sellerController.listSellerProducts);
router.post('/products', ...sellerGuard, validate(productSchema), sellerController.createSellerProduct);
router.put('/products/:id', ...sellerGuard, validate(productSchema.partial()), sellerController.updateSellerProduct);
router.delete('/products/:id', ...sellerGuard, sellerController.deleteSellerProduct);
router.post(
  '/products/upload-images',
  ...sellerGuard,
  uploadLimiter,
  uploadImage.array('images', 8),
  sellerController.uploadProductImages
);
router.get('/products/:id/qr', ...sellerGuard, sellerController.getSellerProductQr);

router.get('/orders', ...sellerGuard, sellerController.listSellerOrders);
router.put('/orders/:id/status', ...sellerGuard, sellerController.updateSellerOrderStatus);
router.get('/transactions', ...sellerGuard, sellerController.listSellerTransactions);
router.get('/payouts', ...sellerGuard, adminExtraController.getSellerPayouts);
router.post('/payouts', ...sellerGuard, adminExtraController.requestSellerPayout);

module.exports = router;
