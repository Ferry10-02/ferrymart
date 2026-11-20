# Database Supabase SQL — FerryMarket

Direktori ini berisi seluruh skrip SQL PostgreSQL yang siap dijalankan di **Supabase SQL Editor** atau melalui `psql`.

## Urutan Eksekusi Wajib

Jalankan file SQL secara berurutan dari `001` sampai `006`:

1. `001_schema.sql` — Membuat 29 tabel utama dengan Primary Key UUID, Foreign Key cascade, `CHECK` constraint, dan `UNIQUE` constraint.
2. `002_indexes.sql` — Membuat index B-Tree, partial unique index, composite index, dan trigram (`pg_trgm`) index untuk pencarian produk cepat.
3. `003_rls_policies.sql` — Mengaktifkan Row Level Security (RLS) di seluruh 29 tabel beserta helper function keamanan dan policy per role (Buyer, Seller, Admin, Chat Member).
4. `004_functions.sql` — Membuat fungsi PostgreSQL untuk timestamp otomatis, generator nomor pesanan, kalkulasi ulang rating produk/toko, sinkronisasi status pesanan, dan statistik marketplace.
5. `005_triggers.sql` — Mendaftarkan seluruh trigger otomatis (`updated_at`, single default address, rating review, preview chat, dan sinkronisasi status order).
6. `006_seed.sql` — Mengisi data awal yang bersifat idempoten: 14 kategori awal, metode pengiriman, pengaturan metode pembayaran manual, biaya layanan, dan banner promosi.

## Cara Menjalankan di Supabase SQL Editor

1. Buka dashboard proyek Supabase Anda -> **SQL Editor**.
2. Salin isi `001_schema.sql` -> klik **Run**.
3. Ulangi berurutan untuk `002_indexes.sql`, `003_rls_policies.sql`, `004_functions.sql`, `005_triggers.sql`, dan `006_seed.sql`.

## Cara Menjalankan via `psql`

```bash
psql "$DIRECT_URL" -f database/001_schema.sql
psql "$DIRECT_URL" -f database/002_indexes.sql
psql "$DIRECT_URL" -f database/003_rls_policies.sql
psql "$DIRECT_URL" -f database/004_functions.sql
psql "$DIRECT_URL" -f database/005_triggers.sql
psql "$DIRECT_URL" -f database/006_seed.sql
```

## Sinkronisasi dengan Prisma

Seluruh 29 nama tabel dan kolom pada `001_schema.sql` telah diselaraskan 1-to-1 dengan `backend/prisma/schema.prisma`. Setelah SQL dijalankan, jalankan di folder `backend/`:

```bash
npm run prisma:generate
```

## Pembuatan Akun Pengujian (Aman)

Skrip SQL tidak menyimpan password plaintext. Buat akun Admin awal melalui CLI backend:

```bash
cd backend
npm run seed:admin
```
