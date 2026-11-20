-- ==============================================================================
-- FERRYMARKET - 003_rls_policies.sql
-- Row Level Security (RLS) Policies for Supabase PostgreSQL
-- ==============================================================================
-- Catatan Keamanan:
-- - Backend Express memakai koneksi database/service_role dengan validasi JWT & ownership.
-- - Kebijakan RLS ini melindungi akses langsung Supabase Data API (PostgREST) menggunakan
--   auth.uid() atau current_setting('app.current_user_id', true).
-- - JANGAN PERNAH mengekspos SUPABASE_SERVICE_ROLE_KEY ke frontend.
-- ==============================================================================

-- Helper internal untuk mendapatkan ID user aktif secara aman (mendukung Supabase Auth & app session)
CREATE OR REPLACE FUNCTION public.fn_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        auth.uid(),
        NULLIF(current_setting('app.current_user_id', true), '')::uuid
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        WHERE ur.user_id = p_user_id
          AND ur.role = p_role
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_has_admin_permission(p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.admin_permissions ap ON ap.user_id = ur.user_id
        WHERE ur.user_id = p_user_id
          AND ur.role = 'ADMIN'
          AND (ap.permission = 'SUPER_ADMIN' OR ap.permission = p_permission)
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_get_seller_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT sp.id
    FROM public.seller_profiles sp
    WHERE sp.user_id = p_user_id
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_conversation_member(p_conversation_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.conversation_members cm
        WHERE cm.conversation_id = p_conversation_id
          AND cm.user_id = p_user_id
    );
$$;

-- ==============================================================================
-- ENABLE RLS ON ALL 29 TABLES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 1. PROFILES
-- ==============================================================================
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
    FOR SELECT USING (
        id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_USERS')
    );

DROP POLICY IF EXISTS profiles_update_own_or_admin ON public.profiles;
CREATE POLICY profiles_update_own_or_admin ON public.profiles
    FOR UPDATE USING (
        id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_USERS')
    );

-- ==============================================================================
-- 2. USER_ROLES
-- ==============================================================================
DROP POLICY IF EXISTS user_roles_select_own_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_own_or_admin ON public.user_roles
    FOR SELECT USING (
        user_id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_USERS')
    );

DROP POLICY IF EXISTS user_roles_manage_admin ON public.user_roles;
CREATE POLICY user_roles_manage_admin ON public.user_roles
    FOR ALL USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_USERS')
    );

-- ==============================================================================
-- 3. SELLER_PROFILES
-- ==============================================================================
DROP POLICY IF EXISTS seller_profiles_select_public_verified ON public.seller_profiles;
CREATE POLICY seller_profiles_select_public_verified ON public.seller_profiles
    FOR SELECT USING (
        verification_status = 'VERIFIED'
        OR user_id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SELLERS')
    );

DROP POLICY IF EXISTS seller_profiles_update_own_or_admin ON public.seller_profiles;
CREATE POLICY seller_profiles_update_own_or_admin ON public.seller_profiles
    FOR UPDATE USING (
        user_id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SELLERS')
    );

DROP POLICY IF EXISTS seller_profiles_insert_own ON public.seller_profiles;
CREATE POLICY seller_profiles_insert_own ON public.seller_profiles
    FOR INSERT WITH CHECK (user_id = public.fn_current_user_id());

-- ==============================================================================
-- 4. ADDRESSES (Strictly Buyer Own Data)
-- ==============================================================================
DROP POLICY IF EXISTS addresses_own_all ON public.addresses;
CREATE POLICY addresses_own_all ON public.addresses
    FOR ALL USING (user_id = public.fn_current_user_id())
    WITH CHECK (user_id = public.fn_current_user_id());

-- ==============================================================================
-- 5. CATEGORIES
-- ==============================================================================
DROP POLICY IF EXISTS categories_select_public ON public.categories;
CREATE POLICY categories_select_public ON public.categories
    FOR SELECT USING (
        is_active = TRUE
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_CATEGORIES')
    );

DROP POLICY IF EXISTS categories_manage_admin ON public.categories;
CREATE POLICY categories_manage_admin ON public.categories
    FOR ALL USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_CATEGORIES')
    );

-- ==============================================================================
-- 6, 7, 8. PRODUCTS, PRODUCT_IMAGES, PRODUCT_VARIANTS
-- ==============================================================================
DROP POLICY IF EXISTS products_select_active_or_owner_admin ON public.products;
CREATE POLICY products_select_active_or_owner_admin ON public.products
    FOR SELECT USING (
        status = 'ACTIVE'
        OR seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
    );

DROP POLICY IF EXISTS products_manage_seller_or_admin ON public.products;
CREATE POLICY products_manage_seller_or_admin ON public.products
    FOR ALL USING (
        seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
    )
    WITH CHECK (
        seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
    );

DROP POLICY IF EXISTS product_images_select ON public.product_images;
CREATE POLICY product_images_select ON public.product_images
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND (
                  p.status = 'ACTIVE'
                  OR p.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
                  OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
              )
        )
    );

DROP POLICY IF EXISTS product_images_manage ON public.product_images;
CREATE POLICY product_images_manage ON public.product_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND (
                  p.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
                  OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
              )
        )
    );

DROP POLICY IF EXISTS product_variants_select ON public.product_variants;
CREATE POLICY product_variants_select ON public.product_variants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND (
                  p.status = 'ACTIVE'
                  OR p.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
                  OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
              )
        )
    );

DROP POLICY IF EXISTS product_variants_manage ON public.product_variants;
CREATE POLICY product_variants_manage ON public.product_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.id = product_id
              AND (
                  p.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
                  OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
              )
        )
    );

-- ==============================================================================
-- 9, 10, 11. CARTS, CART_ITEMS, WISHLISTS (Strictly Own Data)
-- ==============================================================================
DROP POLICY IF EXISTS carts_own_all ON public.carts;
CREATE POLICY carts_own_all ON public.carts
    FOR ALL USING (user_id = public.fn_current_user_id())
    WITH CHECK (user_id = public.fn_current_user_id());

DROP POLICY IF EXISTS cart_items_own_all ON public.cart_items;
CREATE POLICY cart_items_own_all ON public.cart_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_id AND c.user_id = public.fn_current_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.carts c
            WHERE c.id = cart_id AND c.user_id = public.fn_current_user_id()
        )
    );

DROP POLICY IF EXISTS wishlists_own_all ON public.wishlists;
CREATE POLICY wishlists_own_all ON public.wishlists
    FOR ALL USING (user_id = public.fn_current_user_id())
    WITH CHECK (user_id = public.fn_current_user_id());

-- ==============================================================================
-- 12, 13. COUPONS & SHIPPING_METHODS
-- ==============================================================================
DROP POLICY IF EXISTS coupons_select ON public.coupons;
CREATE POLICY coupons_select ON public.coupons
    FOR SELECT USING (
        is_active = TRUE
        OR seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SETTINGS')
    );

DROP POLICY IF EXISTS coupons_manage ON public.coupons;
CREATE POLICY coupons_manage ON public.coupons
    FOR ALL USING (
        seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SETTINGS')
    );

DROP POLICY IF EXISTS shipping_methods_select ON public.shipping_methods;
CREATE POLICY shipping_methods_select ON public.shipping_methods
    FOR SELECT USING (
        is_active = TRUE
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SETTINGS')
    );

DROP POLICY IF EXISTS shipping_methods_manage ON public.shipping_methods;
CREATE POLICY shipping_methods_manage ON public.shipping_methods
    FOR ALL USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SETTINGS')
    );

-- ==============================================================================
-- 14, 15, 16. ORDERS, SELLER_ORDERS, ORDER_ITEMS
-- ==============================================================================
DROP POLICY IF EXISTS orders_select_authorized ON public.orders;
CREATE POLICY orders_select_authorized ON public.orders
    FOR SELECT USING (
        buyer_id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

DROP POLICY IF EXISTS orders_insert_buyer ON public.orders;
CREATE POLICY orders_insert_buyer ON public.orders
    FOR INSERT WITH CHECK (buyer_id = public.fn_current_user_id());

DROP POLICY IF EXISTS orders_update_admin ON public.orders;
CREATE POLICY orders_update_admin ON public.orders
    FOR UPDATE USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

DROP POLICY IF EXISTS seller_orders_select_authorized ON public.seller_orders;
CREATE POLICY seller_orders_select_authorized ON public.seller_orders
    FOR SELECT USING (
        seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.buyer_id = public.fn_current_user_id()
        )
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

DROP POLICY IF EXISTS seller_orders_update_seller_or_admin ON public.seller_orders;
CREATE POLICY seller_orders_update_seller_or_admin ON public.seller_orders
    FOR UPDATE USING (
        seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

DROP POLICY IF EXISTS order_items_select_authorized ON public.order_items;
CREATE POLICY order_items_select_authorized ON public.order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.buyer_id = public.fn_current_user_id()
        )
        OR EXISTS (
            SELECT 1 FROM public.seller_orders so
            WHERE so.id = seller_order_id
              AND so.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        )
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

-- ==============================================================================
-- 17, 18. PAYMENTS & PAYMENT_PROOFS (Strictly Buyer Owner & Authorized Admin)
-- ==============================================================================
DROP POLICY IF EXISTS payments_select_authorized ON public.payments;
CREATE POLICY payments_select_authorized ON public.payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.orders o
            WHERE o.id = order_id AND o.buyer_id = public.fn_current_user_id()
        )
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'VERIFY_PAYMENTS')
    );

DROP POLICY IF EXISTS payments_update_admin ON public.payments;
CREATE POLICY payments_update_admin ON public.payments
    FOR UPDATE USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'VERIFY_PAYMENTS')
    );

DROP POLICY IF EXISTS payment_proofs_select_authorized ON public.payment_proofs;
CREATE POLICY payment_proofs_select_authorized ON public.payment_proofs
    FOR SELECT USING (
        uploaded_by = public.fn_current_user_id()
        OR EXISTS (
            SELECT 1
            FROM public.payments p
            JOIN public.orders o ON o.id = p.order_id
            WHERE p.id = payment_id AND o.buyer_id = public.fn_current_user_id()
        )
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'VERIFY_PAYMENTS')
    );

DROP POLICY IF EXISTS payment_proofs_insert_buyer ON public.payment_proofs;
CREATE POLICY payment_proofs_insert_buyer ON public.payment_proofs
    FOR INSERT WITH CHECK (
        uploaded_by = public.fn_current_user_id()
        AND EXISTS (
            SELECT 1
            FROM public.payments p
            JOIN public.orders o ON o.id = p.order_id
            WHERE p.id = payment_id AND o.buyer_id = public.fn_current_user_id()
        )
    );

-- ==============================================================================
-- 19. SHIPMENTS
-- ==============================================================================
DROP POLICY IF EXISTS shipments_select_authorized ON public.shipments;
CREATE POLICY shipments_select_authorized ON public.shipments
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM public.seller_orders so
            JOIN public.orders o ON o.id = so.order_id
            WHERE so.id = seller_order_id
              AND (
                  o.buyer_id = public.fn_current_user_id()
                  OR so.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
              )
        )
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

DROP POLICY IF EXISTS shipments_manage_seller_or_admin ON public.shipments;
CREATE POLICY shipments_manage_seller_or_admin ON public.shipments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.seller_orders so
            WHERE so.id = seller_order_id
              AND so.seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        )
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_ORDERS')
    );

-- ==============================================================================
-- 20. REVIEWS
-- ==============================================================================
DROP POLICY IF EXISTS reviews_select_public ON public.reviews;
CREATE POLICY reviews_select_public ON public.reviews
    FOR SELECT USING (
        is_visible = TRUE
        OR buyer_id = public.fn_current_user_id()
        OR seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
    );

DROP POLICY IF EXISTS reviews_insert_buyer ON public.reviews;
CREATE POLICY reviews_insert_buyer ON public.reviews
    FOR INSERT WITH CHECK (buyer_id = public.fn_current_user_id());

DROP POLICY IF EXISTS reviews_update_owner_or_seller ON public.reviews;
CREATE POLICY reviews_update_owner_or_seller ON public.reviews
    FOR UPDATE USING (
        buyer_id = public.fn_current_user_id()
        OR seller_id = public.fn_get_seller_id(public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MODERATE_PRODUCTS')
    );

-- ==============================================================================
-- 21, 22, 23. CONVERSATIONS, CONVERSATION_MEMBERS, MESSAGES (Strictly Participants)
-- ==============================================================================
DROP POLICY IF EXISTS conversations_select_member ON public.conversations;
CREATE POLICY conversations_select_member ON public.conversations
    FOR SELECT USING (
        public.fn_is_conversation_member(id, public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'VIEW_CHATS')
    );

DROP POLICY IF EXISTS conversation_members_select_member ON public.conversation_members;
CREATE POLICY conversation_members_select_member ON public.conversation_members
    FOR SELECT USING (
        public.fn_is_conversation_member(conversation_id, public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'VIEW_CHATS')
    );

DROP POLICY IF EXISTS messages_select_member ON public.messages;
CREATE POLICY messages_select_member ON public.messages
    FOR SELECT USING (
        public.fn_is_conversation_member(conversation_id, public.fn_current_user_id())
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'VIEW_CHATS')
    );

DROP POLICY IF EXISTS messages_insert_member ON public.messages;
CREATE POLICY messages_insert_member ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = public.fn_current_user_id()
        AND public.fn_is_conversation_member(conversation_id, public.fn_current_user_id())
    );

-- ==============================================================================
-- 24, 25. NOTIFICATIONS & NOTIFICATION_LOGS
-- ==============================================================================
DROP POLICY IF EXISTS notifications_own_all ON public.notifications;
CREATE POLICY notifications_own_all ON public.notifications
    FOR ALL USING (user_id = public.fn_current_user_id())
    WITH CHECK (user_id = public.fn_current_user_id());

DROP POLICY IF EXISTS notification_logs_admin_only ON public.notification_logs;
CREATE POLICY notification_logs_admin_only ON public.notification_logs
    FOR SELECT USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_NOTIFICATIONS')
    );

-- ==============================================================================
-- 26, 27. BANNERS & PLATFORM_SETTINGS
-- ==============================================================================
DROP POLICY IF EXISTS banners_select_public ON public.banners;
CREATE POLICY banners_select_public ON public.banners
    FOR SELECT USING (
        is_active = TRUE
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_BANNERS')
    );

DROP POLICY IF EXISTS banners_manage_admin ON public.banners;
CREATE POLICY banners_manage_admin ON public.banners
    FOR ALL USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_BANNERS')
    );

DROP POLICY IF EXISTS platform_settings_select ON public.platform_settings;
CREATE POLICY platform_settings_select ON public.platform_settings
    FOR SELECT USING (
        is_public = TRUE
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SETTINGS')
    );

DROP POLICY IF EXISTS platform_settings_manage_admin ON public.platform_settings;
CREATE POLICY platform_settings_manage_admin ON public.platform_settings
    FOR ALL USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_SETTINGS')
    );

-- ==============================================================================
-- 28, 29. ADMIN_ACTIVITY_LOGS & ADMIN_PERMISSIONS
-- ==============================================================================
DROP POLICY IF EXISTS admin_activity_logs_admin_only ON public.admin_activity_logs;
CREATE POLICY admin_activity_logs_admin_only ON public.admin_activity_logs
    FOR SELECT USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'VIEW_LOGS')
    );

DROP POLICY IF EXISTS admin_permissions_select ON public.admin_permissions;
CREATE POLICY admin_permissions_select ON public.admin_permissions
    FOR SELECT USING (
        user_id = public.fn_current_user_id()
        OR public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_PERMISSIONS')
    );

DROP POLICY IF EXISTS admin_permissions_manage ON public.admin_permissions;
CREATE POLICY admin_permissions_manage ON public.admin_permissions
    FOR ALL USING (
        public.fn_has_admin_permission(public.fn_current_user_id(), 'MANAGE_PERMISSIONS')
    );
