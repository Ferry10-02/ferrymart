const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

let Client = null;
let LocalAuth = null;

try {
  ({ Client, LocalAuth } = require('whatsapp-web.js'));
} catch {
  // Package not installed yet
}

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const findBrowserExecutable = () => {
  for (const p of CHROME_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
};

let client = null;
let ioRef = null;

const state = {
  status: 'DISCONNECTED', // DISCONNECTED | INITIALIZING | QR_READY | AUTHENTICATED | READY | ERROR
  qrRaw: null,
  qrDataUrl: null,
  connectedPhone: null,
  connectedName: null,
  lastError: null,
  updatedAt: new Date().toISOString(),
};

const emitState = () => {
  state.updatedAt = new Date().toISOString();
  if (ioRef) {
    ioRef.emit('wa:status', getStatus());
  }
};

const attachIO = (io) => {
  ioRef = io;
};

const getStatus = () => ({
  installed: Boolean(Client),
  status: state.status,
  isReady: state.status === 'READY',
  qrDataUrl: state.qrDataUrl,
  connectedPhone: state.connectedPhone,
  connectedName: state.connectedName,
  lastError: state.lastError,
  updatedAt: state.updatedAt,
});

const initializeWhatsAppWeb = async () => {
  if (!Client) {
    state.status = 'ERROR';
    state.lastError = 'Paket whatsapp-web.js belum terpasang di backend.';
    emitState();
    return getStatus();
  }

  if (client && ['INITIALIZING', 'QR_READY', 'AUTHENTICATED', 'READY'].includes(state.status)) {
    return getStatus();
  }

  state.status = 'INITIALIZING';
  state.qrRaw = null;
  state.qrDataUrl = null;
  state.lastError = null;
  emitState();

  const executablePath = findBrowserExecutable();
  const authDir = path.resolve(__dirname, '../../.wwebjs_auth');

  client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'ferrymarket-bot',
      dataPath: authDir,
    }),
    puppeteer: {
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', async (qr) => {
    try {
      state.status = 'QR_READY';
      state.qrRaw = qr;
      state.qrDataUrl = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
      state.lastError = null;
      console.log('📱 [WhatsApp-Web.js] QR Code siap di-scan di Dashboard Admin -> WhatsApp & Telegram!');
      emitState();
    } catch (err) {
      state.lastError = err.message;
      emitState();
    }
  });

  client.on('authenticated', () => {
    state.status = 'AUTHENTICATED';
    state.qrRaw = null;
    state.qrDataUrl = null;
    state.lastError = null;
    console.log('🔐 [WhatsApp-Web.js] Berhasil autentikasi, menyiapkan sesi...');
    emitState();
  });

  client.on('ready', () => {
    state.status = 'READY';
    state.qrRaw = null;
    state.qrDataUrl = null;
    state.lastError = null;
    state.connectedPhone = client?.info?.wid?.user || null;
    state.connectedName = client?.info?.pushname || 'WhatsApp FerryMarket';
    console.log(`✅ [WhatsApp-Web.js] Terhubung sebagai ${state.connectedName} (+${state.connectedPhone})`);
    emitState();
  });

  client.on('auth_failure', (msg) => {
    state.status = 'ERROR';
    state.lastError = `Autentikasi WhatsApp gagal: ${msg}`;
    state.qrDataUrl = null;
    console.error('❌ [WhatsApp-Web.js] Auth failure:', msg);
    emitState();
  });

  client.on('disconnected', (reason) => {
    state.status = 'DISCONNECTED';
    state.connectedPhone = null;
    state.connectedName = null;
    state.qrDataUrl = null;
    state.lastError = `Terputus: ${reason}`;
    client = null;
    console.warn('⚠️ [WhatsApp-Web.js] Disconnected:', reason);
    emitState();
  });

  client.initialize().catch((err) => {
    state.status = 'ERROR';
    state.lastError = err.message;
    client = null;
    console.error('❌ [WhatsApp-Web.js] Initialize error:', err.message);
    emitState();
  });

  return getStatus();
};

const disconnectWhatsAppWeb = async () => {
  if (client) {
    try {
      await client.logout();
    } catch {
      // ignore if already logged out
    }
    try {
      await client.destroy();
    } catch {
      // ignore
    }
    client = null;
  }
  state.status = 'DISCONNECTED';
  state.qrRaw = null;
  state.qrDataUrl = null;
  state.connectedPhone = null;
  state.connectedName = null;
  state.lastError = null;
  emitState();
  return getStatus();
};

const sendViaWhatsAppWeb = async (phoneDigits, message) => {
  if (!client || state.status !== 'READY') {
    throw new Error('WhatsApp Web belum terhubung. Scan QR WhatsApp di Dashboard Admin -> WhatsApp & Telegram.');
  }

  // Verify number registration on WhatsApp (resolves exact @c.us / @lid chat ID)
  const numberId = await client.getNumberId(phoneDigits);
  const chatId = numberId?._serialized || `${phoneDigits}@c.us`;
  const sent = await client.sendMessage(chatId, message);
  return {
    id: sent?.id?._serialized || null,
    to: chatId,
    timestamp: sent?.timestamp || Math.floor(Date.now() / 1000),
  };
};

module.exports = {
  attachIO,
  getStatus,
  initializeWhatsAppWeb,
  disconnectWhatsAppWeb,
  sendViaWhatsAppWeb,
};
