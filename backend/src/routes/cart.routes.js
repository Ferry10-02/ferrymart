const express = require('express');
const { z } = require('zod');
const cartController = require('../controllers/cart.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

const addItemSchema = z.object({
  productId: z.string().uuid('productId tidak valid'),
  variantId: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1).max(999).default(1),
});

const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(999).optional(),
  isSelected: z.boolean().optional(),
});

router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/items', validate(addItemSchema), cartController.addToCart);
router.put('/items/:itemId', validate(updateItemSchema), cartController.updateCartItem);
router.delete('/items/:itemId', cartController.removeCartItem);
router.delete('/', cartController.clearCart);

module.exports = router;
