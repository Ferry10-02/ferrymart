# FerryMarket — Multi-Seller Marketplace Platform

**FerryMarket** adalah aplikasi marketplace multi-seller modern (terinspirasi Shopee) yang dibangun secara penuh (*full-stack*) menggunakan **JavaScript** (React + Vite + Tailwind CSS, Express.js + Prisma ORM + Socket.io, dan Supabase PostgreSQL + Storage).

---

## Fitur Utama

- **Sistem Pengguna & Role (`BUYER`, `SELLER`, `ADMIN`)**: Register, Login, Logout, Lupa Password, Reset Password, Profil & Foto Profil, Buku Alamat, Upgrade Buyer ke Seller, serta proteksi role dan hak akses granular.
- **Marketplace Pembeli Modern**: Hero banner slider, 14 kategori produk awal, pencarian & filter lengkap, Flash Sale, Produk Terlaris, Produk Diskon, Produk Terbaru, Rekomendasi, Detail Produk dengan variasi & ulasan, Wishlist, dan Halaman Toko Seller.
- **Keranjang & Checkout Multi-Seller**: Item dikelompokkan per seller dan saat checkout otomatis dipecah menjadi sub-pesanan terpisah (`seller_orders`) per seller beserta pilihan kurir masing-masing.
- **Pembayaran Manual Terverifikasi Admin**: Mendukung transfer bank manual & pembayaran manual lainnya yang dikonfigurasi Admin. Pembeli mengunggah bukti pembayaran, Admin memverifikasi (`PENDING`, `WAITING_VERIFICATION`, `APPROVED`, `REJECTED`, `REFUNDED`). Tidak mengklaim payment gateway otomatis.
- **QR Code Produk & Pesanan**: Generator QR Code di Dashboard Seller untuk setiap produk, serta QR Pesanan (`/qr/order/:orderNumber`) yang mewajibkan login dan verifikasi kepemilikan sebelum menampilkan data pesanan.
- **Dashboard Seller Lengkap**: Ringkasan penjualan, grafik pendapatan 14 hari, manajemen produk (multi-foto, harga, stok, variasi, flash sale), QR Code produk, pengelolaan pesanan & input nomor resi pengiriman, riwayat transaksi, laporan penjualan + ekspor CSV, chat pembeli, dan pengaturan toko.
- **Chat Realtime (Socket.io)**: Daftar percakapan, kirim teks & gambar, timestamp, status baca, indikator mengetik, dan kontrol ketat keanggotaan percakapan.
- **Notifikasi WhatsApp & Telegram**: Terintegrasi dari backend (WhatsApp Cloud API / Fonnte / Wablas & Telegram Bot API), mencatat seluruh log di `notification_logs`, dan secara jujur menampilkan status **Belum Terhubung** jika API belum dikonfigurasi.
- **Dashboard Admin Lengkap (16 Menu Sidebar)**: Dashboard, Pengguna, Seller, Verifikasi Seller, Produk, Kategori, Pesanan, Pembayaran, Verifikasi Pembayaran, Transaksi, Laporan, WhatsApp & Telegram, Chat, Log Aktivitas, Hak Akses Admin, dan Pengaturan Website (biaya layanan, metode pembayaran manual, banner promosi).

---

## Teknologi

| Layer | Teknologi |
|---|---|
| **Frontend** | React 18, Vite, JavaScript, Tailwind CSS, React Router v6, Axios, Socket.io Client, Lucide React, Recharts, qrcode.react |
| **Backend** | Node.js, Express.js, JavaScript, Prisma ORM v6, Socket.io, JWT, Bcrypt, Zod, Multer, Helmet, Express Rate Limit, QRCode |
| **Database & Storage** | Supabase PostgreSQL (29 tabel + Index + RLS Policies + Functions + Triggers + Seed), Supabase Storage |

---

## Struktur Folder

```text
FerryMarket/
  frontend/
    public/
    src/
      assets/
      components/
      context/
      hooks/
      layouts/
      pages/
        auth/
        buyer/
        seller/
        admin/
      services/
      utils/
      App.jsx
      main.jsx
    package.json
    vite.config.js

  backend/
    prisma/
      schema.prisma
    src/
      config/
      controllers/
      middleware/
      routes/
      services/
      socket/
      utils/
      app.js
      server.js
    package.json

  database/
    001_schema.sql
    002_indexes.sql
    003_rls_policies.sql
    004_functions.sql
    005_triggers.sql
    006_seed.sql
    README.md

  docs/
    PRD.md
    DATABASE.md
    API.md
    INSTALLATION.md

  .env.example
  .gitignore
  README.md
```

---

## Persyaratan Instalasi

- Node.js v20+
- npm v10+
- Project Supabase PostgreSQL (dan opsional Supabase Storage)

---

## Cara Install & Menjalankan Project

### 1. Konfigurasi Supabase & Menjalankan SQL

1. Buka Dashboard Supabase Anda -> **SQL Editor**.
2. Jalankan skrip SQL di folder `database/` secara **berurutan**:
   1. `database/001_schema.sql`
   2. `database/002_indexes.sql`
   3. `database/003_rls_policies.sql`
   4. `database/004_functions.sql`
   5. `database/005_triggers.sql`
   6. `database/006_seed.sql`
3. *(Opsional)* Buat bucket Storage di Supabase: `ferrymarket-media` (public) dan `ferrymarket-payment-proofs` (private). Jika belum dikonfigurasi, backend otomatis menggunakan folder lokal `backend/uploads/`.

### 2. Konfigurasi Environment Variables

Salin `.env.example` menjadi `backend/.env` dan sesuaikan nilainya (`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

> **PERINGATAN KEAMANAN**: Jangan pernah menaruh `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `WHATSAPP_API_TOKEN`, atau `TELEGRAM_BOT_TOKEN` di folder `frontend/` atau melakukan commit file `.env` ke Git.

Buat file `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
VITE_APP_URL=http://localhost:5173
VITE_APP_NAME=FerryMarket
```

### 3. Install & Jalankan Backend + Prisma

```bash
cd FerryMarket/backend
npm install
npm run prisma:validate
npm run prisma:generate
npm run dev
```

*(Untuk pengujian smoke test backend: `npm run test:smoke`)*

### 4. Install & Jalankan Frontend

```bash
cd FerryMarket/frontend
npm install
npm run dev
```

Akses aplikasi di `http://localhost:5173` (Backend API di `http://localhost:5000`).

---

## Pembuatan Akun & Role untuk Pengujian (Aman)

Tidak ada password default hardcoded di repositori ini. Gunakan prosedur berikut:

1. **Akun Admin (Super Admin)**:
   ```bash
   cd FerryMarket/backend
   npm run seed:admin
   ```
   Ikuti prompt terminal untuk mengisi email, nama, dan password kuat (minimal 8 karakter).
2. **Akun Seller**:
   Buka `http://localhost:5173/register?role=SELLER`, isi data pengguna & toko. Login sebagai Admin lalu setujui toko di menu **Verifikasi Seller**.
3. **Akun Buyer**:
   Buka `http://localhost:5173/register` dan daftar sebagai Pembeli.

---

## Konfigurasi WhatsApp & Telegram

Semua token integrasi hanya disimpan di `backend/.env`:

### WhatsApp API Provider
```env
WHATSAPP_PROVIDER=meta   # pilihan: meta | fonnte | wablas | custom
WHATSAPP_API_URL=https://graph.facebook.com/v20.0/<PHONE_NUMBER_ID>/messages
WHATSAPP_API_TOKEN=<TOKEN_PROVIDER_ANDA>
WHATSAPP_ADMIN_PHONE=6281234567890
```

### Telegram Bot API
1. Buat bot baru melalui `@BotFather` di Telegram dan dapatkan `TELEGRAM_BOT_TOKEN`.
2. Dapatkan Chat ID admin melalui `@userinfobot` atau API `getUpdates`.
3. Isi di `backend/.env`:
```env
TELEGRAM_BOT_TOKEN=<TOKEN_BOT_TELEGRAM>
TELEGRAM_ADMIN_CHAT_ID=<CHAT_ID_ADMIN>
```
Jika salah satu belum diisi, Dashboard Admin -> **WhatsApp & Telegram** akan menampilkan status **Belum Terhubung** dan log pengiriman akan tercatat sebagai `NOT_CONFIGURED`.

---

## Troubleshooting

- **Error `npm.ps1 cannot be loaded` di Windows PowerShell**: Jalankan perintah menggunakan `npm.cmd` dan `npx.cmd` (atau ubah execution policy di mesin Anda).
- **Koneksi Prisma ke Supabase gagal / timeout**: Pastikan `DATABASE_URL` menggunakan Transaction Pooler (port `6543` + `?pgbouncer=true&connection_limit=1`) dan `DIRECT_URL` menggunakan koneksi langsung (port `5432`).
- **CORS Error saat mengakses API dari frontend**: Pastikan `CORS_ORIGIN` di `backend/.env` sama persis dengan URL frontend (`http://localhost:5173`).
- **Upload gambar gagal di Supabase Storage**: Periksa nama bucket (`SUPABASE_STORAGE_BUCKET`) dan pastikan `SUPABASE_SERVICE_ROLE_KEY` valid; jika kosong, sistem otomatis memakai penyimpanan lokal `backend/uploads/`.

Dokumentasi tambahan tersedia di folder [`docs/`](./docs/PRD.md).
