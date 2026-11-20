const express = require('express');
const orderController = require('../controllers/order.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// ALL order endpoints require authentication, including QR order verification!
router.use(authenticate);

router.get('/', orderController.listMyOrders);
router.get('/summary', orderController.getMyOrderSummary);
router.get('/qr/:orderNumber', orderController.getOrderByQr);
router.get('/:id', orderController.getOrderDetail);
router.post('/seller-orders/:sellerOrderId/complete', orderController.confirmOrderReceived);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;
