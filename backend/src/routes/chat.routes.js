const express = require('express');
const { z } = require('zod');
const chatController = require('../controllers/chat.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadImage } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

const startConvSchema = z.object({
  targetUserId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
});

router.use(authenticate);

router.get('/conversations', chatController.listConversations);
router.post('/conversations', validate(startConvSchema), chatController.startConversation);
router.get('/conversations/:id/messages', chatController.getMessages);
router.post(
  '/conversations/:id/messages',
  uploadLimiter,
  uploadImage.single('image'),
  chatController.sendMessage
);

module.exports = router;
