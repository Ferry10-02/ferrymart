const QRCode = require('qrcode');
const env = require('../config/env');

const buildProductUrl = (slug) => `${env.appUrl}/products/${encodeURIComponent(slug)}?src=qr`;

const buildOrderQrUrl = (orderNumber) => `${env.appUrl}/qr/order/${encodeURIComponent(orderNumber)}`;

const generateQrDataUrl = async (targetUrl) => {
  return QRCode.toDataURL(targetUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
};

const generateQrSvg = async (targetUrl) => {
  return QRCode.toString(targetUrl, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#0F172A',
      light: '#FFFFFF',
    },
  });
};

const generateProductQr = async (product) => {
  const url = buildProductUrl(product.slug);
  const dataUrl = await generateQrDataUrl(url);
  return {
    type: 'PRODUCT',
    productId: product.id,
    slug: product.slug,
    targetUrl: url,
    qrDataUrl: dataUrl,
  };
};

const generateOrderQr = async (order) => {
  const url = buildOrderQrUrl(order.orderNumber);
  const dataUrl = await generateQrDataUrl(url);
  return {
    type: 'ORDER',
    orderId: order.id,
    orderNumber: order.orderNumber,
    targetUrl: url,
    qrDataUrl: dataUrl,
  };
};

module.exports = {
  buildProductUrl,
  buildOrderQrUrl,
  generateQrDataUrl,
  generateQrSvg,
  generateProductQr,
  generateOrderQr,
};
