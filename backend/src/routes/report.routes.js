const express = require('express');
const reportController = require('../controllers/report.controller');
const {
  authenticate,
  requireRole,
  requireSellerProfile,
  requireAdminPermission,
} = require('../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/admin',
  authenticate,
  requireRole('ADMIN'),
  requireAdminPermission('VIEW_REPORTS'),
  reportController.getAdminReport
);

router.get(
  '/seller',
  authenticate,
  requireRole('SELLER'),
  requireSellerProfile,
  reportController.getSellerReport
);

module.exports = router;
