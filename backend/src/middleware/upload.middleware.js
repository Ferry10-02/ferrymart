const multer = require('multer');
const path = require('path');
const { AppError } = require('../utils/errors');

const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const imageFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_IMAGE_MIMES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    return cb(
      new AppError(
        'Format file tidak didukung. Hanya gambar JPG, PNG, WEBP, dan GIF yang diperbolehkan.',
        400,
        'INVALID_FILE_TYPE'
      )
    );
  }
  cb(null, true);
};

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max per file
    files: 8,
  },
  fileFilter: imageFileFilter,
});

module.exports = { uploadImage };
