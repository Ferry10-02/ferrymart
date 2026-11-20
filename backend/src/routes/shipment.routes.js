const express = require('express');
const { z } = require('zod');
const shipmentController = require('../controllers/shipment.controller');
const { authenticate, requireRole, requireSellerProfile } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');

const router = express.Router();

const shipmentSchema = z.object({
  courierName: z.string().min(2, 'Nama kurir wajib diisi').max(100),
  trackingNumber: z.string().min(3, 'Nomor resi minimal 3 karakter').max(120),
  status: z
    .enum(['PREPARING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED'])
    .optional()
    .default('IN_TRANSIT'),
  note: z.string().max(500).optional(),
});

router.get('/methods', shipmentController.listShippingMethods);
router.get('/:sellerOrderId', authenticate, shipmentController.getShipment);
router.post(
  '/:sellerOrderId',
  authenticate,
  requireRole('SELLER'),
  requireSellerProfile,
  validate(shipmentSchema),
  shipmentController.upsertShipment
);

module.exports = router;
