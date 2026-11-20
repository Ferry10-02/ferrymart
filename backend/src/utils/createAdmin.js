#!/usr/bin/env node
/**
 * Safe CLI helper to bootstrap an initial Super Admin account for FerryMarket.
 * Reads credentials from environment variables or CLI flags so no password is hardcoded in Git.
 *
 * Usage:
 *   ADMIN_EMAIL=admin@ferrymarket.id ADMIN_PASSWORD="StrongPassword123!" ADMIN_NAME="Super Admin" npm run seed:admin
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const readline = require('readline');
const prisma = require('../config/prisma');
const { ADMIN_PERMISSIONS } = require('../utils/constants');

const ask = (rl, question) =>
  new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    const email = process.env.ADMIN_EMAIL || (await ask(rl, 'Admin Email: '));
    const fullName = process.env.ADMIN_NAME || (await ask(rl, 'Admin Full Name [Super Admin FerryMarket]: ')) || 'Super Admin FerryMarket';
    const password = process.env.ADMIN_PASSWORD || (await ask(rl, 'Admin Password (min 8 karakter): '));

    if (!email || !email.includes('@')) {
      throw new Error('Email admin tidak valid.');
    }
    if (!password || password.length < 8) {
      throw new Error('Password minimal 8 karakter.');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.profile.upsert({
      where: { email: email.toLowerCase() },
      update: {
        fullName,
        passwordHash,
        isActive: true,
        isSuspended: false,
      },
      create: {
        email: email.toLowerCase(),
        fullName,
        passwordHash,
        isActive: true,
        emailVerifiedAt: new Date(),
      },
    });

    // Ensure ADMIN and BUYER roles
    for (const role of ['ADMIN', 'BUYER']) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: user.id, role } },
        update: {},
        create: { userId: user.id, role },
      });
    }

    // Grant all admin permissions including SUPER_ADMIN
    for (const permission of ADMIN_PERMISSIONS) {
      await prisma.adminPermission.upsert({
        where: { userId_permission: { userId: user.id, permission } },
        update: {},
        create: { userId: user.id, permission, grantedBy: user.id },
      });
    }

    console.log(`\n✅ Akun Super Admin berhasil dibuat/diperbarui: ${user.email} (ID: ${user.id})`);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Gagal membuat akun admin:', err.message);
  process.exit(1);
});
