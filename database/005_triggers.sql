-- ==============================================================================
-- FERRYMARKET - 005_triggers.sql
-- Automatic Triggers for Timestamps, Ratings, Chat, Address & Order Sync
-- ==============================================================================

-- 1. Automatic updated_at triggers
DO $$
DECLARE
    tbl TEXT;
    tables_with_updated_at TEXT[] := ARRAY[
        'profiles',
        'seller_profiles',
        'addresses',
        'categories',
        'products',
        'product_variants',
        'carts',
        'cart_items',
        'coupons',
        'shipping_methods',
        'orders',
        'seller_orders',
        'payments',
        'shipments',
        'reviews',
        'conversations',
        'banners',
        'platform_settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables_with_updated_at LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON public.%I;', tbl, tbl);
        EXECUTE format(
            'CREATE TRIGGER trg_%I_updated_at
             BEFORE UPDATE ON public.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.fn_set_updated_at();',
            tbl, tbl
        );
    END LOOP;
END;
$$;

-- 2. Single Default Address Trigger
DROP TRIGGER IF EXISTS trg_addresses_single_default ON public.addresses;
CREATE TRIGGER trg_addresses_single_default
    BEFORE INSERT OR UPDATE OF is_default ON public.addresses
    FOR EACH ROW
    WHEN (NEW.is_default = TRUE)
    EXECUTE FUNCTION public.fn_ensure_single_default_address();

-- 3. Automatic Product & Seller Rating Recalculation Trigger
DROP TRIGGER IF EXISTS trg_reviews_recalculate_ratings ON public.reviews;
CREATE TRIGGER trg_reviews_recalculate_ratings
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_on_review_change();

-- 4. Automatic Conversation Preview & Timestamp Trigger
DROP TRIGGER IF EXISTS trg_messages_update_conversation ON public.messages;
CREATE TRIGGER trg_messages_update_conversation
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_on_new_message();

-- 5. Automatic Order Status Synchronization from Seller Orders
DROP TRIGGER IF EXISTS trg_seller_orders_sync_master_order ON public.seller_orders;
CREATE TRIGGER trg_seller_orders_sync_master_order
    AFTER UPDATE OF status ON public.seller_orders
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION public.fn_sync_order_status_from_seller_orders();
