const http = require('http');
const app = require('./app');
const env = require('./config/env');
const prisma = require('./config/prisma');
const { initSocket } = require('./socket');
const whatsappWeb = require('./services/whatsappWeb.service');

const server = http.createServer(app);
initSocket(server);

// Pre-warm Prisma connection pool to Supabase on boot to prevent cold-start timeouts
prisma
  .$connect()
  .then(() => console.log('   Database        : Connected (Prisma Pool Ready)'))
  .catch((err) => console.warn('   Database        : Deferred connection -', err.message));

// Listen dual-stack (IPv4 LAN + IPv6 localhost) to avoid Windows 2000ms localhost IPv6 fallback delay
server.listen(env.port, () => {
  console.log(`🚀 FerryMarket Backend running on http://localhost:${env.port}`);
  console.log(`   LAN App URL     : ${env.appUrl}`);
  console.log(`   Environment     : ${env.nodeEnv}`);
  console.log(`   Supabase Storage: ${env.supabase.isConfigured ? 'Connected' : 'Local Fallback (/uploads)'}`);
  console.log(`   WhatsApp Mode   : ${env.whatsapp.provider} (Admin: ${env.whatsapp.adminPhone || '-'})`);
  console.log(`   Telegram Bot API: ${env.telegram.isConfigured ? 'Connected' : 'Belum Terhubung'}`);

  // Auto-reconnect WhatsApp Web if a linked session already exists (or WHATSAPP_AUTO_START=true)
  const shouldAutoStartWa =
    process.env.VERCEL !== '1' &&
    env.whatsapp.provider === 'whatsapp-web' &&
    process.env.WHATSAPP_AUTO_START !== 'false' &&
    (process.env.WHATSAPP_AUTO_START === 'true' || whatsappWeb.hasSavedSession());

  if (shouldAutoStartWa) {
    console.log('   WhatsApp-Web.js : Sesi tersimpan ditemukan, menyambungkan ulang otomatis...');
    setTimeout(() => {
      whatsappWeb.initializeWhatsAppWeb().catch((err) => {
        console.warn('   WhatsApp-Web.js : Gagal auto-reconnect -', err.message);
      });
    }, 1500);
  }
});

// Cleanly close headless Chrome on nodemon restart / exit to prevent zombie RAM leaks
const shutdown = async () => {
  await whatsappWeb.closeBrowserOnly?.();
  process.exit(0);
};
process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err);
});
