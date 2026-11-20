const crypto = require('crypto');

// Basic XSS sanitization for user-provided text strings
const stripUnsafeHtml = (value) => {
  if (typeof value !== 'string') return value;
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

const sanitizePayload = (obj) => {
  if (typeof obj === 'string') return stripUnsafeHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitizePayload);
  if (obj && typeof obj === 'object') {
    const cleaned = {};
    for (const [key, val] of Object.entries(obj)) {
      // Do not mutate password fields
      if (key.toLowerCase().includes('password')) {
        cleaned[key] = val;
      } else {
        cleaned[key] = sanitizePayload(val);
      }
    }
    return cleaned;
  }
  return obj;
};

const slugify = (text, appendRandom = false) => {
  const base = String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

  if (!appendRandom) return base || 'item';
  const suffix = crypto.randomBytes(3).toString('hex');
  return `${base || 'item'}-${suffix}`;
};

const generateOrderNumber = () => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FM-${ymd}-${rand}`;
};

const generateSubOrderNumber = () => {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `FMS-${ymd}-${rand}`;
};

const formatIDR = (amount) => {
  const num = Number(amount || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(num);
};

module.exports = {
  stripUnsafeHtml,
  sanitizePayload,
  slugify,
  generateOrderNumber,
  generateSubOrderNumber,
  formatIDR,
};
