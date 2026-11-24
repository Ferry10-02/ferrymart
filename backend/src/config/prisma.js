const { PrismaClient } = require('@prisma/client');

const globalForPrisma = global;

const TRANSIENT_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017', 'P2024']);

const isTransientConnectionError = (err) => {
  if (!err) return false;
  if (TRANSIENT_CODES.has(err.code)) return true;
  const msg = String(err.message || '');
  return (
    msg.includes("Can't reach database server") ||
    msg.includes('Server has closed the connection') ||
    msg.includes('Connection terminated') ||
    msg.includes('Timed out fetching a new connection') ||
    msg.includes('Error in PostgreSQL connection') ||
    msg.includes('Engine is not yet connected') ||
    msg.includes('ECONNRESET') ||
    msg.includes('ETIMEDOUT')
  );
};

const createPrismaClient = () => {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    transactionOptions: {
      maxWait: 15000,
      timeout: 30000,
    },
  });

  // Auto-retry transient Supabase/network disconnects (P1001/P1017/ECONNRESET) up to 2 times with backoff
  const extended = base.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          let lastError;
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              return await query(args);
            } catch (err) {
              lastError = err;
              if (!isTransientConnectionError(err) || attempt === 2) {
                throw err;
              }
              await new Promise((r) => setTimeout(r, attempt === 0 ? 350 : 900));
              await base.$connect().catch(() => {});
            }
          }
          throw lastError;
        },
      },
    },
  });

  // Keep TCP connection warm on persistent servers (disabled on Vercel Serverless)
  if (process.env.VERCEL !== '1' && !globalForPrisma.prismaKeepAlive) {
    globalForPrisma.prismaKeepAlive = setInterval(() => {
      base.$queryRaw`SELECT 1`.catch(() => {});
    }, 55000);
    globalForPrisma.prismaKeepAlive.unref?.();
  }

  return extended;
};

const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

module.exports = prisma;
