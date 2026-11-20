const http = require('http');
const app = require('../app');
const { initSocket } = require('../socket');
const { generateProductQr, generateOrderQr } = require('../services/qr.service');
const { sanitizePayload, slugify, generateOrderNumber, generateSubOrderNumber } = require('../utils/sanitize');

async function runSmokeTests() {
  console.log('🧪 Running FerryMarket Backend Smoke Tests...\n');

  // 1. Verify Express App & Socket.io initialize cleanly
  const server = http.createServer(app);
  const io = initSocket(server);
  if (!io) throw new Error('Socket.io failed to initialize');

  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 2. Test /api/health
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status !== 200 || !healthJson.success) {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }
    console.log('✅ GET /api/health -> 200 OK');

    // 3. Test unauthorized access protection on protected endpoints
    const protectedEndpoints = [
      '/api/auth/me',
      '/api/cart',
      '/api/orders',
      '/api/orders/qr/FM-20260101-TEST01',
      '/api/sellers/dashboard',
      '/api/admin/dashboard',
      '/api/chat/conversations',
      '/api/notifications',
    ];

    for (const ep of protectedEndpoints) {
      const r = await fetch(`${baseUrl}${ep}`);
      if (r.status !== 401) {
        throw new Error(`Expected 401 on ${ep}, got ${r.status}`);
      }
    }
    console.log(`✅ Auth guards verified on ${protectedEndpoints.length} protected endpoints (401 Unauthorized)`);

    // 4. Test input validation rejects invalid registration payload
    const badReg = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123', fullName: 'A' }),
    });
    if (badReg.status !== 400) {
      throw new Error(`Expected 400 validation error on /api/auth/register, got ${badReg.status}`);
    }
    console.log('✅ Zod input validation verified (400 Bad Request on invalid payload)');

    // 5. Test 404 handler
    const nf = await fetch(`${baseUrl}/api/non-existent-route`);
    if (nf.status !== 404) {
      throw new Error(`Expected 404 on unknown route, got ${nf.status}`);
    }
    console.log('✅ 404 Not Found handler verified');

    // 6. Test QR code generation service
    const prodQr = await generateProductQr({ id: '123', slug: 'iphone-16-pro' });
    const orderQr = await generateOrderQr({ id: '456', orderNumber: 'FM-20261120-ABCDEF' });
    if (!prodQr.qrDataUrl.startsWith('data:image/png;base64,') || !orderQr.targetUrl.includes('/qr/order/FM-20261120-ABCDEF')) {
      throw new Error('QR service generated invalid payload');
    }
    console.log('✅ QR Service verified (Product URL & Authenticated Order URL)');

    // 7. Test XSS sanitization & order number utils
    const sanitized = sanitizePayload({ bio: '<script>alert(1)</script>Hello', password: '<script>keep</script>' });
    if (sanitized.bio !== 'Hello' || sanitized.password !== '<script>keep</script>') {
      throw new Error('Sanitization test failed');
    }
    if (!generateOrderNumber().startsWith('FM-') || !generateSubOrderNumber().startsWith('FMS-')) {
      throw new Error('Order number generator failed');
    }
    if (slugify('Laptop Gaming RTX 4060!') !== 'laptop-gaming-rtx-4060') {
      throw new Error('Slugify failed');
    }
    console.log('✅ Sanitization, Slugify & Order Number utilities verified');

    console.log('\n🎉 All Backend Smoke Tests PASSED!');
  } finally {
    io.close();
    server.close();
  }
}

runSmokeTests().catch((err) => {
  console.error('❌ Smoke test failed:', err);
  process.exit(1);
});
