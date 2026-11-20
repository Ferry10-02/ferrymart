const express = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, requireRole, requireAdminPermission } = require('../middleware/auth.middleware');
const { uploadImage } = require('../middleware/upload.middleware');
const { uploadLimiter } = require('../middleware/rateLimit.middleware');

const router = express.Router();

// Every /api/admin route requires authenticated ADMIN role
router.use(authenticate, requireRole('ADMIN'));

router.get('/dashboard', adminController.getAdminDashboard);

// Users
router.get('/users', requireAdminPermission('MANAGE_USERS'), adminController.listUsers);
router.put('/users/:id/suspend', requireAdminPermission('MANAGE_USERS'), adminController.toggleSuspendUser);

// Sellers & Seller Verification
router.get('/sellers', requireAdminPermission('MANAGE_SELLERS'), adminController.listSellers);
router.put('/sellers/:id/verify', requireAdminPermission('VERIFY_SELLERS'), adminController.verifySeller);

// Products Moderation
router.get('/products', requireAdminPermission('MODERATE_PRODUCTS'), adminController.listAdminProducts);
router.put('/products/:id/moderate', requireAdminPermission('MODERATE_PRODUCTS'), adminController.moderateProduct);

// Orders
router.get('/orders', requireAdminPermission('MANAGE_ORDERS'), adminController.listAdminOrders);

// Payments & Manual Verification
router.get('/payments', requireAdminPermission('VERIFY_PAYMENTS'), adminController.listAdminPayments);
router.put('/payments/:id/verify', requireAdminPermission('VERIFY_PAYMENTS'), adminController.verifyPayment);

// WhatsApp & Telegram Notifications
router.get(
  '/notifications',
  requireAdminPermission('MANAGE_NOTIFICATIONS'),
  adminController.getNotificationIntegrations
);
router.put(
  '/notifications/settings',
  requireAdminPermission('MANAGE_NOTIFICATIONS'),
  adminController.updateNotificationSettings
);
router.post(
  '/notifications/test',
  requireAdminPermission('MANAGE_NOTIFICATIONS'),
  adminController.testExternalNotification
);
router.get(
  '/notifications/whatsapp/status',
  requireAdminPermission('MANAGE_NOTIFICATIONS'),
  adminController.getWhatsAppWebStatus
);
router.post(
  '/notifications/whatsapp/connect',
  requireAdminPermission('MANAGE_NOTIFICATIONS'),
  adminController.connectWhatsAppWeb
);
router.post(
  '/notifications/whatsapp/disconnect',
  requireAdminPermission('MANAGE_NOTIFICATIONS'),
  adminController.disconnectWhatsAppWeb
);

// Chat Monitoring
router.get('/chats', requireAdminPermission('VIEW_CHATS'), adminController.listAdminConversations);

// Activity Logs
router.get('/logs', requireAdminPermission('VIEW_LOGS'), adminController.listActivityLogs);

// Admin Permissions
router.get('/permissions', requireAdminPermission('MANAGE_PERMISSIONS'), adminController.listAdminPermissions);
router.put(
  '/permissions/:userId',
  requireAdminPermission('MANAGE_PERMISSIONS'),
  adminController.updateAdminPermissions
);

// Banners
router.get('/banners', requireAdminPermission('MANAGE_BANNERS'), adminController.listBanners);
router.post(
  '/banners',
  requireAdminPermission('MANAGE_BANNERS'),
  uploadLimiter,
  uploadImage.single('image'),
  adminController.createBanner
);
router.put('/banners/:id', requireAdminPermission('MANAGE_BANNERS'), adminController.updateBanner);
router.delete('/banners/:id', requireAdminPermission('MANAGE_BANNERS'), adminController.deleteBanner);

// Platform Settings (Service Fees, Site Info, Manual Payment Methods)
router.get('/settings', requireAdminPermission('MANAGE_SETTINGS'), adminController.listSettings);
router.put('/settings/:key', requireAdminPermission('MANAGE_SETTINGS'), adminController.updateSetting);

module.exports = router;
