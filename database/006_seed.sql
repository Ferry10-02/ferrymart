-- ==============================================================================
-- FERRYMARKET - 006_seed.sql
-- Initial Master Data: 14 Categories, Shipping Methods, Platform Settings & Banners
-- ==============================================================================
-- Catatan Keamanan:
-- File ini TIDAK memasukkan password plaintext atau akun hardcoded.
-- Gunakan script `npm run seed:admin` di backend atau endpoint `/api/auth/register`
-- untuk membuat akun Admin, Seller, dan Buyer secara aman dengan Bcrypt.
-- ==============================================================================

-- 1. 14 KATEGORI PRODUK AWAL FERRYMARKET
INSERT INTO public.categories (name, slug, icon, description, sort_order, is_active)
VALUES
    ('Elektronik', 'elektronik', 'Smartphone', 'Smartphone, TV, audio, kamera, dan perangkat elektronik modern', 1, TRUE),
    ('Fashion Pria', 'fashion-pria', 'Shirt', 'Pakaian, sepatu, jam tangan, dan gaya pria terkini', 2, TRUE),
    ('Fashion Wanita', 'fashion-wanita', 'ShoppingBag', 'Busana, tas, sepatu, dan aksesoris fashion wanita', 3, TRUE),
    ('Kecantikan', 'kecantikan', 'Sparkles', 'Skincare, makeup, parfum, dan perawatan tubuh', 4, TRUE),
    ('Kesehatan', 'kesehatan', 'HeartPulse', 'Vitamin, suplemen, alat kesehatan, dan medis rumah tangga', 5, TRUE),
    ('Rumah Tangga', 'rumah-tangga', 'Home', 'Perabot, dapur, dekorasi, dan perlengkapan rumah tangga', 6, TRUE),
    ('Makanan dan Minuman', 'makanan-dan-minuman', 'UtensilsCrossed', 'Snack, kopi, teh, bahan dapur, dan kuliner pilihan', 7, TRUE),
    ('Olahraga', 'olahraga', 'Dumbbell', 'Peralatan fitness, outdoor, sepeda, dan perlengkapan olahraga', 8, TRUE),
    ('Otomotif', 'otomotif', 'Car', 'Suku cadang, aksesoris mobil dan motor, serta perawatan kendaraan', 9, TRUE),
    ('Gaming', 'gaming', 'Gamepad2', 'Konsol, aksesoris gaming, kursi gaming, dan peripheral esports', 10, TRUE),
    ('Peralatan Komputer', 'peralatan-komputer', 'Laptop', 'Laptop, PC, monitor, keyboard, mouse, dan komponen komputer', 11, TRUE),
    ('Aksesoris', 'aksesoris', 'Watch', 'Kacamata, perhiasan, dompet, ikat pinggang, dan aksesoris harian', 12, TRUE),
    ('Perlengkapan Bayi', 'perlengkapan-bayi', 'Baby', 'Pakaian bayi, stroller, mainan edukatif, dan kebutuhan ibu & anak', 13, TRUE),
    ('Buku', 'buku', 'BookOpen', 'Buku fiksi, non-fiksi, bisnis, teknologi, dan alat tulis', 14, TRUE)
ON CONFLICT (slug) DO NOTHING;

-- 2. METODE PENGIRIMAN AWAL
INSERT INTO public.shipping_methods (code, name, courier, description, base_cost, cost_per_kg, estimated_days, is_active)
VALUES
    ('JNE_REG', 'JNE Reguler', 'JNE', 'Layanan pengiriman reguler ke seluruh Indonesia', 12000, 8000, '2-4 hari', TRUE),
    ('JNE_YES', 'JNE YES (Yakin Esok Sampai)', 'JNE', 'Pengiriman ekspres 1 hari sampai untuk kota besar', 28000, 15000, '1-2 hari', TRUE),
    ('JNT_EZ', 'J&T Express EZ', 'J&T Express', 'Pengiriman cepat dengan pelacakan realtime', 13000, 8000, '2-3 hari', TRUE),
    ('SICEPAT_REG', 'SiCepat REG', 'SiCepat', 'Pengiriman reguler hemat dan andal', 11000, 7500, '2-4 hari', TRUE),
    ('ANTERAJA_REG', 'AnterAja Reguler', 'AnterAja', 'Layanan pengiriman reguler nasional', 11500, 7500, '2-4 hari', TRUE),
    ('INSTANT_SAME_DAY', 'Pengiriman Instan / Same Day', 'Kurir Instan', 'Pengiriman di hari yang sama dalam satu kota', 35000, 10000, 'Hari yang sama', TRUE)
ON CONFLICT (code) DO NOTHING;

-- 3. PENGATURAN PLATFORM & METODE PEMBAYARAN MANUAL (DIKONFIGURASI ADMIN)
INSERT INTO public.platform_settings (key, value, category, description, is_public)
VALUES
    (
        'site_info',
        '{
            "site_name": "FerryMarket",
            "tagline": "Belanja Aman, Multi-Seller Terpercaya",
            "support_email": "support@ferrymarket.id",
            "support_phone": "+62 811-0000-0000",
            "currency": "IDR",
            "maintenance_mode": false
        }'::jsonb,
        'GENERAL',
        'Informasi dasar website FerryMarket',
        TRUE
    ),
    (
        'service_fee',
        '{
            "buyer_fee_flat": 2000,
            "seller_commission_percent": 2.5
        }'::jsonb,
        'FINANCE',
        'Biaya layanan pembeli (Rp) dan komisi marketplace seller (%)',
        TRUE
    ),
    (
        'manual_payment_methods',
        '[
            {
                "code": "BANK_BCA",
                "name": "Transfer Bank BCA (Manual)",
                "type": "BANK_TRANSFER",
                "account_number": "1234567890",
                "account_holder": "PT FerryMarket Nusantara",
                "instructions": "Transfer sesuai nominal total pesanan dan unggah bukti transfer untuk diverifikasi Admin FerryMarket.",
                "is_active": true
            },
            {
                "code": "BANK_MANDIRI",
                "name": "Transfer Bank Mandiri (Manual)",
                "type": "BANK_TRANSFER",
                "account_number": "1370009876543",
                "account_holder": "PT FerryMarket Nusantara",
                "instructions": "Transfer sesuai nominal total pesanan lalu unggah bukti transfer melalui halaman Detail Pesanan.",
                "is_active": true
            },
            {
                "code": "BANK_BRI",
                "name": "Transfer Bank BRI (Manual)",
                "type": "BANK_TRANSFER",
                "account_number": "001201009988301",
                "account_holder": "PT FerryMarket Nusantara",
                "instructions": "Lakukan transfer ke rekening BRI di atas dan unggah struk pembayaran untuk verifikasi manual.",
                "is_active": true
            },
            {
                "code": "QRIS_MANUAL",
                "name": "Pembayaran Manual QRIS / E-Wallet",
                "type": "MANUAL_OTHER",
                "account_number": "0811-0000-0000 (DANA/OVO/GoPay a.n. FerryMarket)",
                "account_holder": "PT FerryMarket Nusantara",
                "instructions": "Transfer manual via e-wallet sesuai total tagihan dan unggah screenshot bukti pembayaran.",
                "is_active": true
            }
        ]'::jsonb,
        'PAYMENT',
        'Daftar metode pembayaran manual yang diverifikasi oleh Admin (bukan payment gateway otomatis)',
        TRUE
    ),
    (
        'notification_channels',
        '{
            "whatsapp_enabled": true,
            "telegram_enabled": true,
            "events": {
                "ORDER_CREATED": true,
                "PAYMENT_UPLOADED": true,
                "PAYMENT_APPROVED": true,
                "ORDER_PROCESSING": true,
                "ORDER_SHIPPED": true,
                "ORDER_COMPLETED": true,
                "NEW_MESSAGE": true
            }
        }'::jsonb,
        'NOTIFICATIONS',
        'Toggle event notifikasi WhatsApp & Telegram (kredensial API disimpan di .env backend)',
        FALSE
    )
ON CONFLICT (key) DO NOTHING;

-- 4. BANNER PROMOSI AWAL
INSERT INTO public.banners (title, subtitle, image_url, link_url, position, sort_order, is_active)
SELECT
    v.title, v.subtitle, v.image_url, v.link_url, v.position, v.sort_order, v.is_active
FROM (
    VALUES
        (
            'Mega Flash Sale FerryMarket',
            'Diskon besar produk elektronik, fashion, dan rumah tangga langsung dari seller terverifikasi.',
            'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1400&q=80',
            '/products?flash_sale=true',
            'HERO',
            1,
            TRUE
        ),
        (
            'Upgrade Setup Kerja & Gaming',
            'Temukan laptop, monitor, dan aksesoris komputer terbaik dengan garansi resmi toko.',
            'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1400&q=80',
            '/products?category=peralatan-komputer',
            'HERO',
            2,
            TRUE
        ),
        (
            'Gaya Harian Fashion Pria & Wanita',
            'Koleksi terbaru dari brand lokal pilihan dengan promo voucher menarik.',
            'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1400&q=80',
            '/products?category=fashion-wanita',
            'HERO',
            3,
            TRUE
        ),
        (
            'Buka Toko Gratis di FerryMarket',
            'Jangkau ribuan pembeli dan kelola pesanan mudah dengan fitur QR Produk & Chat Realtime.',
            'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
            '/register?role=SELLER',
            'PROMO_SIDE',
            1,
            TRUE
        )
) AS v(title, subtitle, image_url, link_url, position, sort_order, is_active)
WHERE NOT EXISTS (
    SELECT 1 FROM public.banners b WHERE b.title = v.title
);
