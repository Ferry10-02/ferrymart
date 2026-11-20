# Dokumentasi Database — FerryMarket (Supabase PostgreSQL + Prisma)

Seluruh 29 tabel didefinisikan secara identik di `database/001_schema.sql` dan `backend/prisma/schema.prisma`.

## Daftar 29 Tabel

| No | Tabel SQL | Model Prisma | Deskripsi |
|---:|---|---|---|
| 1 | `profiles` | `Profile` | Akun pengguna, hash password Bcrypt, profil, telepon, Telegram Chat ID, status suspend, reset token |
| 2 | `user_roles` | `UserRole` | Role pengguna (`BUYER`, `SELLER`, `ADMIN`) |
| 3 | `seller_profiles` | `SellerProfile` | Profil toko seller, slug, rekening payout, status verifikasi (`PENDING`, `VERIFIED`, `REJECTED`, `SUSPENDED`) |
| 4 | `addresses` | `Address` | Buku alamat pengiriman pengguna (trigger menjamin 1 alamat default per user) |
| 5 | `categories` | `Category` | Kategori produk hierarkis (14 kategori awal di-seed di `006_seed.sql`) |
| 6 | `products` | `Product` | Data produk, harga, harga coret, stok, berat, flash sale, rating rata-rata, QR URL |
| 7 | `product_images` | `ProductImage` | Galeri foto produk (multi-foto) |
| 8 | `product_variants` | `ProductVariant` | Variasi produk (warna/ukuran), penyesuaian harga, stok per variasi |
| 9 | `carts` | `Cart` | Keranjang belanja unik per pembeli |
| 10 | `cart_items` | `CartItem` | Item keranjang dengan variasi & status seleksi checkout |
| 11 | `wishlists` | `Wishlist` | Produk favorit pembeli |
| 12 | `coupons` | `Coupon` | Kode voucher diskon persentase atau nominal tetap |
| 13 | `shipping_methods` | `ShippingMethod` | Metode pengiriman & tarif per kg |
| 14 | `orders` | `Order` | Pesanan induk checkout pembeli |
| 15 | `seller_orders` | `SellerOrder` | Sub-pesanan yang dipisahkan per seller dengan komisi & payout masing-masing |
| 16 | `order_items` | `OrderItem` | Snapshot item produk, variasi, dan harga saat checkout |
| 17 | `payments` | `Payment` | Pembayaran manual per order (`PENDING`, `WAITING_VERIFICATION`, `APPROVED`, `REJECTED`, `REFUNDED`) |
| 18 | `payment_proofs` | `PaymentProof` | Riwayat unggahan foto bukti transfer pembeli |
| 19 | `shipments` | `Shipment` | Data kurir, nomor resi, dan riwayat tracking JSONB per `seller_order` |
| 20 | `reviews` | `Review` | Rating (1-5), ulasan pembeli, dan balasan seller (trigger hitung ulang rating otomatis) |
| 21 | `conversations` | `Conversation` | Ruang percakapan chat realtime |
| 22 | `conversation_members` | `ConversationMember` | Daftar anggota percakapan untuk validasi hak akses |
| 23 | `messages` | `Message` | Pesan teks/gambar dengan status `SENT`, `DELIVERED`, `READ` |
| 24 | `notifications` | `Notification` | Notifikasi in-app pengguna |
| 25 | `notification_logs` | `NotificationLog` | Log pengiriman WhatsApp, Telegram, & In-App (`SENT`, `FAILED`, `NOT_CONFIGURED`) |
| 26 | `banners` | `Banner` | Banner promosi homepage (`HERO`, `PROMO_SIDE`, `MIDDLE`, `CATEGORY`) |
| 27 | `platform_settings` | `PlatformSetting` | Pengaturan situs, biaya layanan, metode pembayaran manual, toggle notifikasi |
| 28 | `admin_activity_logs` | `AdminActivityLog` | Audit trail aktivitas admin |
| 29 | `admin_permissions` | `AdminPermission` | Hak akses granular per akun admin |

## Keamanan Row Level Security (RLS)
File `database/003_rls_policies.sql` mengaktifkan RLS pada seluruh 29 tabel dengan fungsi helper `SECURITY DEFINER`:
- Pembeli hanya dapat membaca/mengubah alamat, keranjang, wishlist, pesanan, dan bukti pembayaran miliknya.
- Seller hanya dapat mengelola toko, produk, sub-pesanan, dan pengiriman tokonya sendiri.
- Percakapan dan pesan hanya dapat diakses oleh anggota yang terdaftar di `conversation_members`.
- Admin dikendalikan berdasarkan izin di `admin_permissions`.
