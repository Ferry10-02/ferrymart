const prisma = require('../config/prisma');

const logAdminActivity = async (req, action, entityType, entityId = null, details = {}) => {
  try {
    if (!req?.user?.id) return;
    await prisma.adminActivityLog.create({
      data: {
        adminId: req.user.id,
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details,
        ipAddress: req.ip || req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to record admin activity:', err.message);
  }
};

module.exports = { logAdminActivity };
