const axios = require('axios');
const env = require('../config/env');
const prisma = require('../config/prisma');
const { getCache, setCache } = require('../utils/cache');
const whatsappWeb = require('./whatsappWeb.service');

let ioInstance = null;

const attachSocketIO = (io) => {
  ioInstance = io;
  whatsappWeb.attachIO(io);
};

const getChannelSettings = async () => {
  const cached = getCache('settings:notification_channels');
  if (cached) return cached;
  try {
    const setting = await prisma.platformSetting.findUnique({
      where: { key: 'notification_channels' },
    });
    if (setting && setting.value) {
      setCache('settings:notification_channels', setting.value, 60000);
      return setting.value;
    }
  } catch {
    // Fallback default
  }
  return {
    whatsapp_enabled: true,
    telegram_enabled: true,
    events: {
      ORDER_CREATED: true,
      PAYMENT_UPLOADED: true,
      PAYMENT_APPROVED: true,
      ORDER_PROCESSING: true,
      ORDER_SHIPPED: true,
      ORDER_COMPLETED: true,
      NEW_MESSAGE: true,
      QR_SCANNED: true,
    },
  };
};

/**
 * Returns non-sensitive connection status for Admin UI (NEVER returns tokens!)
 */
const getIntegrationStatus = async () => {
  const settings = await getChannelSettings();
  const isWaWeb = env.whatsapp.provider === 'whatsapp-web';
  const waWebStatus = whatsappWeb.getStatus();
  const waConnected = isWaWeb ? waWebStatus.isReady : env.whatsapp.isConfigured;

  return {
    appUrl: env.appUrl,
    whatsapp: {
      configured: waConnected,
      statusLabel: waConnected
        ? isWaWeb
          ? `Terhubung (+${waWebStatus.connectedPhone || 'WA Web'})`
          : 'Terhubung'
        : isWaWeb && waWebStatus.status === 'QR_READY'
          ? 'Menunggu Scan QR'
          : isWaWeb && waWebStatus.status === 'INITIALIZING'
            ? 'Menyiapkan QR...'
            : 'Belum Terhubung',
      provider: env.whatsapp.provider,
      enabled: Boolean(settings.whatsapp_enabled),
      hasAdminPhone: Boolean(env.whatsapp.adminPhone),
      adminPhone: env.whatsapp.adminPhone || '',
      web: waWebStatus,
    },
    telegram: {
      configured: env.telegram.isConfigured,
      statusLabel: env.telegram.isConfigured ? 'Terhubung' : 'Belum Terhubung',
      enabled: Boolean(settings.telegram_enabled),
      hasAdminChatId: Boolean(env.telegram.adminChatId),
    },
    events: settings.events || {},
  };
};

const normalizePhone = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1);
  }
  return cleaned.length >= 9 ? cleaned : null;
};

const sendWhatsAppMessage = async ({ userId = null, phone, eventType, message, metadata = {} }) => {
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return null;
  }

  const waDirectUrl = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  // Mode 1: whatsapp-web.js (Scan QR langsung di Dashboard Admin)
  if (env.whatsapp.provider === 'whatsapp-web') {
    const webStatus = whatsappWeb.getStatus();
    if (!webStatus.isReady) {
      return prisma.notificationLog.create({
        data: {
          userId,
          channel: 'WHATSAPP',
          eventType,
          recipient: normalizedPhone,
          payload: { message, waDirectUrl, ...metadata },
          status: 'NOT_CONFIGURED',
          errorMessage:
            'WhatsApp Web belum terhubung. Scan QR WhatsApp di Dashboard Admin -> WhatsApp & Telegram.',
        },
      });
    }

    try {
      const responseData = await whatsappWeb.sendViaWhatsAppWeb(normalizedPhone, message);
      return prisma.notificationLog.create({
        data: {
          userId,
          channel: 'WHATSAPP',
          eventType,
          recipient: normalizedPhone,
          payload: { message, waDirectUrl, ...metadata },
          status: 'SENT',
          providerResponse: responseData || {},
        },
      });
    } catch (err) {
      return prisma.notificationLog.create({
        data: {
          userId,
          channel: 'WHATSAPP',
          eventType,
          recipient: normalizedPhone,
          payload: { message, waDirectUrl, ...metadata },
          status: 'FAILED',
          errorMessage: err.message,
        },
      });
    }
  }

  // Mode 2: External HTTP provider (Meta Cloud API / Fonnte / Wablas / Custom)
  if (!env.whatsapp.isConfigured) {
    return prisma.notificationLog.create({
      data: {
        userId,
        channel: 'WHATSAPP',
        eventType,
        recipient: normalizedPhone,
        payload: { message, waDirectUrl, ...metadata },
        status: 'NOT_CONFIGURED',
        errorMessage: 'WhatsApp API belum dikonfigurasi di environment variables backend (.env).',
      },
    });
  }

  try {
    let responseData = null;

    if (env.whatsapp.provider === 'meta') {
      const resp = await axios.post(
        env.whatsapp.apiUrl,
        {
          messaging_product: 'whatsapp',
          to: normalizedPhone,
          type: 'text',
          text: { body: message },
        },
        {
          headers: {
            Authorization: `Bearer ${env.whatsapp.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      responseData = resp.data;
    } else if (env.whatsapp.provider === 'fonnte') {
      const resp = await axios.post(
        env.whatsapp.apiUrl,
        { target: normalizedPhone, message },
        {
          headers: { Authorization: env.whatsapp.apiToken },
          timeout: 10000,
        }
      );
      responseData = resp.data;
    } else {
      // Generic custom provider / Wablas
      const resp = await axios.post(
        env.whatsapp.apiUrl,
        { phone: normalizedPhone, message, eventType },
        {
          headers: {
            Authorization: `Bearer ${env.whatsapp.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );
      responseData = resp.data;
    }

    return prisma.notificationLog.create({
      data: {
        userId,
        channel: 'WHATSAPP',
        eventType,
        recipient: normalizedPhone,
        payload: { message, ...metadata },
        status: 'SENT',
        providerResponse: responseData || {},
      },
    });
  } catch (err) {
    return prisma.notificationLog.create({
      data: {
        userId,
        channel: 'WHATSAPP',
        eventType,
        recipient: normalizedPhone,
        payload: { message, ...metadata },
        status: 'FAILED',
        providerResponse: err.response?.data || null,
        errorMessage: err.message,
      },
    });
  }
};

const sendTelegramMessage = async ({ userId = null, chatId, eventType, message, metadata = {} }) => {
  if (!chatId) return null;

  if (!env.telegram.isConfigured) {
    return prisma.notificationLog.create({
      data: {
        userId,
        channel: 'TELEGRAM',
        eventType,
        recipient: String(chatId),
        payload: { message, ...metadata },
        status: 'NOT_CONFIGURED',
        errorMessage: 'Telegram Bot API belum dikonfigurasi (TELEGRAM_BOT_TOKEN kosong di backend .env).',
      },
    });
  }

  try {
    const url = `https://api.telegram.org/bot${env.telegram.botToken}/sendMessage`;
    const resp = await axios.post(
      url,
      {
        chat_id: String(chatId),
        text: message,
        parse_mode: 'HTML',
      },
      { timeout: 10000 }
    );

    return prisma.notificationLog.create({
      data: {
        userId,
        channel: 'TELEGRAM',
        eventType,
        recipient: String(chatId),
        payload: { message, ...metadata },
        status: 'SENT',
        providerResponse: resp.data || {},
      },
    });
  } catch (err) {
    return prisma.notificationLog.create({
      data: {
        userId,
        channel: 'TELEGRAM',
        eventType,
        recipient: String(chatId),
        payload: { message, ...metadata },
        status: 'FAILED',
        providerResponse: err.response?.data || null,
        errorMessage: err.message,
      },
    });
  }
};

/**
 * Main dispatcher: saves In-App notification, emits Socket.io event,
 * and sends WhatsApp & Telegram notifications if enabled for the event.
 */
const notifyUser = async ({
  userId,
  eventType,
  title,
  body,
  data = {},
  notifyAdminExternal = false,
}) => {
  try {
    // 1. In-App Notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: eventType,
        title,
        body,
        data,
      },
    });

    if (ioInstance) {
      ioInstance.to(`user:${userId}`).emit('notification:new', notification);
    }

    // 2. Check channel settings
    const settings = await getChannelSettings();
    const isEventEnabled = settings.events?.[eventType] !== false;
    if (!isEventEnabled) return notification;

    const user = await prisma.profile.findUnique({
      where: { id: userId },
      select: { id: true, phone: true, telegramChatId: true, fullName: true },
    });

    const linkSuffix = data?.slug
      ? `\nLink Produk: ${env.appUrl}/products/${encodeURIComponent(data.slug)}?src=qr`
      : data?.orderNumber
        ? `\nLink QR Pesanan: ${env.appUrl}/qr/order/${encodeURIComponent(data.orderNumber)}`
        : data?.orderId
          ? `\nLink Pesanan: ${env.appUrl}/orders/${data.orderId}`
          : '';

    const formattedText = `[${env.appName}] ${title}\n${body}${linkSuffix}`;

    if (settings.whatsapp_enabled && user?.phone) {
      await sendWhatsAppMessage({
        userId: user.id,
        phone: user.phone,
        eventType,
        message: formattedText,
        metadata: data,
      });
    }

    if (settings.telegram_enabled && user?.telegramChatId) {
      await sendTelegramMessage({
        userId: user.id,
        chatId: user.telegramChatId,
        eventType,
        message: `<b>${title}</b>\n${body}`,
        metadata: data,
      });
    }

    // Also notify platform Admin via configured external admin phone / Telegram chat ID
    if (notifyAdminExternal) {
      if (settings.whatsapp_enabled && env.whatsapp.adminPhone) {
        await sendWhatsAppMessage({
          userId: null,
          phone: env.whatsapp.adminPhone,
          eventType,
          message: `[ADMIN ${env.appName}] ${title}\n${body}`,
          metadata: data,
        });
      }
      if (settings.telegram_enabled && env.telegram.adminChatId) {
        await sendTelegramMessage({
          userId: null,
          chatId: env.telegram.adminChatId,
          eventType,
          message: `<b>[ADMIN ${env.appName}] ${title}</b>\n${body}`,
          metadata: data,
        });
      }
    }

    return notification;
  } catch (err) {
    console.error('[NotificationService] notifyUser error:', err.message);
    return null;
  }
};

module.exports = {
  attachSocketIO,
  getIntegrationStatus,
  sendWhatsAppMessage,
  sendTelegramMessage,
  notifyUser,
};
