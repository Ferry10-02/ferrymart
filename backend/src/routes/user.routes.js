const express = require('express');
const { z } = require('zod');
const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { uploadImage } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

const updateProfileSchema = z.object({
  fullName: z.string().min(2).max(150).optional(),
  phone: z.string().max(30).optional().nullable(),
  telegramChatId: z.string().max(64).optional().nullable(),
});

const addressSchema = z.object({
  label: z.string().min(1).max(60).optional(),
  recipientName: z.string().min(2, 'Nama penerima wajib diisi').max(150),
  phone: z.string().min(6, 'Nomor telepon penerima wajib diisi').max(30),
  addressLine: z.string().min(5, 'Alamat lengkap wajib diisi').max(500),
  district: z.string().max(100).optional().nullable(),
  city: z.string().min(2, 'Kota/Kabupaten wajib diisi').max(100),
  province: z.string().min(2, 'Provinsi wajib diisi').max(100),
  postalCode: z.string().min(3, 'Kode pos wajib diisi').max(20),
  isDefault: z.boolean().optional(),
});

const wishlistToggleSchema = z.object({
  productId: z.string().uuid('productId tidak valid'),
});

router.use(authenticate);

router.get('/profile', userController.getProfile);
router.put('/profile', validate(updateProfileSchema), userController.updateProfile);
router.post('/avatar', uploadLimiter, uploadImage.single('avatar'), userController.uploadAvatar);

router.get('/addresses', userController.getAddresses);
router.post('/addresses', validate(addressSchema), userController.createAddress);
router.put('/addresses/:id', validate(addressSchema.partial()), userController.updateAddress);
router.delete('/addresses/:id', userController.deleteAddress);

router.get('/wishlists', userController.getWishlists);
router.post('/wishlists/toggle', validate(wishlistToggleSchema), userController.toggleWishlist);

module.exports = router;
