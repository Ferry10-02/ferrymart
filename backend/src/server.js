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

server.listen(env.port, '0.0.0.0', () => {
  console.log(`🚀 FerryMarket Backend running on http://0.0.0.0:${env.port}`);
  console.log(`   LAN App URL     : ${env.appUrl}`);
  console.log(`   Environment     : ${env.nodeEnv}`);
  console.log(`   Supabase Storage: ${env.supabase.isConfigured ? 'Connected' : 'Local Fallback (/uploads)'}`);
  console.log(`   WhatsApp Mode   : ${env.whatsapp.provider} (Admin: ${env.whatsapp.adminPhone || '-'})`);
  console.log(`   Telegram Bot API: ${env.telegram.isConfigured ? 'Connected' : 'Belum Terhubung'}`);

  if (env.whatsapp.provider === 'whatsapp-web') {
    whatsappWeb.initializeWhatsAppWeb().catch((err) => {
      console.warn('   WhatsApp-Web.js : Gagal auto-init -', err.message);
    });
  }
});

process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err);
});
