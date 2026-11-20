const express = require('express');
const productController = require('../controllers/product.controller');
const { optionalAuthenticate } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/home', optionalAuthenticate, productController.getHomeData);
router.get('/', optionalAuthenticate, productController.listProducts);
router.get('/:slugOrId/qr', optionalAuthenticate, productController.getProductQr);
router.get('/:slugOrId', optionalAuthenticate, productController.getProductDetail);

module.exports = router;
