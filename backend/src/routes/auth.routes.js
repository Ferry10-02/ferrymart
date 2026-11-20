const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter').max(100),
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter').max(150),
  phone: z.string().max(30).optional().nullable(),
  role: z.enum(['BUYER', 'SELLER']).optional().default('BUYER'),
  storeName: z.string().max(150).optional(),
  storeDescription: z.string().max(1000).optional(),
  storeCity: z.string().max(100).optional(),
  storeProvince: z.string().max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const forgotSchema = z.object({
  email: z.string().email('Email tidak valid'),
});

const resetSchema = z.object({
  token: z.string().min(10, 'Token tidak valid'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Password saat ini wajib diisi'),
  newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
});

const openStoreSchema = z.object({
  storeName: z.string().min(3, 'Nama toko minimal 3 karakter').max(150),
  description: z.string().max(1500).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/forgot-password', authLimiter, validate(forgotSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetSchema), authController.resetPassword);
router.put('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.post('/open-store', authenticate, validate(openStoreSchema), authController.openStore);

module.exports = router;
