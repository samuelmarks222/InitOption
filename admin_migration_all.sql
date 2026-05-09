-- ============================================================
-- COMPLETE ADMIN MIGRATION (Run this single file in Supabase)
-- ============================================================

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
    logo_url TEXT DEFAULT '',
    favicon_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add branding columns if they don't exist yet (safe to re-run)
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '';
ALTER TABLE public.platform_settings ADD COLUMN IF NOT EXISTS favicon_url TEXT DEFAULT '';

-- Insert default settings row if none exists
INSERT INTO public.platform_settings (platform_name)
SELECT 'Binary Predict'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);

-- 2. Create Promo Codes Table
CREATE TABLE IF NOT EXISTS public.promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL,
    reward_value TEXT NOT NULL,
    usages INTEGER NOT NULL DEFAULT 0,
    max_usages INTEGER NOT NULL DEFAULT 1000,
    expiry_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Tradable Assets Config Table
CREATE TABLE IF NOT EXISTS public.assets_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    min_trade NUMERIC NOT NULL DEFAULT 1,
    max_trade NUMERIC NOT NULL DEFAULT 5000,
    payout_pct NUMERIC NOT NULL DEFAULT 85,
    spread NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Crypto Payment Methods Table
CREATE TABLE IF NOT EXISTS public.crypto_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coin_name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    network TEXT NOT NULL,
    wallet_address TEXT,
    qr_code_url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Enable Row Level Security on all tables
-- ============================================================
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_payment_methods ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Drop old broken policies (safe to ignore errors here)
-- ============================================================
DROP POLICY IF EXISTS "Allow public read on settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Allow admin full access on settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Allow active assets fetch" ON public.assets_config;
DROP POLICY IF EXISTS "Allow admin full access on assets" ON public.assets_config;
DROP POLICY IF EXISTS "Allow admin full read on assets" ON public.assets_config;
DROP POLICY IF EXISTS "Allow promo checking" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow admin full access on promos" ON public.promo_codes;
DROP POLICY IF EXISTS "Allow public read on crypto methods" ON public.crypto_payment_methods;
DROP POLICY IF EXISTS "Allow admin full access on crypto methods" ON public.crypto_payment_methods;

-- ============================================================
-- Create simple, working RLS Policies (no custom functions needed)
-- Everyone can read, authenticated users can write (admin check is done in app layer)
-- ============================================================
CREATE POLICY "settings_select" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "settings_insert" ON public.platform_settings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "settings_update" ON public.platform_settings FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "settings_delete" ON public.platform_settings FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "assets_select" ON public.assets_config FOR SELECT USING (true);
CREATE POLICY "assets_insert" ON public.assets_config FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "assets_update" ON public.assets_config FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "assets_delete" ON public.assets_config FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "promos_select" ON public.promo_codes FOR SELECT USING (true);
CREATE POLICY "promos_insert" ON public.promo_codes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "promos_update" ON public.promo_codes FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "promos_delete" ON public.promo_codes FOR DELETE USING (auth.uid() IS NOT NULL);

CREATE POLICY "crypto_select" ON public.crypto_payment_methods FOR SELECT USING (true);
CREATE POLICY "crypto_insert" ON public.crypto_payment_methods FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "crypto_update" ON public.crypto_payment_methods FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "crypto_delete" ON public.crypto_payment_methods FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Storage bucket for branding (Logo, Favicon uploads)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public read on branding" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads on branding" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates on branding" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes on branding" ON storage.objects;

CREATE POLICY "branding_select" ON storage.objects FOR SELECT USING (bucket_id = 'branding');
CREATE POLICY "branding_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'branding' AND auth.uid() IS NOT NULL);
CREATE POLICY "branding_update" ON storage.objects FOR UPDATE USING (bucket_id = 'branding' AND auth.uid() IS NOT NULL);
CREATE POLICY "branding_delete" ON storage.objects FOR DELETE USING (bucket_id = 'branding' AND auth.uid() IS NOT NULL);

-- ============================================================
-- Seed: 20 Crypto Payment Methods (only if table is empty)
-- ============================================================
INSERT INTO public.crypto_payment_methods (coin_name, symbol, network, wallet_address)
SELECT * FROM (VALUES
  ('Bitcoin', 'BTC', 'Bitcoin', ''),
  ('Ethereum', 'ETH', 'ERC20', ''),
  ('Tether USD', 'USDT', 'TRC20', ''),
  ('Tether USD', 'USDT', 'ERC20', ''),
  ('Binance Coin', 'BNB', 'BEP20', ''),
  ('Solana', 'SOL', 'Solana', ''),
  ('XRP', 'XRP', 'Ripple', ''),
  ('USD Coin', 'USDC', 'ERC20', ''),
  ('USD Coin', 'USDC', 'TRC20', ''),
  ('Cardano', 'ADA', 'Cardano', ''),
  ('Avalanche', 'AVAX', 'C-Chain', ''),
  ('Dogecoin', 'DOGE', 'Dogecoin', ''),
  ('Polkadot', 'DOT', 'Polkadot', ''),
  ('Polygon', 'MATIC', 'Polygon', ''),
  ('Litecoin', 'LTC', 'Litecoin', ''),
  ('Shiba Inu', 'SHIB', 'ERC20', ''),
  ('TRON', 'TRX', 'TRC20', ''),
  ('Chainlink', 'LINK', 'ERC20', ''),
  ('Uniswap', 'UNI', 'ERC20', ''),
  ('Toncoin', 'TON', 'TON', '')
) AS v(coin_name, symbol, network, wallet_address)
WHERE NOT EXISTS (SELECT 1 FROM public.crypto_payment_methods LIMIT 1);
