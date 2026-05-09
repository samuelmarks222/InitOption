-- Migration: Admin Panel Infrastructure

-- 1. Create Platform Settings Table (Singleton)
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name TEXT NOT NULL DEFAULT 'Binary Predict',
    support_email TEXT NOT NULL DEFAULT 'support@binarypredict.com',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    min_trade_amount NUMERIC NOT NULL DEFAULT 1,
    max_trade_amount NUMERIC NOT NULL DEFAULT 10000,
    enforce_max_exposure BOOLEAN NOT NULL DEFAULT true,
    enforce_2fa BOOLEAN NOT NULL DEFAULT false,
    require_kyc_withdrawal BOOLEAN NOT NULL DEFAULT true,
    strict_password BOOLEAN NOT NULL DEFAULT true,
    welcome_bonus_pct NUMERIC NOT NULL DEFAULT 50,
    referral_commission_pct NUMERIC NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Initialize the singleton row if table is empty
INSERT INTO public.platform_settings (platform_name)
SELECT 'Binary Predict'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 2. Create Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'Percentage' | 'Fixed Bonus'
    reward_value TEXT NOT NULL,
    usages INTEGER NOT NULL DEFAULT 0,
    max_usages INTEGER NOT NULL DEFAULT 1000,
    expiry_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'expired'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Tradable Assets Config Table
CREATE TABLE IF NOT EXISTS public.assets_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Forex' | 'Crypto' | 'Stock'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'inactive'
    min_trade NUMERIC NOT NULL DEFAULT 1,
    max_trade NUMERIC NOT NULL DEFAULT 5000,
    payout_pct NUMERIC NOT NULL DEFAULT 85,
    spread NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_config ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users for settings & active assets
CREATE POLICY "Allow public read on settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Allow active assets fetch" ON public.assets_config FOR SELECT USING (status = 'active');
CREATE POLICY "Allow promo checking" ON public.promo_codes FOR SELECT USING (status = 'active');

-- Restrict mutations (INSERT, UPDATE, DELETE) to Admins ONLY
-- (Requires has_role('admin') from existing auth schema)
CREATE POLICY "Allow admin full access on settings" ON public.platform_settings FOR ALL USING (has_role('admin', auth.uid()));
CREATE POLICY "Allow admin full access on promos" ON public.promo_codes FOR ALL USING (has_role('admin', auth.uid()));
CREATE POLICY "Allow admin full access on assets" ON public.assets_config FOR ALL USING (has_role('admin', auth.uid()));
CREATE POLICY "Allow admin full read on assets" ON public.assets_config FOR SELECT USING (has_role('admin', auth.uid()));
