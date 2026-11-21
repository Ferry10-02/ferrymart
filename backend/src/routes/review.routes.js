const express = require('express');
const { z } = require('zod');
const reviewController = require('../controllers/review.controller');
const { authenticate, requireRole, requireSellerProfile } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

const createReviewSchema = z.object({
  orderItemId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid('productId tidak valid'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(2000).optional().nullable(),
  images: z.array(z.string()).optional(),
});

const replySchema = z.object({
  sellerReply: z.string().min(2, 'Balasan minimal 2 karakter').max(1500),
});

router.get('/product/:productId', reviewController.listProductReviews);
router.get(
  '/seller',
  authenticate,
  requireRole('SELLER'),
  requireSellerProfile,
  reviewController.listSellerReviews
);
router.post('/', authenticate, validate(createReviewSchema), reviewController.createReview);
router.put(
  '/:id/reply',
  authenticate,
  requireRole('SELLER'),
  requireSellerProfile,
  validate(replySchema),
  reviewController.replyReview
);

module.exports = router;
