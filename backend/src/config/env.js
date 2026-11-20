const dotenv = require('dotenv');
const path = require('path');
const os = require('os');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Auto-detect active LAN IPv4 address so QR links work even when switching Wi-Fi networks
const detectLanIp = () => {
  const nets = os.networkInterfaces();
  const preferred = ['Wi-Fi', 'WLAN', 'Ethernet', 'en0', 'wlan0'];
  for (const name of [...preferred, ...Object.keys(nets)]) {
    const list = nets[name];
    if (!list) continue;
    for (const iface of list) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const lanIp = detectLanIp();
const resolvedAppUrl =
  !process.env.APP_URL || process.env.APP_URL === 'auto'
    ? `http://${lanIp}:5173`
    : process.env.APP_URL.replace(/\/$/, '');
const resolvedBackendUrl =
  !process.env.BACKEND_URL || process.env.BACKEND_URL === 'auto'
    ? `http://${lanIp}:${process.env.PORT || 5000}`
    : process.env.BACKEND_URL.replace(/\/$/, '');

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  appName: process.env.APP_NAME || 'FerryMarket',
  lanIp,
  appUrl: resolvedAppUrl,
  backendUrl: resolvedBackendUrl,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-change-jwt-secret-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-only-change-refresh-secret-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  bcryptSaltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10),

  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
    publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
    jwksUrl: process.env.SUPABASE_JWKS_URL || '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'ferrymarket-media',
    paymentProofBucket: process.env.SUPABASE_PAYMENT_PROOF_BUCKET || 'ferrymarket-payment-proofs',
    get isConfigured() {
      return Boolean(
        this.url &&
        this.serviceRoleKey &&
        !this.url.includes('your-project-ref') &&
        !this.serviceRoleKey.includes('your_supabase')
      );
    },
  },

  whatsapp: {
    provider: (process.env.WHATSAPP_PROVIDER || 'whatsapp-web').toLowerCase(),
    apiUrl: process.env.WHATSAPP_API_URL || '',
    apiToken: process.env.WHATSAPP_API_TOKEN || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    adminPhone: process.env.WHATSAPP_ADMIN_PHONE || '',
    get isConfigured() {
      if (this.provider === 'whatsapp-web') return true;
      return Boolean(this.apiUrl && this.apiToken && !this.apiUrl.includes('YOUR_PHONE_NUMBER_ID'));
    },
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || '',
    get isConfigured() {
      return Boolean(this.botToken);
    },
  },
};

module.exports = env;
