-- ==============================================================================
-- FERRYMARKET - 004_functions.sql
-- Reusable PostgreSQL Functions for Marketplace Operations
-- ==============================================================================

-- 1. Automatic updated_at timestamp setter
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. Generate unique master order number: FM-YYYYMMDD-XXXXXX
CREATE OR REPLACE FUNCTION public.fn_generate_order_number()
RETURNS VARCHAR(40)
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_rand   TEXT;
BEGIN
    v_prefix := 'FM-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
    v_rand   := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 6));
    RETURN v_prefix || v_rand;
END;
$$;

-- 3. Generate unique seller sub-order number: FMS-YYYYMMDD-XXXXXX
CREATE OR REPLACE FUNCTION public.fn_generate_sub_order_number()
RETURNS VARCHAR(45)
LANGUAGE plpgsql
AS $$
DECLARE
    v_prefix TEXT;
    v_rand   TEXT;
BEGIN
    v_prefix := 'FMS-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-';
    v_rand   := UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 6));
    RETURN v_prefix || v_rand;
END;
$$;

-- 4. Recalculate Product Rating Average & Review Count
CREATE OR REPLACE FUNCTION public.fn_recalculate_product_rating(p_product_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_avg   NUMERIC(3,2);
    v_count INTEGER;
BEGIN
    SELECT
        COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0.00),
        COUNT(*)::INTEGER
    INTO v_avg, v_count
    FROM public.reviews
    WHERE product_id = p_product_id
      AND is_visible = TRUE;

    UPDATE public.products
    SET rating_avg   = v_avg,
        review_count = v_count,
        updated_at   = NOW()
    WHERE id = p_product_id;
END;
$$;

-- 5. Recalculate Seller Rating Average
CREATE OR REPLACE FUNCTION public.fn_recalculate_seller_rating(p_seller_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_avg NUMERIC(3,2);
BEGIN
    SELECT COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0.00)
    INTO v_avg
    FROM public.reviews
    WHERE seller_id = p_seller_id
      AND is_visible = TRUE;

    UPDATE public.seller_profiles
    SET rating_avg = v_avg,
        updated_at = NOW()
    WHERE id = p_seller_id;
END;
$$;

-- 6. Trigger handler for review changes
CREATE OR REPLACE FUNCTION public.fn_on_review_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.fn_recalculate_product_rating(OLD.product_id);
        PERFORM public.fn_recalculate_seller_rating(OLD.seller_id);
        RETURN OLD;
    ELSE
        PERFORM public.fn_recalculate_product_rating(NEW.product_id);
        PERFORM public.fn_recalculate_seller_rating(NEW.seller_id);
        RETURN NEW;
    END IF;
END;
$$;

-- 7. Trigger handler to update conversation preview on new message
CREATE OR REPLACE FUNCTION public.fn_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_preview TEXT;
BEGIN
    IF NEW.content IS NOT NULL AND LENGTH(TRIM(NEW.content)) > 0 THEN
        v_preview := LEFT(TRIM(NEW.content), 120);
    ELSIF NEW.image_url IS NOT NULL THEN
        v_preview := '[Gambar]';
    ELSE
        v_preview := '[Pesan baru]';
    END IF;

    UPDATE public.conversations
    SET last_message_at      = NEW.created_at,
        last_message_preview = v_preview,
        updated_at           = NOW()
    WHERE id = NEW.conversation_id;

    RETURN NEW;
END;
$$;

-- 8. Ensure only one default address per user on INSERT/UPDATE
CREATE OR REPLACE FUNCTION public.fn_ensure_single_default_address()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_default = TRUE THEN
        UPDATE public.addresses
        SET is_default = FALSE
        WHERE user_id = NEW.user_id
          AND id <> NEW.id
          AND is_default = TRUE;
    END IF;
    RETURN NEW;
END;
$$;

-- 9. Synchronize Master Order status based on its Seller Orders
CREATE OR REPLACE FUNCTION public.fn_sync_order_status_from_seller_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total      INTEGER;
    v_completed  INTEGER;
    v_cancelled  INTEGER;
    v_refunded   INTEGER;
    v_shipped    INTEGER;
    v_delivered  INTEGER;
    v_processing INTEGER;
    v_new_status VARCHAR(30);
BEGIN
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'COMPLETED'),
        COUNT(*) FILTER (WHERE status = 'CANCELLED'),
        COUNT(*) FILTER (WHERE status = 'REFUNDED'),
        COUNT(*) FILTER (WHERE status = 'SHIPPED'),
        COUNT(*) FILTER (WHERE status = 'DELIVERED'),
        COUNT(*) FILTER (WHERE status IN ('CONFIRMED', 'PROCESSING'))
    INTO v_total, v_completed, v_cancelled, v_refunded, v_shipped, v_delivered, v_processing
    FROM public.seller_orders
    WHERE order_id = NEW.order_id;

    IF v_total = 0 THEN
        RETURN NEW;
    END IF;

    IF v_completed = v_total THEN
        v_new_status := 'COMPLETED';
    ELSIF v_refunded = v_total THEN
        v_new_status := 'REFUNDED';
    ELSIF v_cancelled = v_total THEN
        v_new_status := 'CANCELLED';
    ELSIF v_delivered > 0 AND (v_delivered + v_completed) = v_total THEN
        v_new_status := 'DELIVERED';
    ELSIF v_shipped > 0 THEN
        v_new_status := 'SHIPPED';
    ELSIF v_processing > 0 THEN
        v_new_status := 'PROCESSING';
    ELSE
        RETURN NEW;
    END IF;

    UPDATE public.orders
    SET status     = v_new_status,
        updated_at = NOW()
    WHERE id = NEW.order_id
      AND status <> v_new_status;

    RETURN NEW;
END;
$$;

-- 10. Marketplace Summary Metrics Function (for Admin Dashboard / Analytics)
CREATE OR REPLACE FUNCTION public.fn_get_marketplace_stats()
RETURNS TABLE (
    total_buyers          BIGINT,
    total_sellers         BIGINT,
    verified_sellers      BIGINT,
    total_products        BIGINT,
    active_products       BIGINT,
    total_orders          BIGINT,
    pending_verifications BIGINT,
    total_gmv             NUMERIC(16,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        (SELECT COUNT(DISTINCT user_id) FROM public.user_roles WHERE role = 'BUYER'),
        (SELECT COUNT(*) FROM public.seller_profiles),
        (SELECT COUNT(*) FROM public.seller_profiles WHERE verification_status = 'VERIFIED'),
        (SELECT COUNT(*) FROM public.products),
        (SELECT COUNT(*) FROM public.products WHERE status = 'ACTIVE'),
        (SELECT COUNT(*) FROM public.orders),
        (SELECT COUNT(*) FROM public.payments WHERE status = 'WAITING_VERIFICATION'),
        (SELECT COALESCE(SUM(grand_total), 0.00) FROM public.orders WHERE status IN ('PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'));
$$;
