const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

const env = require('./config/env');
const whatsappWeb = require('./services/whatsappWeb.service');
const { apiLimiter } = require('./middleware/rateLimit.middleware');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const sellerRoutes = require('./routes/seller.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const cartRoutes = require('./routes/cart.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const orderRoutes = require('./routes/order.routes');
const paymentRoutes = require('./routes/payment.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const reviewRoutes = require('./routes/review.routes');
const chatRoutes = require('./routes/chat.routes');
const notificationRoutes = require('./routes/notification.routes');
const adminRoutes = require('./routes/admin.routes');
const reportRoutes = require('./routes/report.routes');

const app = express();

// Trust proxy for accurate rate-limiting behind reverse proxies
app.set('trust proxy', 1);

// Secure HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS configuration (allows private LAN IPs automatically in development so switching Wi-Fi never breaks CORS)
const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim());
const PRIVATE_LAN_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      if (env.nodeEnv !== 'production' && PRIVATE_LAN_ORIGIN_RE.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Origin tidak diizinkan oleh kebijakan CORS.'));
    },
    credentials: true,
  })
);

app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(cookieParser());

// Serve local upload fallback files cleanly
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  const waWeb = whatsappWeb.getStatus();
  res.json({
    success: true,
    service: 'FerryMarket API',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    integrations: {
      supabaseStorage: env.supabase.isConfigured ? 'configured' : 'local_fallback',
      whatsapp: env.whatsapp.provider === 'whatsapp-web' ? (waWeb.isReady ? 'ready' : waWeb.status.toLowerCase()) : env.whatsapp.isConfigured ? 'configured' : 'not_configured',
      whatsappWeb: {
        status: waWeb.status,
        isReady: waWeb.isReady,
        hasQr: Boolean(waWeb.qrDataUrl),
        connectedPhone: waWeb.connectedPhone,
        lastError: waWeb.lastError,
      },
      telegram: env.telegram.isConfigured ? 'configured' : 'not_configured',
    },
  });
});

// General API rate limiter
app.use('/api', apiLimiter);

// Mount all 15 REST API route groups
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
