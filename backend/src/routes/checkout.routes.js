const express = require('express');
const { z } = require('zod');
const checkoutController = require('../controllers/checkout.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

const checkoutSchema = z.object({
  addressId: z.string().uuid('Pilih alamat pengiriman yang valid'),
  paymentMethodCode: z.string().min(2, 'Pilih metode pembayaran manual'),
  sellerShipping: z.record(z.string(), z.string().uuid()).optional().default({}),
  sellerNotes: z.record(z.string(), z.string().max(500)).optional().default({}),
  couponCode: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

const couponSchema = z.object({
  code: z.string().min(2),
  subtotal: z.coerce.number().min(0),
});

router.use(authenticate);

router.get('/options', checkoutController.getCheckoutOptions);
router.post('/validate-coupon', validate(couponSchema), checkoutController.checkCoupon);
router.post('/', validate(checkoutSchema), checkoutController.processCheckout);

module.exports = router;
