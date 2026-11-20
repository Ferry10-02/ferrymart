const { Server } = require('socket.io');
const env = require('../config/env');
const prisma = require('../config/prisma');
const { verifyAccessToken } = require('../utils/jwt');
const { stripUnsafeHtml } = require('../utils/sanitize');
const { attachSocketIO, notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');

let io = null;

const getIO = () => io;

const PRIVATE_LAN_ORIGIN_RE =
  /^https?:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

const initSocket = (httpServer) => {
  const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim());
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        if (env.nodeEnv !== 'production' && PRIVATE_LAN_ORIGIN_RE.test(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Origin Socket tidak diizinkan.'));
      },
      credentials: true,
    },
  });

  attachSocketIO(io);

  // JWT authentication on Socket handshake
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        return next(new Error('Autentikasi Socket diperlukan.'));
      }

      const decoded = verifyAccessToken(token);
      const user = await prisma.profile.findUnique({
        where: { id: decoded.sub },
        select: { id: true, fullName: true, avatarUrl: true, isActive: true, isSuspended: true },
      });

      if (!user || !user.isActive || user.isSuspended) {
        return next(new Error('Akun tidak valid atau ditangguhkan.'));
      }

      socket.user = user;
      next();
    } catch {
      next(new Error('Token Socket tidak valid.'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.id;
    socket.join(`user:${userId}`);

    // Join specific conversation ONLY if user is a verified member
    socket.on('chat:join', async ({ conversationId }, callback) => {
      try {
        if (!conversationId) return callback?.({ ok: false, message: 'conversationId wajib diisi.' });

        const membership = await prisma.conversationMember.findUnique({
          where: {
            conversationId_userId: { conversationId, userId },
          },
        });

        if (!membership) {
          return callback?.({ ok: false, message: 'Akses ditolak: Anda bukan anggota percakapan ini.' });
        }

        socket.join(`conv:${conversationId}`);
        callback?.({ ok: true });
      } catch (err) {
        callback?.({ ok: false, message: err.message });
      }
    });

    socket.on('chat:leave', ({ conversationId }) => {
      if (conversationId) {
        socket.leave(`conv:${conversationId}`);
      }
    });

    // Realtime send message with strict membership validation
    socket.on('chat:send', async ({ conversationId, content, imageUrl, messageType }, callback) => {
      try {
        if (!conversationId) {
          return callback?.({ ok: false, message: 'conversationId wajib diisi.' });
        }

        const cleanContent = content ? stripUnsafeHtml(content) : null;
        if (!cleanContent && !imageUrl) {
          return callback?.({ ok: false, message: 'Pesan teks atau gambar tidak boleh kosong.' });
        }

        const members = await prisma.conversationMember.findMany({
          where: { conversationId },
        });

        const isMember = members.some((m) => m.userId === userId);
        if (!isMember) {
          return callback?.({ ok: false, message: 'Anda tidak memiliki akses ke percakapan ini.' });
        }

        const resolvedType = messageType || (imageUrl ? 'IMAGE' : 'TEXT');

        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: userId,
            content: cleanContent,
            imageUrl: imageUrl || null,
            messageType: resolvedType,
            status: 'SENT',
          },
          include: {
            sender: {
              select: { id: true, fullName: true, avatarUrl: true },
            },
          },
        });

        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            lastMessageAt: message.createdAt,
            lastMessagePreview: cleanContent ? cleanContent.slice(0, 120) : '[Gambar]',
          },
        });

        // Broadcast to conversation room
        io.to(`conv:${conversationId}`).emit('chat:message', message);

        // Notify other members in their personal rooms + WhatsApp/Telegram if enabled
        const otherMembers = members.filter((m) => m.userId !== userId);
        for (const member of otherMembers) {
          io.to(`user:${member.userId}`).emit('chat:conversation_updated', {
            conversationId,
            lastMessage: message,
          });

          notifyUser({
            userId: member.userId,
            eventType: NOTIFICATION_EVENTS.NEW_MESSAGE,
            title: `Pesan baru dari ${socket.user.fullName}`,
            body: cleanContent ? cleanContent.slice(0, 140) : 'Mengirim gambar baru',
            data: { conversationId, messageId: message.id },
          });
        }

        callback?.({ ok: true, data: message });
      } catch (err) {
        callback?.({ ok: false, message: err.message });
      }
    });

    // Mark messages as read
    socket.on('chat:mark_read', async ({ conversationId }) => {
      try {
        if (!conversationId) return;
        const membership = await prisma.conversationMember.findUnique({
          where: { conversationId_userId: { conversationId, userId } },
        });
        if (!membership) return;

        const now = new Date();
        await prisma.message.updateMany({
          where: {
            conversationId,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
          data: { status: 'READ', readAt: now },
        });

        await prisma.conversationMember.update({
          where: { id: membership.id },
          data: { lastReadAt: now },
        });

        io.to(`conv:${conversationId}`).emit('chat:read', {
          conversationId,
          readerId: userId,
          readAt: now,
        });
      } catch (err) {
        console.error('[Socket] mark_read error:', err.message);
      }
    });

    // Typing indicators
    socket.on('chat:typing', ({ conversationId, isTyping }) => {
      if (!conversationId) return;
      socket.to(`conv:${conversationId}`).emit('chat:typing', {
        conversationId,
        userId,
        fullName: socket.user.fullName,
        isTyping: Boolean(isTyping),
      });
    });
  });

  return io;
};

module.exports = { initSocket, getIO };
