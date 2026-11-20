# Dokumentasi REST API & Realtime Socket — FerryMarket

Base URL Default: `http://localhost:5000/api`
Autentikasi: Header `Authorization: Bearer <JWT_ACCESS_TOKEN>` atau cookie `HttpOnly` `fm_token`.

## 1. Health Check
- `GET /api/health` — Status server & status koneksi integrasi (Supabase Storage, WhatsApp, Telegram).

## 2. `/api/auth` — Autentikasi & Role
- `POST /api/auth/register` — Registrasi `BUYER` atau `SELLER` (tidak mengizinkan registrasi `ADMIN` publik).
- `POST /api/auth/login` — Login dengan email & password (Bcrypt + JWT).
- `POST /api/auth/logout` — Hapus sesi cookie.
- `GET /api/auth/me` — Data profil, role, toko seller, & izin admin pengguna aktif.
- `POST /api/auth/forgot-password` — Membuat token reset password aman (hash SHA-256).
- `POST /api/auth/reset-password` — Reset password menggunakan token.
- `PUT /api/auth/change-password` — Ubah password saat login.
- `POST /api/auth/open-store` — Upgrade akun Buyer menjadi Seller.

## 3. `/api/users` — Profil, Alamat & Favorit
- `GET /api/users/profile` | `PUT /api/users/profile`
- `POST /api/users/avatar` (multipart `avatar`)
- `GET /api/users/addresses` | `POST /api/users/addresses` | `PUT /api/users/addresses/:id` | `DELETE /api/users/addresses/:id`
- `GET /api/users/wishlists` | `POST /api/users/wishlists/toggle`

## 4. `/api/products` & `/api/categories` — Katalog Publik
- `GET /api/products/home` — Banner, 14 kategori, Flash Sale, Terlaris, Diskon, Terbaru, Rekomendasi.
- `GET /api/products` — Pencarian & filter (`q`, `category`, `minPrice`, `maxPrice`, `flashSale`, `discounted`, `sort`, `page`, `limit`).
- `GET /api/products/:slugOrId` — Detail produk, variasi, ulasan, info toko, produk terkait, & QR Code.
- `GET /api/products/:slugOrId/qr` — Generate QR Code URL produk.
- `GET /api/categories` | `GET /api/categories/:slug`
- Admin: `POST /api/categories` | `PUT /api/categories/:id` | `DELETE /api/categories/:id`

## 5. `/api/cart` & `/api/checkout` — Keranjang & Multi-Seller Checkout
- `GET /api/cart` — Item dikelompokkan per seller.
- `POST /api/cart/items` | `PUT /api/cart/items/:itemId` | `DELETE /api/cart/items/:itemId` | `DELETE /api/cart`
- `GET /api/checkout/options` — Alamat, kurir, metode pembayaran manual, biaya layanan, grup seller.
- `POST /api/checkout/validate-coupon` — Validasi kode kupon.
- `POST /api/checkout` — Transaksi atomik: validasi & potong stok, buat `orders` + pisahkan `seller_orders` per seller + buat `payments` manual.

## 6. `/api/orders`, `/api/payments`, `/api/shipments`, `/api/reviews`
- `GET /api/orders` | `GET /api/orders/:id`
- `GET /api/orders/qr/:orderNumber` — **Wajib Login + Ownership Check** (hanya Buyer pemilik, Seller terkait, atau Admin).
- `POST /api/orders/seller-orders/:sellerOrderId/complete` — Pembeli konfirmasi pesanan diterima.
- `POST /api/orders/:id/cancel` — Batalkan pesanan belum dibayar & kembalikan stok.
- `GET /api/payments/methods` | `GET /api/payments/order/:orderId`
- `POST /api/payments/:orderId/proof` (multipart `proof`) — Unggah bukti transfer manual.
- `GET /api/shipments/methods` | `GET /api/shipments/:sellerOrderId` | `POST /api/shipments/:sellerOrderId` (Seller).
- `GET /api/reviews/product/:productId` | `POST /api/reviews` | `PUT /api/reviews/:id/reply` (Seller).

## 7. `/api/sellers` — Dashboard Seller (Role `SELLER` & Kepemilikan Toko)
- `GET /api/sellers/store/:slug` (Publik)
- `GET /api/sellers/dashboard` — Statistik & grafik 14 hari.
- `GET /api/sellers/settings` | `PUT /api/sellers/settings` | `POST /api/sellers/media`
- `GET /api/sellers/products` | `POST /api/sellers/products` | `PUT /api/sellers/products/:id` | `DELETE /api/sellers/products/:id`
- `POST /api/sellers/products/upload-images` | `GET /api/sellers/products/:id/qr`
- `GET /api/sellers/orders` | `PUT /api/sellers/orders/:id/status` | `GET /api/sellers/transactions`

## 8. `/api/chat` & Socket.io — Chat Realtime
- REST: `GET /api/chat/conversations`, `POST /api/chat/conversations`, `GET /api/chat/conversations/:id/messages`, `POST /api/chat/conversations/:id/messages` (supports image upload).
- Socket.io Events (JWT Auth on handshake):
  - Client -> Server: `chat:join`, `chat:leave`, `chat:send`, `chat:mark_read`, `chat:typing`
  - Server -> Client: `chat:message`, `chat:read`, `chat:typing`, `chat:conversation_updated`, `notification:new`

## 9. `/api/notifications`, `/api/admin`, `/api/reports`
- `GET /api/notifications` | `PUT /api/notifications/:id/read` | `PUT /api/notifications/read-all`
- `GET /api/admin/dashboard`
- `GET /api/admin/users` | `PUT /api/admin/users/:id/suspend`
- `GET /api/admin/sellers` | `PUT /api/admin/sellers/:id/verify`
- `GET /api/admin/products` | `PUT /api/admin/products/:id/moderate`
- `GET /api/admin/orders` | `GET /api/admin/payments` | `PUT /api/admin/payments/:id/verify`
- `GET /api/admin/notifications` | `PUT /api/admin/notifications/settings` | `POST /api/admin/notifications/test`
- `GET /api/admin/chats` | `GET /api/admin/logs` | `GET /api/admin/permissions` | `PUT /api/admin/permissions/:userId`
- `GET/POST/PUT/DELETE /api/admin/banners` | `GET/PUT /api/admin/settings`
- `GET /api/reports/admin` | `GET /api/reports/seller`
