const prisma = require('../config/prisma');
const { AppError, asyncHandler } = require('../utils/errors');
const { uploadFile } = require('../services/storage.service');
const { getIO } = require('../socket');
const { notifyUser } = require('../services/notification.service');
const { NOTIFICATION_EVENTS } = require('../utils/constants');

// GET /api/chat/conversations (Only conversations where current user is a member)
const listConversations = asyncHandler(async (req, res) => {
  const memberships = await prisma.conversationMember.findMany({
    where: { userId: req.user.id },
    include: {
      conversation: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  avatarUrl: true,
                  sellerProfile: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true } },
                },
              },
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  senderId: { not: req.user.id },
                  status: { not: 'READ' },
                },
              },
            },
          },
        },
      },
    },
  });

  const conversations = memberships
    .map((m) => {
      const conv = m.conversation;
      const otherMember = conv.members.find((mem) => mem.userId !== req.user.id);
      return {
        id: conv.id,
        product: conv.product,
        orderId: conv.orderId,
        lastMessageAt: conv.lastMessageAt,
        lastMessagePreview: conv.lastMessagePreview,
        unreadCount: conv._count.messages,
        otherUser: otherMember?.user || null,
        createdAt: conv.createdAt,
      };
    })
    .sort((a, b) => {
      const timeA = new Date(a.lastMessageAt || a.createdAt).getTime();
      const timeB = new Date(b.lastMessageAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  res.json({ success: true, data: conversations });
});

// POST /api/chat/conversations (Start or fetch existing conversation with a seller/user)
const startConversation = asyncHandler(async (req, res) => {
  const { targetUserId, sellerId, productId = null, orderId = null } = req.body;

  let recipientUserId = targetUserId;
  if (!recipientUserId && sellerId) {
    const seller = await prisma.sellerProfile.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new AppError('Toko seller tidak ditemukan.', 404, 'SELLER_NOT_FOUND');
    }
    recipientUserId = seller.userId;
  }

  if (!recipientUserId) {
    throw new AppError('Penerima percakapan wajib ditentukan.', 400, 'RECIPIENT_REQUIRED');
  }

  if (recipientUserId === req.user.id) {
    throw new AppError('Anda tidak dapat memulai chat dengan diri sendiri.', 400, 'SELF_CHAT_FORBIDDEN');
  }

  // Find existing 1-on-1 conversation between these two users
  const existing = await prisma.conversation.findFirst({
    where: {
      AND: [
        { members: { some: { userId: req.user.id } } },
        { members: { some: { userId: recipientUserId } } },
      ],
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              sellerProfile: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true } },
            },
          },
        },
      },
      product: {
        select: { id: true, name: true, slug: true, price: true },
      },
    },
  });

  if (existing) {
    if (productId && existing.productId !== productId) {
      await prisma.conversation.update({
        where: { id: existing.id },
        data: { productId },
      });
    }
    const otherUser = existing.members.find((m) => m.userId !== req.user.id)?.user || null;
    return res.json({
      success: true,
      data: { ...existing, otherUser },
    });
  }

  const created = await prisma.conversation.create({
    data: {
      productId: productId || null,
      orderId: orderId || null,
      members: {
        create: [{ userId: req.user.id }, { userId: recipientUserId }],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
              sellerProfile: { select: { id: true, storeName: true, storeSlug: true, logoUrl: true } },
            },
          },
        },
      },
      product: { select: { id: true, name: true, slug: true, price: true } },
    },
  });

  const otherUser = created.members.find((m) => m.userId !== req.user.id)?.user || null;

  res.status(201).json({
    success: true,
    data: { ...created, otherUser },
  });
});

// GET /api/chat/conversations/:id/messages (Strict participant check)
const getMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

  const membership = await prisma.conversationMember.findUnique({
    where: { conversationId_userId: { conversationId: id, userId: req.user.id } },
  });

  const isAdminViewer =
    req.user.roles.includes('ADMIN') &&
    (req.user.adminPermissions.includes('SUPER_ADMIN') ||
      req.user.adminPermissions.includes('VIEW_CHATS'));

  if (!membership && !isAdminViewer) {
    throw new AppError('Akses ditolak. Anda bukan anggota percakapan ini.', 403, 'CHAT_ACCESS_DENIED');
  }

  const messages = await prisma.message.findMany({
    where: { conversationId: id },
    orderBy: { createdAt: 'asc' },
    skip: (pageNum - 1) * limitNum,
    take: limitNum,
    include: {
      sender: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  // Mark messages from other participant as READ when actual member views
  if (membership) {
    const now = new Date();
    await prisma.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: req.user.id },
        status: { not: 'READ' },
      },
      data: { status: 'READ', readAt: now },
    });
    await prisma.conversationMember.update({
      where: { id: membership.id },
      data: { lastReadAt: now },
    });
  }

  res.json({ success: true, data: messages });
});

// POST /api/chat/conversations/:id/messages (Send text or uploaded image message)
const sendMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const members = await prisma.conversationMember.findMany({ where: { conversationId: id } });
  const isMember = members.some((m) => m.userId === req.user.id);
  if (!isMember) {
    throw new AppError('Akses ditolak. Anda bukan anggota percakapan ini.', 403, 'CHAT_ACCESS_DENIED');
  }

  let imageUrl = null;
  if (req.file) {
    const uploaded = await uploadFile(req.file, 'chat');
    imageUrl = uploaded.url;
  }

  if ((!content || !content.trim()) && !imageUrl) {
    throw new AppError('Pesan teks atau gambar wajib diisi.', 400, 'EMPTY_MESSAGE');
  }

  const message = await prisma.message.create({
    data: {
      conversationId: id,
      senderId: req.user.id,
      content: content?.trim() || null,
      imageUrl,
      messageType: imageUrl ? 'IMAGE' : 'TEXT',
      status: 'SENT',
    },
    include: {
      sender: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  });

  await prisma.conversation.update({
    where: { id },
    data: {
      lastMessageAt: message.createdAt,
      lastMessagePreview: content?.trim() ? content.trim().slice(0, 120) : '[Gambar]',
    },
  });

  const io = getIO();
  if (io) {
    io.to(`conv:${id}`).emit('chat:message', message);
  }

  for (const member of members.filter((m) => m.userId !== req.user.id)) {
    if (io) {
      io.to(`user:${member.userId}`).emit('chat:conversation_updated', {
        conversationId: id,
        lastMessage: message,
      });
    }
    notifyUser({
      userId: member.userId,
      eventType: NOTIFICATION_EVENTS.NEW_MESSAGE,
      title: `Pesan baru dari ${req.user.fullName}`,
      body: content?.trim() ? content.trim().slice(0, 140) : 'Mengirim gambar baru',
      data: { conversationId: id, messageId: message.id },
    });
  }

  res.status(201).json({ success: true, data: message });
});

module.exports = {
  listConversations,
  startConversation,
  getMessages,
  sendMessage,
};
