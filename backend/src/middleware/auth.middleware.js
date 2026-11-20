const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/jwt');
const { AppError } = require('../utils/errors');

const extractToken = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies && req.cookies.fm_token) {
    return req.cookies.fm_token;
  }
  return null;
};

// 60-second in-memory user context cache (instantly invalidated on role/profile/suspend changes)
const userCtxCache = new Map();
const USER_CACHE_TTL_MS = 60000;

const invalidateUserCache = (userId) => {
  if (userId) userCtxCache.delete(userId);
};

const loadUserContext = async (userId, { bypassCache = false } = {}) => {
  const cached = userCtxCache.get(userId);
  if (!bypassCache && cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const user = await prisma.profile.findUnique({
    where: { id: userId },
    include: {
      roles: true,
      sellerProfile: true,
      adminPermissions: true,
    },
  });

  if (!user) return null;

  const ctx = {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    telegramChatId: user.telegramChatId,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    isSuspended: user.isSuspended,
    suspendedReason: user.suspendedReason,
    roles: user.roles.map((r) => r.role),
    sellerProfile: user.sellerProfile,
    adminPermissions: user.adminPermissions.map((p) => p.permission),
  };

  userCtxCache.set(userId, { data: ctx, expiresAt: Date.now() + USER_CACHE_TTL_MS });
  return ctx;
};

const authenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      throw new AppError('Autentikasi diperlukan. Silakan login terlebih dahulu.', 401, 'UNAUTHORIZED');
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      throw new AppError('Sesi login tidak valid atau telah kedaluwarsa.', 401, 'INVALID_TOKEN');
    }

    const userCtx = await loadUserContext(decoded.sub);
    if (!userCtx) {
      throw new AppError('Akun pengguna tidak ditemukan.', 401, 'USER_NOT_FOUND');
    }

    if (!userCtx.isActive) {
      throw new AppError('Akun Anda tidak aktif.', 403, 'ACCOUNT_INACTIVE');
    }

    if (userCtx.isSuspended) {
      throw new AppError(
        `Akun Anda sedang ditangguhkan${userCtx.suspendedReason ? `: ${userCtx.suspendedReason}` : '.'}`,
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    req.user = userCtx;
    next();
  } catch (err) {
    next(err);
  }
};

const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) return next();

    try {
      const decoded = verifyAccessToken(token);
      const userCtx = await loadUserContext(decoded.sub);
      if (userCtx && userCtx.isActive && !userCtx.isSuspended) {
        req.user = userCtx;
      }
    } catch {
      // Ignore invalid token on optional auth routes
    }
    next();
  } catch (err) {
    next(err);
  }
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Autentikasi diperlukan.', 401, 'UNAUTHORIZED'));
    }

    const hasMatch = allowedRoles.some((role) => req.user.roles.includes(role));
    if (!hasMatch) {
      return next(
        new AppError(
          'Anda tidak memiliki hak akses untuk membuka halaman atau fitur ini.',
          403,
          'FORBIDDEN_ROLE'
        )
      );
    }

    next();
  };
};

const requireSellerProfile = (req, res, next) => {
  if (!req.user || !req.user.roles.includes('SELLER') || !req.user.sellerProfile) {
    return next(
      new AppError('Profil toko seller belum tersedia. Silakan daftar sebagai seller terlebih dahulu.', 403, 'SELLER_PROFILE_REQUIRED')
    );
  }
  if (req.user.sellerProfile.verificationStatus === 'SUSPENDED') {
    return next(new AppError('Toko Anda sedang ditangguhkan oleh Admin.', 403, 'SELLER_SUSPENDED'));
  }
  next();
};

const requireAdminPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user || !req.user.roles.includes('ADMIN')) {
      return next(new AppError('Akses khusus Administrator.', 403, 'ADMIN_REQUIRED'));
    }

    const perms = req.user.adminPermissions || [];
    if (perms.includes('SUPER_ADMIN') || perms.includes(permission)) {
      return next();
    }

    return next(
      new AppError(
        `Akses ditolak. Membutuhkan izin admin: ${permission}`,
        403,
        'MISSING_ADMIN_PERMISSION'
      )
    );
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  requireRole,
  requireSellerProfile,
  requireAdminPermission,
  loadUserContext,
  invalidateUserCache,
};
