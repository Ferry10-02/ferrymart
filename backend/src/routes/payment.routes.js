const express = require('express');
const { z } = require('zod');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadImage } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

const uploadProofSchema = z.object({
  senderName: z.string().min(2, 'Nama pengirim wajib diisi').max(150),
  senderBank: z.string().min(2, 'Bank/e-wallet pengirim wajib diisi').max(100),
  transferAmount: z.coerce.number().positive('Nominal transfer harus lebih dari 0'),
  transferDate: z.string().optional(),
  notes: z.string().max(500).optional(),
});

router.get('/methods', paymentController.listPaymentMethods);
router.get('/order/:orderId', authenticate, paymentController.getPaymentByOrder);
router.post(
  '/:orderId/proof',
  authenticate,
  uploadLimiter,
  uploadImage.single('proof'),
  validate(uploadProofSchema),
  paymentController.uploadPaymentProof
);

module.exports = router;
