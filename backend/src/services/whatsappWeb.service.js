const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const QRCode = require('qrcode');

let Client = null;
let LocalAuth = null;

const SESSION_CLIENT_ID = 'ferrymarket-bot';
const AUTH_DIR = path.resolve(__dirname, '../../.wwebjs_auth');
const SESSION_DIR = path.join(AUTH_DIR, `session-${SESSION_CLIENT_ID}`);

// Lazy-load whatsapp-web.js only when explicitly needed so serverless deploys (Vercel) don't bundle Puppeteer
const loadWhatsAppWebPkg = () => {
  if (Client && LocalAuth) return true;
  if (process.env.VERCEL === '1') return false;
  try {
    const pkgName = 'whatsapp-web.js';
    ({ Client, LocalAuth } = require(pkgName));
    return true;
  } catch {
    return false;
  }
};

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

const killOrphanedSessionBrowsers = () =>
  new Promise((resolve) => {
    if (process.platform === 'win32') {
      const psScript = `
        Get-CimInstance Win32_Process |
        Where-Object {
          ($_.Name -eq 'chrome.exe' -or $_.Name -eq 'msedge.exe') -and
          $_.CommandLine -like '*session-${SESSION_CLIENT_ID}*'
        } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      `;
      execFile(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', psScript],
        { timeout: 10000 },
        () => resolve()
      );
    } else {
      execFile('pkill', ['-f', `session-${SESSION_CLIENT_ID}`], { timeout: 5000 }, () => resolve());
    }
  });

const removeStaleLockFiles = () => {
  const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'DevToolsActivePort', 'lockfile'];
  for (const name of lockFiles) {
    const target = path.join(SESSION_DIR, name);
    try {
      if (fs.existsSync(target)) {
        fs.rmSync(target, { force: true });
      }
    } catch {
      // ignore if already gone
    }
  }
};

const clearSessionDir = () => {
  try {
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    }
  } catch {
    // ignore
  }
};

let client = null;
let ioRef = null;
let shouldClearSessionNextInit = false;
let initializingPromise = null;
let domQrWatcher = null;

const stopDomQrWatcher = () => {
  if (domQrWatcher) {
    clearInterval(domQrWatcher);
    domQrWatcher = null;
  }
};

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
  installed: Boolean(Client || loadWhatsAppWebPkg()),
  status: state.status,
  isReady: state.status === 'READY',
  qrDataUrl: state.qrDataUrl,
  connectedPhone: state.connectedPhone,
  connectedName: state.connectedName,
  lastError: state.lastError,
  updatedAt: state.updatedAt,
});

const destroyClientSafely = async (targetClient) => {
  if (!targetClient) return;
  try {
    await targetClient.destroy();
  } catch {
    // ignore
  }
};

const initializeWhatsAppWeb = async () => {
  if (!loadWhatsAppWebPkg()) {
    state.status = 'ERROR';
    state.lastError =
      process.env.VERCEL === '1'
        ? 'Mode whatsapp-web tidak didukung di Vercel Serverless. Gunakan WHATSAPP_PROVIDER=fonnte atau Telegram Bot API.'
        : 'Paket whatsapp-web.js belum terpasang di backend.';
    emitState();
    return getStatus();
  }

  if (initializingPromise) {
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

  initializingPromise = (async () => {
    // 1. Clean up any existing client, orphaned Chrome processes, and Chromium lock files
    if (client) {
      const old = client;
      client = null;
      await destroyClientSafely(old);
    }
    await killOrphanedSessionBrowsers();
    await new Promise((r) => setTimeout(r, 400));

    if (shouldClearSessionNextInit) {
      clearSessionDir();
      shouldClearSessionNextInit = false;
    } else {
      removeStaleLockFiles();
    }

    const executablePath = findBrowserExecutable();

    const newClient = new Client({
      authStrategy: new LocalAuth({
        clientId: SESSION_CLIENT_ID,
        dataPath: AUTH_DIR,
      }),
      authTimeoutMs: 60000,
      puppeteer: {
        headless: true,
        timeout: 60000,
        protocolTimeout: 60000,
        ...(executablePath ? { executablePath } : {}),
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });
    client = newClient;

    newClient.on('qr', async (qr) => {
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

    newClient.on('authenticated', () => {
      state.status = 'AUTHENTICATED';
      state.qrRaw = null;
      state.qrDataUrl = null;
      state.lastError = null;
      console.log('🔐 [WhatsApp-Web.js] Berhasil autentikasi, menyiapkan sesi...');
      emitState();
    });

    newClient.on('ready', () => {
      stopDomQrWatcher();
      state.status = 'READY';
      state.qrRaw = null;
      state.qrDataUrl = null;
      state.lastError = null;
      state.connectedPhone = newClient?.info?.wid?.user || null;
      state.connectedName = newClient?.info?.pushname || 'WhatsApp FerryMarket';
      console.log(`✅ [WhatsApp-Web.js] Terhubung sebagai ${state.connectedName} (+${state.connectedPhone})`);
      emitState();
    });

    newClient.on('auth_failure', async (msg) => {
      stopDomQrWatcher();
      state.status = 'ERROR';
      state.lastError = `Autentikasi WhatsApp gagal: ${msg}`;
      state.qrDataUrl = null;
      shouldClearSessionNextInit = true;
      if (client === newClient) client = null;
      console.error('❌ [WhatsApp-Web.js] Auth failure:', msg);
      emitState();
      await destroyClientSafely(newClient);
      await killOrphanedSessionBrowsers();
    });

    newClient.on('disconnected', async (reason) => {
      stopDomQrWatcher();
      state.status = 'DISCONNECTED';
      state.connectedPhone = null;
      state.connectedName = null;
      state.qrDataUrl = null;
      state.lastError = `Terputus: ${reason}`;
      if (String(reason || '').toUpperCase().includes('LOGOUT')) {
        shouldClearSessionNextInit = true;
      }
      if (client === newClient) client = null;
      console.warn('⚠️ [WhatsApp-Web.js] Disconnected:', reason);
      emitState();
      await destroyClientSafely(newClient);
      await killOrphanedSessionBrowsers();
    });

    // Fallback DOM QR watcher for WhatsApp Web's new /login/ flow (renders QR in ~4s even when legacy socket hook lags)
    stopDomQrWatcher();
    const startedAt = Date.now();
    let reinjectTriggered = false;
    domQrWatcher = setInterval(async () => {
      if (client !== newClient || ['READY', 'DISCONNECTED', 'ERROR'].includes(state.status)) {
        stopDomQrWatcher();
        return;
      }
      try {
        const page = newClient.pupPage;
        if (!page || page.isClosed()) return;

        const domInfo = await page.evaluate(() => {
          const qrEl = document.querySelector('[data-ref]');
          const dataRef = qrEl ? qrEl.getAttribute('data-ref') : null;
          const canvas = document.querySelector('canvas');
          let canvasUrl = null;
          if (!dataRef && canvas) {
            try {
              canvasUrl = canvas.toDataURL('image/png');
            } catch {
              canvasUrl = null;
            }
          }
          const isLoginRoute = location.pathname.startsWith('/login');
          const hasApp = Boolean(document.querySelector('#pane-side'));
          const hasWWebJs = typeof window.WWebJS !== 'undefined';
          return { dataRef, canvasUrl, isLoginRoute, hasApp, hasWWebJs };
        });

        if (domInfo.dataRef && domInfo.dataRef !== state.qrRaw) {
          state.status = 'QR_READY';
          state.qrRaw = domInfo.dataRef;
          state.qrDataUrl = await QRCode.toDataURL(domInfo.dataRef, { width: 280, margin: 2 });
          state.lastError = null;
          console.log('📱 [WhatsApp-Web.js] QR Code (DOM /login/) siap di-scan!');
          emitState();
        } else if (!domInfo.dataRef && domInfo.canvasUrl && !state.qrDataUrl && domInfo.isLoginRoute) {
          state.status = 'QR_READY';
          state.qrDataUrl = domInfo.canvasUrl;
          state.lastError = null;
          emitState();
        } else if (domInfo.hasApp && !domInfo.isLoginRoute) {
          if (state.status !== 'AUTHENTICATED' && state.status !== 'READY') {
            state.status = 'AUTHENTICATED';
            state.qrRaw = null;
            state.qrDataUrl = null;
            emitState();
          }
          if (!domInfo.hasWWebJs && !reinjectTriggered && typeof newClient.inject === 'function') {
            reinjectTriggered = true;
            newClient.inject().catch(() => {
              reinjectTriggered = false;
            });
          }
        } else if (state.status === 'INITIALIZING' && Date.now() - startedAt > 45000) {
          stopDomQrWatcher();
          state.status = 'ERROR';
          state.lastError =
            'Waktu tunggu habis saat membuka web.whatsapp.com. Pastikan koneksi internet stabil lalu klik Hubungkan lagi.';
          emitState();
          if (client === newClient) client = null;
          await destroyClientSafely(newClient);
          await killOrphanedSessionBrowsers();
        }
      } catch {
        // Page is navigating between /login/ and / — ignore transient evaluation error
      }
    }, 1500);

    try {
      await newClient.initialize();
    } catch (err) {
      stopDomQrWatcher();
      state.status = 'ERROR';
      state.lastError = err.message;
      if (client === newClient) client = null;
      await destroyClientSafely(newClient);
      await killOrphanedSessionBrowsers();
      console.error('❌ [WhatsApp-Web.js] Initialize error:', err.message);
      emitState();
    }
  })().finally(() => {
    initializingPromise = null;
  });

  return getStatus();
};

const closeBrowserOnly = async () => {
  stopDomQrWatcher();
  if (client) {
    const old = client;
    client = null;
    await destroyClientSafely(old);
  }
  await killOrphanedSessionBrowsers();
};

const disconnectWhatsAppWeb = async () => {
  stopDomQrWatcher();
  if (client) {
    const old = client;
    client = null;
    try {
      await old.logout();
    } catch {
      // ignore if already logged out
    }
    await destroyClientSafely(old);
  }
  await killOrphanedSessionBrowsers();
  shouldClearSessionNextInit = true;
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
  closeBrowserOnly,
  sendViaWhatsAppWeb,
};
