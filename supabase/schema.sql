-- ==============================================================================
-- SHOPSMART AI — COMPLETE SUPABASE DATABASE SCHEMA MIGRATION
-- ==============================================================================
-- This script sets up all required tables, constraints, indexes, Row Level
-- Security (RLS) policies, and authentication triggers for ShopSmart AI.
--
-- Instructions: Run this script in your Supabase Project's SQL Editor:
-- https://supabase.com/dashboard/project/unectsmgytpitjaxdgru/sql
-- ==============================================================================

-- 1. Enable Cryptographic & UUID Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLE 1: PRODUCTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(12, 2) CHECK (original_price IS NULL OR original_price >= price),
    discount_percent INTEGER DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
    image_url TEXT NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    rating NUMERIC(3, 2) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
    reviews_count INTEGER DEFAULT 0 CHECK (reviews_count >= 0),
    specifications JSONB DEFAULT '{}'::jsonb,
    stock_quantity INTEGER DEFAULT 25 CHECK (stock_quantity >= 0),
    availability TEXT DEFAULT 'In Stock',
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    is_trending BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    ai_verdict TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for fast searching, filtering, and sorting
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_trending ON public.products (is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING gin (to_tsvector('english', name || ' ' || COALESCE(description, '')));


-- ==============================================================================
-- TABLE 2: PROFILES (Linked to Supabase Auth auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'manager')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);


-- ==============================================================================
-- TABLE 3: WISHLISTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT unique_user_product_wishlist UNIQUE (user_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON public.wishlists (user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON public.wishlists (product_id);


-- ==============================================================================
-- TABLE 4: ENQUIRIES (Customer Support & Contact Form)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.enquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_enquiries_user_id ON public.enquiries (user_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries (created_at DESC);


-- ==============================================================================
-- TABLE 5: ORDERS (E-Commerce Checkout)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    order_status TEXT DEFAULT 'confirmed' CHECK (lower(order_status) IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    payment_method TEXT DEFAULT 'SIMULATED_DEMO_UPI',
    inventory_deducted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);


-- ==============================================================================
-- TABLE 6: ORDER_ITEMS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items (product_id);


-- ==============================================================================
-- TABLE 7: INVENTORY_AUDIT_LOG (Inventory Changes & Delivery Fulfillment Logs)
-- ==============================================================================
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


-- ==============================================================================
-- HELPER FUNCTIONS & TRIGGERS
-- ==============================================================================

-- 1. Helper function: Check if current session user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if authenticated user has admin role in public.profiles
    IF EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    ) THEN
        RETURN true;
    END IF;

    -- Check user metadata in JWT token
    IF (auth.jwt() -> 'user_metadata' ->> 'role') IN ('admin', 'manager') THEN
        RETURN true;
    END IF;

    -- Allow service_role key or postgres superuser
    IF auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' THEN
        RETURN true;
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Helper function: Check if an order exists (bypasses RLS to allow guest checkout items insertion)
CREATE OR REPLACE FUNCTION public.order_exists(p_order_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.orders WHERE id = p_order_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Automation Trigger: Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Security Trigger: Prevent regular users from granting themselves admin roles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT (
            public.is_admin()
            OR auth.jwt() ->> 'role' = 'service_role'
            OR current_user = 'postgres'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Standard users cannot alter administrative privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();

-- 5. Helper Function: Grant admin status to any email easily from SQL Editor
CREATE OR REPLACE FUNCTION public.make_admin(user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    target_id UUID;
BEGIN
    SELECT id INTO target_id FROM auth.users WHERE email = user_email LIMIT 1;
    IF target_id IS NULL THEN
        RETURN 'User not found in auth.users with email: ' || user_email;
    END IF;
    UPDATE public.profiles SET role = 'admin', updated_at = NOW() WHERE id = target_id;
    RETURN 'Success: User ' || user_email || ' is now an administrator.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- DATABASE SECURITY: ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_audit_log ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- POLICIES: PRODUCTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public users can view active products" ON public.products;
CREATE POLICY "Public users can view active products"
    ON public.products FOR SELECT
    USING (is_active = true OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products"
    ON public.products FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: PROFILES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Profiles insert policy" ON public.profiles;
CREATE POLICY "Profiles insert policy"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id OR public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: WISHLISTS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlists;
CREATE POLICY "Users can view own wishlist"
    ON public.wishlists FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Users can add to own wishlist" ON public.wishlists;
CREATE POLICY "Users can add to own wishlist"
    ON public.wishlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete from own wishlist" ON public.wishlists;
CREATE POLICY "Users can delete from own wishlist"
    ON public.wishlists FOR DELETE
    USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- POLICIES: ENQUIRIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can submit enquiry" ON public.enquiries;
CREATE POLICY "Anyone can submit enquiry"
    ON public.enquiries FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view own enquiries" ON public.enquiries;
CREATE POLICY "Users can view own enquiries"
    ON public.enquiries FOR SELECT
    USING (public.is_admin() OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update enquiries" ON public.enquiries;
CREATE POLICY "Admins can update enquiries"
    ON public.enquiries FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: ORDERS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
CREATE POLICY "Users and admins can view orders"
    ON public.orders FOR SELECT
    USING (public.is_admin() OR auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert simulated orders" ON public.orders;
CREATE POLICY "Users can insert simulated orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update order status" ON public.orders;
CREATE POLICY "Admins can update order status"
    ON public.orders FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders"
    ON public.orders FOR DELETE
    USING (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: ORDER_ITEMS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items;
CREATE POLICY "Users and admins can view order items"
    ON public.order_items FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (public.order_exists(order_id));

DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;
CREATE POLICY "Admins can delete order items"
    ON public.order_items FOR DELETE
    USING (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: INVENTORY_AUDIT_LOG
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view inventory audit logs" ON public.inventory_audit_log;
CREATE POLICY "Admins can view inventory audit logs"
    ON public.inventory_audit_log FOR SELECT
    USING (public.is_admin() OR auth.jwt() ->> 'role' = 'service_role' OR current_user = 'postgres' OR current_user = 'anon');

DROP POLICY IF EXISTS "System and admins can insert inventory audit logs" ON public.inventory_audit_log;
CREATE POLICY "System and admins can insert inventory audit logs"
    ON public.inventory_audit_log FOR INSERT
    WITH CHECK (true);


-- ==============================================================================
-- INVENTORY FULFILLMENT & STOCK ATOMIC RPC FUNCTIONS
-- ==============================================================================

-- 6. RPC Function: Atomically deliver order and deduct product inventory
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

-- 7. RPC Function: Atomically adjust product stock with validation & audit trail
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

