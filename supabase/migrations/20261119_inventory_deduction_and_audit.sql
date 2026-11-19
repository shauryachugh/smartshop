-- ==============================================================================
-- SHOPSMART AI — INVENTORY DEDUCTION & AUDIT LOG MIGRATION
-- ==============================================================================
-- 1. Adds inventory_deducted column to public.orders
-- 2. Creates public.inventory_audit_log table with RLS & indexes
-- 3. Creates public.deliver_order_and_deduct_inventory() RPC function
-- 4. Creates public.adjust_product_stock() RPC function
-- ==============================================================================

-- 1. Ensure inventory_deducted column exists on public.orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS inventory_deducted BOOLEAN DEFAULT false;

-- 2. Create Inventory Audit Log Table
CREATE TABLE IF NOT EXISTS public.inventory_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    change_amount INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_by TEXT DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_product_id ON public.inventory_audit_log (product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_order_id ON public.inventory_audit_log (order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_audit_log_created_at ON public.inventory_audit_log (created_at DESC);

-- Enable RLS
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view inventory audit logs" ON public.inventory_audit_log;
CREATE POLICY "Admins can view inventory audit logs"
    ON public.inventory_audit_log FOR SELECT
    USING (public.is_admin() OR auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR current_user = 'anon');

DROP POLICY IF EXISTS "System and admins can insert inventory audit logs" ON public.inventory_audit_log;
CREATE POLICY "System and admins can insert inventory audit logs"
    ON public.inventory_audit_log FOR INSERT
    WITH CHECK (true);

-- 3. Atomic Order Delivery & Inventory Deduction RPC Function
CREATE OR REPLACE FUNCTION public.deliver_order_and_deduct_inventory(p_order_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_target_prod_id UUID;
    v_curr_stock INTEGER;
    v_prod_name TEXT;
    v_new_stock INTEGER;
    v_new_avail TEXT;
    v_deducted_count INTEGER := 0;
BEGIN
    -- 1. Lock the order row to prevent race conditions & concurrent execution
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Order not found with ID: ' || p_order_id::text
        );
    END IF;

    -- 2. Idempotency guard: If order is already delivered or inventory was already deducted
    IF v_order.order_status = 'delivered' 
       OR v_order.inventory_deducted = true 
       OR (v_order.shipping_address->>'inventory_deducted') = 'true' THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order is already marked as delivered; inventory was previously deducted.',
            'already_deducted', true,
            'order_id', p_order_id
        );
    END IF;

    -- 3. Stock Availability Verification Phase (All items must have sufficient stock before any update)
    FOR v_item IN
        SELECT oi.product_id, oi.product_name, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        v_target_prod_id := NULL;
        v_curr_stock := NULL;
        v_prod_name := NULL;

        -- Try finding by product_id first
        IF v_item.product_id IS NOT NULL THEN
            SELECT id, stock_quantity, name INTO v_target_prod_id, v_curr_stock, v_prod_name
            FROM public.products
            WHERE id = v_item.product_id
            FOR UPDATE;
        END IF;

        -- Fallback: match by product name if product_id is null or not found
        IF v_target_prod_id IS NULL AND v_item.product_name IS NOT NULL THEN
            SELECT id, stock_quantity, name INTO v_target_prod_id, v_curr_stock, v_prod_name
            FROM public.products
            WHERE lower(name) = lower(v_item.product_name)
            LIMIT 1
            FOR UPDATE;
        END IF;

        IF v_target_prod_id IS NOT NULL THEN
            IF v_curr_stock < v_item.quantity THEN
                RETURN jsonb_build_object(
                    'success', false,
                    'error', format('Insufficient stock for "%s". Ordered: %s, Available: %s. Delivery cancelled to prevent negative inventory.',
                        COALESCE(v_prod_name, v_item.product_name), v_item.quantity, v_curr_stock),
                    'product_id', v_target_prod_id,
                    'available_stock', v_curr_stock,
                    'required_quantity', v_item.quantity
                );
            END IF;
        END IF;
    END LOOP;

    -- 4. Deduction & Audit Log Phase
    FOR v_item IN
        SELECT oi.product_id, oi.product_name, oi.quantity
        FROM public.order_items oi
        WHERE oi.order_id = p_order_id
    LOOP
        v_target_prod_id := NULL;
        v_curr_stock := NULL;
        v_prod_name := NULL;

        IF v_item.product_id IS NOT NULL THEN
            SELECT id, stock_quantity, name INTO v_target_prod_id, v_curr_stock, v_prod_name
            FROM public.products
            WHERE id = v_item.product_id
            FOR UPDATE;
        END IF;

        IF v_target_prod_id IS NULL AND v_item.product_name IS NOT NULL THEN
            SELECT id, stock_quantity, name INTO v_target_prod_id, v_curr_stock, v_prod_name
            FROM public.products
            WHERE lower(name) = lower(v_item.product_name)
            LIMIT 1
            FOR UPDATE;
        END IF;

        IF v_target_prod_id IS NOT NULL THEN
            v_new_stock := GREATEST(0, v_curr_stock - v_item.quantity);
            v_new_avail := CASE 
                WHEN v_new_stock = 0 THEN 'Out of Stock'
                WHEN v_new_stock < 10 THEN 'Low Stock'
                ELSE 'In Stock'
            END;

            -- Deduct stock
            UPDATE public.products
            SET stock_quantity = v_new_stock,
                availability = v_new_avail,
                updated_at = NOW()
            WHERE id = v_target_prod_id;

            -- Record audit log
            INSERT INTO public.inventory_audit_log (
                product_id,
                product_name,
                order_id,
                change_amount,
                previous_stock,
                new_stock,
                reason,
                created_by
            ) VALUES (
                v_target_prod_id,
                COALESCE(v_prod_name, v_item.product_name),
                p_order_id,
                -v_item.quantity,
                v_curr_stock,
                v_new_stock,
                'order_delivery',
                'admin_delivery_fulfillment'
            );

            v_deducted_count := v_deducted_count + 1;
        END IF;
    END LOOP;

    -- 5. Mark Order as Delivered with inventory_deducted flag
    UPDATE public.orders
    SET order_status = 'delivered',
        inventory_deducted = true,
        shipping_address = jsonb_set(COALESCE(shipping_address, '{}'::jsonb), '{inventory_deducted}', 'true'::jsonb),
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'status', 'delivered',
        'deducted_items_count', v_deducted_count,
        'message', format('Successfully delivered order %s and deducted stock for %s product(s).', p_order_id, v_deducted_count)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atomic Product Stock Adjustment RPC Function
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_product_id UUID,
    p_adjustment INTEGER,
    p_reason TEXT DEFAULT 'manual_adjustment'
)
RETURNS JSONB AS $$
DECLARE
    v_curr_stock INTEGER;
    v_new_stock INTEGER;
    v_prod_name TEXT;
    v_new_avail TEXT;
BEGIN
    SELECT stock_quantity, name INTO v_curr_stock, v_prod_name
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Product not found with ID: ' || p_product_id::text);
    END IF;

    v_new_stock := v_curr_stock + p_adjustment;
    IF v_new_stock < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Cannot reduce stock below 0. Current stock: %s, Requested adjustment: %s.', v_curr_stock, p_adjustment),
            'current_stock', v_curr_stock
        );
    END IF;

    v_new_avail := CASE 
        WHEN v_new_stock = 0 THEN 'Out of Stock'
        WHEN v_new_stock < 10 THEN 'Low Stock'
        ELSE 'In Stock'
    END;

    UPDATE public.products
    SET stock_quantity = v_new_stock,
        availability = v_new_avail,
        updated_at = NOW()
    WHERE id = p_product_id;

    INSERT INTO public.inventory_audit_log (
        product_id,
        product_name,
        change_amount,
        previous_stock,
        new_stock,
        reason,
        created_by
    ) VALUES (
        p_product_id,
        v_prod_name,
        p_adjustment,
        v_curr_stock,
        v_new_stock,
        p_reason,
        'admin_manual_adjustment'
    );

    RETURN jsonb_build_object(
        'success', true,
        'product_id', p_product_id,
        'previous_stock', v_curr_stock,
        'new_stock', v_new_stock,
        'availability', v_new_avail
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.deliver_order_and_deduct_inventory(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(UUID, INTEGER, TEXT) TO authenticated, anon, service_role;
