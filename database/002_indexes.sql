-- ==============================================================================
-- FERRYMARKET - 002_indexes.sql
-- Performance & Uniqueness Indexes
-- ==============================================================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_reset_token ON public.profiles(reset_password_token)
    WHERE reset_password_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- User Roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Seller Profiles
CREATE INDEX IF NOT EXISTS idx_seller_profiles_user_id ON public.seller_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_slug ON public.seller_profiles(store_slug);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_status ON public.seller_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_seller_profiles_rating ON public.seller_profiles(rating_avg DESC);

-- Addresses
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_addresses_single_default_per_user
    ON public.addresses(user_id)
    WHERE is_default = TRUE;

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active_sort ON public.categories(is_active, sort_order);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products(price);
CREATE INDEX IF NOT EXISTS idx_products_sold_count ON public.products(sold_count DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_flash_sale ON public.products(is_flash_sale, flash_sale_ends_at)
    WHERE is_flash_sale = TRUE AND status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured)
    WHERE is_featured = TRUE AND status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING GIN (name gin_trgm_ops);

-- Product Images & Variants
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);

-- Cart Items (Unique product+variant per cart, handles NULL variant_id)
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cart_items_product_variant
    ON public.cart_items(cart_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Wishlists
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists(product_id);

-- Coupons
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_seller_id ON public.coupons(seller_id);
CREATE INDEX IF NOT EXISTS idx_coupons_active_dates ON public.coupons(is_active, starts_at, expires_at);

-- Orders & Seller Orders & Order Items
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_seller_orders_order_id ON public.seller_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_orders_seller_id ON public.seller_orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_orders_status ON public.seller_orders(status);
CREATE INDEX IF NOT EXISTS idx_seller_orders_sub_number ON public.seller_orders(sub_order_number);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_order_id ON public.order_items(seller_order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- Payments & Payment Proofs
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON public.payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_uploaded_by ON public.payment_proofs(uploaded_by);

-- Shipments
CREATE INDEX IF NOT EXISTS idx_shipments_seller_order_id ON public.shipments(seller_order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking_number ON public.shipments(tracking_number);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON public.reviews(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_seller_id ON public.reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_reviews_buyer_id ON public.reviews(buyer_id);

-- Chat (Conversations, Members, Messages)
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON public.conversations(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id ON public.conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv_id ON public.conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Notifications & Notification Logs
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel_status ON public.notification_logs(channel, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);

-- Banners & Settings & Admin Logs
CREATE INDEX IF NOT EXISTS idx_banners_position_active ON public.banners(position, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_platform_settings_category ON public.platform_settings(category);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity ON public.admin_activity_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user_id ON public.admin_permissions(user_id);
