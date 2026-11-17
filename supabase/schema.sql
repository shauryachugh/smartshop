-- ==============================================================================
-- SHOPSMART AI — COMPLETE SUPABASE DATABASE SCHEMA (PHASE 3)
-- ==============================================================================
-- This script sets up all required tables, constraints, indexes, Row Level
-- Security (RLS) policies, and authentication triggers for ShopSmart AI.
--
-- Instructions: Run this script in your Supabase Project's SQL Editor:
-- https://supabase.com/dashboard/project/unectsmgytpitjaxdgru/sql
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- TABLE 1: PRODUCTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    original_price NUMERIC(12, 2) CHECK (original_price >= price),
    discount_percent INTEGER DEFAULT 0,
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
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for lightning fast searching and filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_price ON public.products (price);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products (is_active);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_trending ON public.products (is_trending) WHERE is_trending = true;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin (to_tsvector('english', name || ' ' || COALESCE(description, '')));


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
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries (created_at DESC);


-- ==============================================================================
-- TABLE 5: ORDERS (Simulated E-Commerce Checkout)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    order_status TEXT DEFAULT 'confirmed' CHECK (order_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT,
    shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
    payment_method TEXT DEFAULT 'SIMULATED_DEMO_PAYMENT',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
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


-- ==============================================================================
-- AUTOMATION TRIGGER: AUTO-CREATE PROFILE ON USER SIGNUP
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, phone, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create trigger safely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- SECURITY TRIGGER: PREVENT SELF-ESCALATION OF USER ROLES
-- ------------------------------------------------------------------------------
-- Ensures regular users cannot grant themselves 'admin' or 'manager' roles
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        -- Only allow if caller is already an admin or service_role
        IF NOT (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND role = 'admin'
            )
            OR auth.jwt() ->> 'role' = 'service_role'
            OR current_user = 'postgres'
        ) THEN
            RAISE EXCEPTION 'Unauthorized: Standard users cannot alter their administrative privileges.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.prevent_role_escalation();


-- ------------------------------------------------------------------------------
-- HELPER FUNCTION: CHECK IF CURRENT SESSION USER IS AN ADMIN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;


-- ==============================================================================
-- DATABASE SECURITY: ENABLE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- POLICIES: PRODUCTS
-- ------------------------------------------------------------------------------
-- Anyone (public/anon or authenticated) can view active products
CREATE POLICY "Public users can view active products"
    ON public.products FOR SELECT
    USING (is_active = true);

-- Admins can view, insert, update and delete all products
CREATE POLICY "Admins can manage products"
    ON public.products FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: PROFILES
-- ------------------------------------------------------------------------------
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);


-- ------------------------------------------------------------------------------
-- POLICIES: WISHLISTS
-- ------------------------------------------------------------------------------
-- Authenticated users can read their own wishlist
CREATE POLICY "Users can view own wishlist"
    ON public.wishlists FOR SELECT
    USING (auth.uid() = user_id);

-- Authenticated users can add items to their own wishlist
CREATE POLICY "Users can add to own wishlist"
    ON public.wishlists FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can remove items from their own wishlist
CREATE POLICY "Users can delete from own wishlist"
    ON public.wishlists FOR DELETE
    USING (auth.uid() = user_id);


-- ------------------------------------------------------------------------------
-- POLICIES: ENQUIRIES
-- ------------------------------------------------------------------------------
-- Anyone (guest or registered) can submit an enquiry
CREATE POLICY "Anyone can submit enquiry"
    ON public.enquiries FOR INSERT
    WITH CHECK (true);

-- Authenticated users can view their own submitted enquiries; Admins can view all
CREATE POLICY "Users can view own enquiries"
    ON public.enquiries FOR SELECT
    USING (public.is_admin() OR auth.uid() = user_id);

-- Admins can update enquiry status (e.g., mark resolved)
CREATE POLICY "Admins can update enquiries"
    ON public.enquiries FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: ORDERS
-- ------------------------------------------------------------------------------
-- Users can view their own orders; Admins can view all orders
CREATE POLICY "Users and admins can view orders"
    ON public.orders FOR SELECT
    USING (public.is_admin() OR auth.uid() = user_id);

-- Authenticated or guest users can insert simulated orders
CREATE POLICY "Users can insert simulated orders"
    ON public.orders FOR INSERT
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Admins can update order status (confirmed, shipped, delivered)
CREATE POLICY "Admins can update order status"
    ON public.orders FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());


-- ------------------------------------------------------------------------------
-- POLICIES: ORDER_ITEMS
-- ------------------------------------------------------------------------------
-- Users can view items belonging to their own orders
CREATE POLICY "Users can view items in own orders"
    ON public.order_items FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid() OR orders.user_id IS NULL)
        )
    );

-- Allow inserting order items during order placement
CREATE POLICY "Users can insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = order_items.order_id
        )
    );
