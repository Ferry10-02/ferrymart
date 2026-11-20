const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const env = require('../config/env');
const { AppError, asyncHandler } = require('../utils/errors');
const { signAccessToken, signRefreshToken } = require('../utils/jwt');
const { slugify } = require('../utils/sanitize');
const { loadUserContext } = require('../middleware/auth.middleware');

const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProd = env.nodeEnv === 'production';
  res.cookie('fm_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.cookie('fm_refresh', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const {
    email,
    password,
    fullName,
    phone,
    role = 'BUYER',
    storeName,
    storeDescription,
    storeCity,
    storeProvince,
  } = req.body;

  // Prevent self-registering as ADMIN
  if (role === 'ADMIN') {
    throw new AppError('Role ADMIN tidak dapat didaftarkan secara publik.', 403, 'FORBIDDEN_ROLE');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    throw new AppError('Email sudah terdaftar. Silakan login atau gunakan email lain.', 409, 'EMAIL_EXISTS');
  }

  if (role === 'SELLER' && (!storeName || storeName.trim().length < 3)) {
    throw new AppError('Nama toko minimal 3 karakter untuk mendaftar sebagai Seller.', 400, 'STORE_NAME_REQUIRED');
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);

  const createdUser = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
        phone: phone || null,
        isActive: true,
      },
    });

    // Always grant BUYER role
    await tx.userRole.create({
      data: { userId: profile.id, role: 'BUYER' },
    });

    // Also create empty cart
    await tx.cart.create({ data: { userId: profile.id } });

    if (role === 'SELLER') {
      await tx.userRole.create({
        data: { userId: profile.id, role: 'SELLER' },
      });

      const storeSlug = slugify(storeName, true);
      await tx.sellerProfile.create({
        data: {
          userId: profile.id,
          storeName: storeName.trim(),
          storeSlug,
          description: storeDescription || null,
          phone: phone || null,
          city: storeCity || null,
          province: storeProvince || null,
          verificationStatus: 'PENDING',
        },
      });
    }

    return profile;
  });

  const userCtx = await loadUserContext(createdUser.id);
  const accessToken = signAccessToken({ sub: userCtx.id, roles: userCtx.roles });
  const refreshToken = signRefreshToken({ sub: userCtx.id });
  setAuthCookies(res, accessToken, refreshToken);

  res.status(201).json({
    success: true,
    message:
      role === 'SELLER'
        ? 'Registrasi Seller berhasil! Toko Anda menunggu verifikasi Admin.'
        : 'Registrasi berhasil! Selamat datang di FerryMarket.',
    data: {
      user: userCtx,
      accessToken,
    },
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const profile = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
  if (!profile) {
    throw new AppError('Email atau password salah.', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, profile.passwordHash);
  if (!valid) {
    throw new AppError('Email atau password salah.', 401, 'INVALID_CREDENTIALS');
  }

  if (!profile.isActive) {
    throw new AppError('Akun Anda tidak aktif.', 403, 'ACCOUNT_INACTIVE');
  }

  if (profile.isSuspended) {
    throw new AppError(
      `Akun Anda ditangguhkan${profile.suspendedReason ? `: ${profile.suspendedReason}` : '.'}`,
      403,
      'ACCOUNT_SUSPENDED'
    );
  }

  const userCtx = await loadUserContext(profile.id);
  const accessToken = signAccessToken({ sub: userCtx.id, roles: userCtx.roles });
  const refreshToken = signRefreshToken({ sub: userCtx.id });
  setAuthCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    message: 'Login berhasil.',
    data: {
      user: userCtx,
      accessToken,
    },
  });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('fm_token');
  res.clearCookie('fm_refresh');
  res.json({
    success: true,
    message: 'Logout berhasil.',
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
  });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase().trim();

  const profile = await prisma.profile.findUnique({ where: { email: normalizedEmail } });
  let devResetToken = null;

  if (profile) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.profile.update({
      where: { id: profile.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpiresAt: expiresAt,
      },
    });

    const resetLink = `${env.appUrl}/reset-password?token=${rawToken}`;
    if (env.nodeEnv !== 'production') {
      console.log(`[FerryMarket Password Reset] Email: ${normalizedEmail} | Link: ${resetLink}`);
      devResetToken = rawToken;
    }
  }

  res.json({
    success: true,
    message:
      'Jika email terdaftar, tautan reset password telah dibuat. Periksa kotak masuk email Anda (atau log server pada mode development).',
    ...(devResetToken ? { devResetToken } : {}),
  });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const profile = await prisma.profile.findFirst({
    where: {
      resetPasswordToken: hashedToken,
      resetPasswordExpiresAt: { gt: new Date() },
    },
  });

  if (!profile) {
    throw new AppError('Token reset password tidak valid atau sudah kedaluwarsa.', 400, 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await prisma.profile.update({
    where: { id: profile.id },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpiresAt: null,
    },
  });

  res.json({
    success: true,
    message: 'Password berhasil diperbarui. Silakan login dengan password baru Anda.',
  });
});

// PUT /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const profile = await prisma.profile.findUnique({ where: { id: req.user.id } });

  const isMatch = await bcrypt.compare(currentPassword, profile.passwordHash);
  if (!isMatch) {
    throw new AppError('Password saat ini tidak sesuai.', 400, 'WRONG_PASSWORD');
  }

  const passwordHash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  await prisma.profile.update({
    where: { id: req.user.id },
    data: { passwordHash },
  });

  res.json({
    success: true,
    message: 'Password berhasil diubah.',
  });
});

// POST /api/auth/open-store (Upgrade existing Buyer to Seller)
const openStore = asyncHandler(async (req, res) => {
  const { storeName, description, phone, address, city, province, postalCode } = req.body;

  const existingSeller = await prisma.sellerProfile.findUnique({
    where: { userId: req.user.id },
  });

  if (existingSeller) {
    throw new AppError('Anda sudah memiliki toko seller.', 409, 'SELLER_ALREADY_EXISTS');
  }

  await prisma.$transaction(async (tx) => {
    await tx.userRole.upsert({
      where: { userId_role: { userId: req.user.id, role: 'SELLER' } },
      update: {},
      create: { userId: req.user.id, role: 'SELLER' },
    });

    await tx.sellerProfile.create({
      data: {
        userId: req.user.id,
        storeName: storeName.trim(),
        storeSlug: slugify(storeName, true),
        description: description || null,
        phone: phone || req.user.phone || null,
        address: address || null,
        city: city || null,
        province: province || null,
        postalCode: postalCode || null,
        verificationStatus: 'PENDING',
      },
    });
  });

  const userCtx = await loadUserContext(req.user.id, { bypassCache: true });
  const accessToken = signAccessToken({ sub: userCtx.id, roles: userCtx.roles });

  res.status(201).json({
    success: true,
    message: 'Toko berhasil dibuat dan sedang menunggu verifikasi Admin.',
    data: { user: userCtx, accessToken },
  });
});

module.exports = {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  changePassword,
  openStore,
};
