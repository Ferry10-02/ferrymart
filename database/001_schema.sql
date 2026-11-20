-- ==============================================================================
-- FERRYMARKET - 001_schema.sql
-- Complete Multi-Seller Marketplace Database Schema (Supabase PostgreSQL)
-- ==============================================================================
-- Jalankan file SQL secara berurutan:
--   001_schema.sql -> 002_indexes.sql -> 003_rls_policies.sql ->
--   004_functions.sql -> 005_triggers.sql -> 006_seed.sql
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==============================================================================
-- 1. PROFILES (Akun & Profil Pengguna)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email                     VARCHAR(255) NOT NULL UNIQUE,
    password_hash             TEXT NOT NULL,
    full_name                 VARCHAR(150) NOT NULL,
    phone                     VARCHAR(30),
    telegram_chat_id          VARCHAR(64),
    avatar_url                TEXT,
    is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
    is_suspended              BOOLEAN NOT NULL DEFAULT FALSE,
    suspended_reason          TEXT,
    email_verified_at         TIMESTAMPTZ,
    reset_password_token      VARCHAR(255),
    reset_password_expires_at TIMESTAMPTZ,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 2. USER_ROLES (Role Pengguna: BUYER, SELLER, ADMIN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_roles (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL CHECK (role IN ('BUYER', 'SELLER', 'ADMIN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

-- ==============================================================================
-- 3. SELLER_PROFILES (Profil & Verifikasi Toko Seller)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    store_name          VARCHAR(150) NOT NULL,
    store_slug          VARCHAR(180) NOT NULL UNIQUE,
    description         TEXT,
    logo_url            TEXT,
    banner_url          TEXT,
    phone               VARCHAR(30),
    address             TEXT,
    city                VARCHAR(100),
    province            VARCHAR(100),
    postal_code         VARCHAR(20),
    bank_name           VARCHAR(100),
    bank_account_number VARCHAR(60),
    bank_account_holder VARCHAR(150),
    verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED')),
    verification_note   TEXT,
    verified_at         TIMESTAMPTZ,
    verified_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
    total_sales         INTEGER NOT NULL DEFAULT 0 CHECK (total_sales >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. ADDRESSES (Alamat Pengiriman Pengguna)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.addresses (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label          VARCHAR(60) NOT NULL DEFAULT 'Rumah',
    recipient_name VARCHAR(150) NOT NULL,
    phone          VARCHAR(30) NOT NULL,
    address_line   TEXT NOT NULL,
    district       VARCHAR(100),
    city           VARCHAR(100) NOT NULL,
    province       VARCHAR(100) NOT NULL,
    postal_code    VARCHAR(20) NOT NULL,
    is_default     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. CATEGORIES (Kategori Produk)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(120) NOT NULL,
    slug        VARCHAR(150) NOT NULL UNIQUE,
    icon        VARCHAR(80),
    image_url   TEXT,
    description TEXT,
    parent_id   UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. PRODUCTS (Produk Marketplace)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id         UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    category_id       UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    name              VARCHAR(220) NOT NULL,
    slug              VARCHAR(255) NOT NULL UNIQUE,
    sku               VARCHAR(100),
    description       TEXT NOT NULL,
    price             NUMERIC(14,2) NOT NULL CHECK (price >= 0),
    compare_at_price  NUMERIC(14,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
    stock             INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    weight_grams      INTEGER NOT NULL DEFAULT 500 CHECK (weight_grams > 0),
    condition         VARCHAR(20) NOT NULL DEFAULT 'NEW' CHECK (condition IN ('NEW', 'USED')),
    status            VARCHAR(30) NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'MODERATED_REJECTED')),
    moderation_note   TEXT,
    is_flash_sale     BOOLEAN NOT NULL DEFAULT FALSE,
    flash_sale_price  NUMERIC(14,2) CHECK (flash_sale_price IS NULL OR flash_sale_price >= 0),
    flash_sale_ends_at TIMESTAMPTZ,
    is_featured       BOOLEAN NOT NULL DEFAULT FALSE,
    sold_count        INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
    view_count        INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
    rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0.00 CHECK (rating_avg >= 0 AND rating_avg <= 5),
    review_count      INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    qr_code_url       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. PRODUCT_IMAGES (Galeri Foto Produk)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_images (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url  TEXT NOT NULL,
    alt_text   VARCHAR(200),
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. PRODUCT_VARIANTS (Variasi Produk: Warna, Ukuran, Kapasitas, dll.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.product_variants (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    value            VARCHAR(100) NOT NULL,
    sku              VARCHAR(100),
    price_adjustment NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    stock            INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    image_url        TEXT,
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_product_variant_name_value UNIQUE (product_id, name, value)
);

-- ==============================================================================
-- 9. CARTS (Keranjang Belanja per Pembeli)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.carts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. CART_ITEMS (Item dalam Keranjang Belanja)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id  UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id  UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_selected BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. WISHLISTS (Produk Favorit Pembeli)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_wishlists_user_product UNIQUE (user_id, product_id)
);

-- ==============================================================================
-- 12. COUPONS (Voucher & Kupon Diskon)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(50) NOT NULL UNIQUE,
    seller_id      UUID REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    discount_type  VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC(14,2) NOT NULL CHECK (discount_value > 0),
    min_purchase   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (min_purchase >= 0),
    max_discount   NUMERIC(14,2) CHECK (max_discount IS NULL OR max_discount >= 0),
    usage_limit    INTEGER CHECK (usage_limit IS NULL OR usage_limit > 0),
    used_count     INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    starts_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at     TIMESTAMPTZ,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 13. SHIPPING_METHODS (Metode Pengiriman)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code           VARCHAR(50) NOT NULL UNIQUE,
    name           VARCHAR(120) NOT NULL,
    courier        VARCHAR(80) NOT NULL,
    description    TEXT,
    base_cost      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_cost >= 0),
    cost_per_kg    NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_per_kg >= 0),
    estimated_days VARCHAR(60) NOT NULL DEFAULT '2-4 hari',
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 14. ORDERS (Pesanan Induk / Master Checkout Pembeli)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number              VARCHAR(40) NOT NULL UNIQUE,
    buyer_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    address_id                UUID REFERENCES public.addresses(id) ON DELETE SET NULL,
    shipping_address_snapshot JSONB NOT NULL,
    coupon_id                 UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
    subtotal                  NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    shipping_total            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (shipping_total >= 0),
    service_fee               NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    discount_total            NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_total >= 0),
    grand_total               NUMERIC(14,2) NOT NULL CHECK (grand_total >= 0),
    status                    VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT'
                              CHECK (status IN (
                                'PENDING_PAYMENT',
                                'WAITING_VERIFICATION',
                                'PAID',
                                'PROCESSING',
                                'SHIPPED',
                                'DELIVERED',
                                'COMPLETED',
                                'CANCELLED',
                                'REFUNDED'
                              )),
    notes                     TEXT,
    created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 15. SELLER_ORDERS (Sub-Pesanan yang Dipisahkan per Seller)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_orders (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_id          UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE RESTRICT,
    sub_order_number   VARCHAR(45) NOT NULL UNIQUE,
    shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE RESTRICT,
    subtotal           NUMERIC(14,2) NOT NULL CHECK (subtotal >= 0),
    shipping_cost      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    service_fee        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (service_fee >= 0),
    seller_payout      NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (seller_payout >= 0),
    status             VARCHAR(30) NOT NULL DEFAULT 'PENDING_PAYMENT'
                       CHECK (status IN (
                         'PENDING_PAYMENT',
                         'WAITING_VERIFICATION',
                         'PAID',
                         'CONFIRMED',
                         'PROCESSING',
                         'SHIPPED',
                         'DELIVERED',
                         'COMPLETED',
                         'CANCELLED',
                         'REFUNDED'
                       )),
    buyer_note         TEXT,
    seller_note        TEXT,
    confirmed_at       TIMESTAMPTZ,
    shipped_at         TIMESTAMPTZ,
    delivered_at       TIMESTAMPTZ,
    completed_at       TIMESTAMPTZ,
    cancelled_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 16. ORDER_ITEMS (Detail Item Produk dalam Pesanan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id               UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_order_id        UUID NOT NULL REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    product_id             UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    variant_id             UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
    product_name_snapshot  VARCHAR(220) NOT NULL,
    variant_name_snapshot  VARCHAR(200),
    product_image_snapshot TEXT,
    unit_price             NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
    quantity               INTEGER NOT NULL CHECK (quantity > 0),
    total_price            NUMERIC(14,2) NOT NULL CHECK (total_price >= 0),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 17. PAYMENTS (Pembayaran Manual & Verifikasi Admin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_method_code VARCHAR(60) NOT NULL,
    payment_method_name VARCHAR(150) NOT NULL,
    payment_destination TEXT NOT NULL,
    amount              NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING', 'WAITING_VERIFICATION', 'APPROVED', 'REJECTED', 'REFUNDED')),
    verified_by         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at         TIMESTAMPTZ,
    rejection_reason    TEXT,
    admin_notes         TEXT,
    expires_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 18. PAYMENT_PROOFS (Bukti Transfer / Pembayaran Manual Pembeli)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.payment_proofs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id      UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
    uploaded_by     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    file_url        TEXT NOT NULL,
    sender_name     VARCHAR(150) NOT NULL,
    sender_bank     VARCHAR(100) NOT NULL,
    transfer_amount NUMERIC(14,2) NOT NULL CHECK (transfer_amount > 0),
    transfer_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 19. SHIPMENTS (Informasi Pengiriman & Resi per Seller Order)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.shipments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_order_id    UUID NOT NULL UNIQUE REFERENCES public.seller_orders(id) ON DELETE CASCADE,
    shipping_method_id UUID NOT NULL REFERENCES public.shipping_methods(id) ON DELETE RESTRICT,
    courier_name       VARCHAR(100) NOT NULL,
    tracking_number    VARCHAR(120),
    status             VARCHAR(30) NOT NULL DEFAULT 'PREPARING'
                       CHECK (status IN ('PREPARING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED')),
    shipped_at         TIMESTAMPTZ,
    delivered_at       TIMESTAMPTZ,
    tracking_history   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 20. REVIEWS (Rating & Ulasan Produk)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id        UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    seller_id         UUID NOT NULL REFERENCES public.seller_profiles(id) ON DELETE CASCADE,
    order_item_id     UUID UNIQUE REFERENCES public.order_items(id) ON DELETE SET NULL,
    buyer_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating            INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment           TEXT,
    images            JSONB NOT NULL DEFAULT '[]'::jsonb,
    seller_reply      TEXT,
    seller_replied_at TIMESTAMPTZ,
    is_visible        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 21. CONVERSATIONS (Ruang Percakapan Chat Realtime)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           UUID REFERENCES public.products(id) ON DELETE SET NULL,
    order_id             UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    last_message_at      TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 22. CONVERSATION_MEMBERS (Anggota Percakapan untuk Kontrol Akses)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversation_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    last_read_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conversation_member UNIQUE (conversation_id, user_id)
);

-- ==============================================================================
-- 23. MESSAGES (Pesan Chat Teks & Gambar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content         TEXT,
    image_url       TEXT,
    message_type    VARCHAR(20) NOT NULL DEFAULT 'TEXT'
                    CHECK (message_type IN ('TEXT', 'IMAGE', 'PRODUCT_REF', 'ORDER_REF')),
    status          VARCHAR(20) NOT NULL DEFAULT 'SENT'
                    CHECK (status IN ('SENT', 'DELIVERED', 'READ')),
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_message_content_or_image CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

-- ==============================================================================
-- 24. NOTIFICATIONS (Notifikasi In-App)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type       VARCHAR(60) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    body       TEXT NOT NULL,
    data       JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 25. NOTIFICATION_LOGS (Log Pengiriman WhatsApp, Telegram & In-App)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    channel           VARCHAR(20) NOT NULL CHECK (channel IN ('WHATSAPP', 'TELEGRAM', 'IN_APP')),
    event_type        VARCHAR(60) NOT NULL,
    recipient         VARCHAR(150) NOT NULL,
    payload           JSONB NOT NULL DEFAULT '{}'::jsonb,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'NOT_CONFIGURED')),
    provider_response JSONB,
    error_message     TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 26. BANNERS (Banner Promosi Homepage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.banners (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title      VARCHAR(180) NOT NULL,
    subtitle   TEXT,
    image_url  TEXT NOT NULL,
    link_url   TEXT,
    position   VARCHAR(30) NOT NULL DEFAULT 'HERO'
               CHECK (position IN ('HERO', 'PROMO_SIDE', 'MIDDLE', 'CATEGORY')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    starts_at  TIMESTAMPTZ,
    ends_at    TIMESTAMPTZ,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 27. PLATFORM_SETTINGS (Pengaturan Marketplace & Pembayaran Manual)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       JSONB NOT NULL DEFAULT '{}'::jsonb,
    category    VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    description TEXT,
    is_public   BOOLEAN NOT NULL DEFAULT FALSE,
    updated_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 28. ADMIN_ACTIVITY_LOGS (Audit Trail Aktivitas Admin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(60) NOT NULL,
    entity_id   VARCHAR(100),
    details     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address  VARCHAR(64),
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 29. ADMIN_PERMISSIONS (Hak Akses Granular Admin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    permission VARCHAR(80) NOT NULL,
    granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admin_user_permission UNIQUE (user_id, permission)
);
