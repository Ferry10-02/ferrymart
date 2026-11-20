const { ZodError } = require('zod');
const multer = require('multer');

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`,
  });
};

const errorHandler = (err, req, res, _next) => {
  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'Data yang dikirim tidak valid.',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Multer upload error
  if (err instanceof multer.MulterError) {
    let message = 'Gagal mengunggah file.';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'Ukuran file melebihi batas maksimal 5MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      message = 'Jumlah file melebihi batas maksimal.';
    }
    return res.status(400).json({
      success: false,
      code: 'UPLOAD_ERROR',
      message,
    });
  }

  // Prisma known errors
  if (err && err.code === 'P2002') {
    const fields = err.meta?.target ? err.meta.target.join(', ') : 'field';
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_ENTRY',
      message: `Data sudah terdaftar (${fields}).`,
    });
  }

  if (err && err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      code: 'RECORD_NOT_FOUND',
      message: 'Data yang diminta tidak ditemukan.',
    });
  }

  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message =
    statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Terjadi kesalahan pada server. Silakan coba lagi.'
      : err.message || 'Terjadi kesalahan tak terduga.';

  if (statusCode >= 500) {
    console.error('[ServerError]', err);
  }

  res.status(statusCode).json({
    success: false,
    code,
    message,
    ...(err.details ? { details: err.details } : {}),
  });
};

module.exports = { notFoundHandler, errorHandler };
