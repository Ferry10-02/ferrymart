const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const env = require('../config/env');
const supabaseAdmin = require('../config/supabase');

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads');

/**
 * Uploads an image buffer to Supabase Storage (when configured)
 * or falls back cleanly to local `backend/uploads/<folder>/` for local development.
 */
const uploadFile = async (file, folder = 'general', options = {}) => {
  const { isPrivateProof = false } = options;
  const ext = path.extname(file.originalname || '.jpg').toLowerCase() || '.jpg';
  const fileName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const relativePath = `${folder}/${fileName}`;

  if (supabaseAdmin && env.supabase.isConfigured) {
    const bucket = isPrivateProof
      ? env.supabase.paymentProofBucket
      : env.supabase.storageBucket;

    const { error } = await supabaseAdmin.storage.from(bucket).upload(relativePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (!error) {
      if (isPrivateProof) {
        const { data: signed } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(relativePath, 60 * 60 * 24 * 30); // 30 days
        return {
          url: signed?.signedUrl || `${env.supabase.url}/storage/v1/object/public/${bucket}/${relativePath}`,
          path: relativePath,
          storage: 'supabase',
        };
      }

      const { data: pub } = supabaseAdmin.storage.from(bucket).getPublicUrl(relativePath);
      return {
        url: pub.publicUrl,
        path: relativePath,
        storage: 'supabase',
      };
    }

    console.warn('[StorageService] Supabase upload failed, falling back to local disk:', error.message);
  }

  // Local fallback storage
  const targetDir = path.join(UPLOADS_ROOT, folder);
  fs.mkdirSync(targetDir, { recursive: true });
  const absolutePath = path.join(targetDir, fileName);
  fs.writeFileSync(absolutePath, file.buffer);

  return {
    url: `${env.backendUrl}/uploads/${relativePath}`,
    path: relativePath,
    storage: 'local',
  };
};

module.exports = { uploadFile };
