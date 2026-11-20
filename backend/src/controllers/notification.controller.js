const prisma = require('../config/prisma');
const { asyncHandler } = require('../utils/errors');

// GET /api/notifications
const listNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.notification.count({ where: { userId: req.user.id } }),
    prisma.notification.count({ where: { userId: req.user.id, isRead: false } }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      unreadCount,
      pagination: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    },
  });
});

// PUT /api/notifications/:id/read
const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await prisma.notification.updateMany({
    where: { id, userId: req.user.id },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true, message: 'Notifikasi ditandai sudah dibaca.' });
});

// PUT /api/notifications/read-all
const markAllAsRead = asyncHandler(async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  res.json({ success: true, message: 'Semua notifikasi ditandai sudah dibaca.' });
});

module.exports = {
  listNotifications,
  markAsRead,
  markAllAsRead,
};
