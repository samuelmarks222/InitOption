-- Migration: 012_deposit_bonus_codes.sql
-- Seed the 4 standard deposit bonus codes into public.promo_codes and public.deposit_bonus_offers

-- 1. Ensure promo_codes has minimum_deposit_amount column
ALTER TABLE public.promo_codes 
  ADD COLUMN IF NOT EXISTS minimum_deposit_amount NUMERIC DEFAULT 0;

-- 2. Insert or update the 4 predefined promo codes
INSERT INTO public.promo_codes (code, type, reward_value, minimum_deposit_amount, usages, max_usages, expiry_date, status)
VALUES 
  ('WELCOME50', 'Percentage', '50%', 30, 0, 10000, '2030-12-31 23:59:59+00', 'active'),
  ('DEPOSIT50', 'Percentage', '50%', 100, 0, 10000, '2030-12-31 23:59:59+00', 'active'),
  ('DEPOSIT40', 'Percentage', '40%', 80, 0, 10000, '2030-12-31 23:59:59+00', 'active'),
  ('DEPOSIT30', 'Percentage', '30%', 70, 0, 10000, '2030-12-31 23:59:59+00', 'active')
ON CONFLICT (code) DO UPDATE SET
  type = EXCLUDED.type,
  reward_value = EXCLUDED.reward_value,
  minimum_deposit_amount = EXCLUDED.minimum_deposit_amount,
  status = EXCLUDED.status;

-- 3. Insert or update the deposit_bonus_offers table for deposit matcher
INSERT INTO public.deposit_bonus_offers (title, bonus_percent, deposit_amount, minimum_deposit_amount, status, position)
VALUES
  ('WELCOME50 (+50% Bonus on >$30)', 50, 30, 30, 'active', 1),
  ('DEPOSIT50 (+50% Bonus on >$100)', 50, 100, 100, 'active', 2),
  ('DEPOSIT40 (+40% Bonus on >$80)', 40, 80, 80, 'active', 3),
  ('DEPOSIT30 (+30% Bonus on >$70)', 30, 70, 70, 'active', 4)
ON CONFLICT (id) DO NOTHING;
