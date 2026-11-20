const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AUTH_RATE_LIMITED',
    message: 'Terlalu banyak percobaan autentikasi. Tunggu 15 menit lalu coba lagi.',
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'UPLOAD_RATE_LIMITED',
    message: 'Terlalu banyak unggahan file. Coba lagi beberapa saat.',
  },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
