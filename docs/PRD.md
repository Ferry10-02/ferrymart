# Product Requirements Document (PRD) — FerryMarket

## 1. Ringkasan Produk
**FerryMarket** adalah platform marketplace multi-seller modern berbasis web yang mempertemukan Pembeli (`BUYER`), Penjual (`SELLER`), dan Administrator (`ADMIN`) dalam satu ekosistem yang aman, transparan, dan terukur.

## 2. Peran Pengguna & Hak Akses
- **BUYER**: Menjelajah katalog, mencari & memfilter produk, wishlist, keranjang multi-seller, checkout lintas seller, pembayaran manual dengan unggah bukti transfer, melacak pengiriman, chat realtime dengan seller, memberi rating/ulasan, dan memindai QR Code produk/pesanan miliknya.
- **SELLER**: Mengelola profil toko & rekening pencairan, manajemen produk (foto, stok, harga, diskon/flash sale, variasi), QR Code Generator produk, memproses pesanan terverifikasi, mengatur pengiriman & resi, melihat riwayat transaksi & laporan penjualan, serta chat realtime dengan pembeli. Seller hanya dapat mengakses data tokonya sendiri.
- **ADMIN**: Dashboard analitik marketplace, manajemen pengguna & penangguhan akun, verifikasi toko seller, moderasi produk, manajemen kategori, pemantauan pesanan & transaksi, verifikasi bukti pembayaran manual (`PENDING`, `WAITING_VERIFICATION`, `APPROVED`, `REJECTED`, `REFUNDED`), pengaturan biaya layanan & metode pembayaran manual, banner promosi, integrasi & log notifikasi WhatsApp/Telegram, moderasi chat, log aktivitas audit, serta matriks hak akses admin granular.

## 3. Fitur Utama
1. **Marketplace Modern (Shopee-inspired)**: Hero slider, 14 kategori awal, Flash Sale, Terlaris, Diskon, Terbaru, Rekomendasi, halaman detail produk lengkap, dan halaman toko seller.
2. **Keranjang & Checkout Multi-Seller**: Item dikelompokkan per seller; saat checkout sistem otomatis membuat 1 `order` induk dan memecahnya menjadi `seller_orders` terpisah per seller lengkap dengan ongkir masing-masing kurir.
3. **Pembayaran Manual Terverifikasi Admin**: Pembeli memilih rekening bank/e-wallet manual yang dikonfigurasi Admin, mengunggah foto bukti transfer, lalu Admin memverifikasi sebelum seller memproses pesanan. Tidak mengklaim pembayaran otomatis payment gateway.
4. **Sistem QR Code Produk & Pesanan**:
   - QR Produk memuat URL publik `/products/:slug`.
   - QR Pesanan memuat URL `/qr/order/:orderNumber` yang **mewajibkan login** dan memeriksa kepemilikan (Buyer pemilik / Seller terkait / Admin) sebelum menampilkan status pesanan.
5. **Chat Realtime (Socket.io)**: Mendukung teks, lampiran gambar, timestamp, indikator baca (`SENT`/`READ`), typing indicator, dan proteksi ketat keanggotaan percakapan.
6. **Notifikasi WhatsApp & Telegram**: Dikelola dari backend menggunakan environment variables, mencatat seluruh status ke `notification_logs`, dan menampilkan status `Belum Terhubung` bila API key belum dikonfigurasi.
