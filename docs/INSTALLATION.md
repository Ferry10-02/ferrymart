# Panduan Instalasi & Konfigurasi — FerryMarket

## 1. Persyaratan Sistem
- **Node.js** v20+ (direkomendasikan v20 LTS atau v22/v24)
- **npm** v10+
- Akun **Supabase** (PostgreSQL + Storage)

## 2. Konfigurasi Database Supabase
1. Buat project baru di [Supabase](https://supabase.com).
2. Buka **SQL Editor** dan jalankan file SQL di folder `database/` secara berurutan:
   - `database/001_schema.sql`
   - `database/002_indexes.sql`
   - `database/003_rls_policies.sql`
   - `database/004_functions.sql`
   - `database/005_triggers.sql`
   - `database/006_seed.sql`
3. Buka **Storage** di Supabase dan buat dua bucket:
   - `ferrymarket-media` (Public) — untuk foto produk, avatar, banner, dan gambar chat.
   - `ferrymarket-payment-proofs` (Private) — untuk bukti transfer manual pembeli.
   *(Catatan: Jika kredensial Supabase Storage belum diisi di `.env`, backend otomatis memakai penyimpanan lokal `backend/uploads/` sebagai fallback pengembangan.)*

## 3. Konfigurasi Environment Variables
1. Salin `.env.example` menjadi `backend/.env` lalu isi:
   - `DATABASE_URL` (Supabase Transaction Pooler port `6543` dengan `?pgbouncer=true&connection_limit=1`)
   - `DIRECT_URL` (Supabase Direct/Session connection port `5432`)
   - `JWT_SECRET` dan `JWT_REFRESH_SECRET` (gunakan string acak 64+ karakter)
   - `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` (khusus backend, JANGAN taruh di frontend!)
2. Buat `frontend/.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   VITE_SOCKET_URL=http://localhost:5000
   VITE_APP_URL=http://localhost:5173
   VITE_APP_NAME=FerryMarket
   ```

## 4. Instalasi & Menjalankan Backend
```bash
cd FerryMarket/backend
npm install
npm run prisma:generate
npm run dev
```
Backend berjalan di `http://localhost:5000`.

## 5. Instalasi & Menjalankan Frontend
```bash
cd FerryMarket/frontend
npm install
npm run dev
```
Frontend berjalan di `http://localhost:5173`.

## 6. Pembuatan Akun Pengujian (Prosedur Aman)
FerryMarket **tidak menyimpan password hardcoded** di dalam kode atau SQL:
1. **Membuat Super Admin**:
   ```bash
   cd FerryMarket/backend
   npm run seed:admin
   ```
   Masukkan email, nama, dan password kuat melalui prompt interaktif (atau via env `ADMIN_EMAIL` & `ADMIN_PASSWORD`).
2. **Membuat Akun Seller**:
   Buka `http://localhost:5173/register?role=SELLER`, daftarkan akun dan nama toko, lalu verifikasi toko tersebut melalui Dashboard Admin -> **Verifikasi Seller**.
3. **Membuat Akun Buyer**:
   Buka `http://localhost:5173/register` dan daftar sebagai Pembeli (`BUYER`).

## 7. Konfigurasi WhatsApp & Telegram (Opsional)
- **WhatsApp Cloud API (Meta) / Fonnte / Wablas**: Isi `WHATSAPP_PROVIDER`, `WHATSAPP_API_URL`, `WHATSAPP_API_TOKEN`, dan `WHATSAPP_ADMIN_PHONE` di `backend/.env`.
- **Telegram Bot API**: Buat bot di `@BotFather`, salin token ke `TELEGRAM_BOT_TOKEN`, dan isi `TELEGRAM_ADMIN_CHAT_ID` di `backend/.env`.
- Cek status koneksi di Dashboard Admin -> **WhatsApp & Telegram**.
