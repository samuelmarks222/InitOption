-- Clean up old 6-tier VIP data, migrate to new 3-tier balance-based system
-- Run this in Supabase SQL Editor

-- 1. Reset old vip_tier values (tier is now derived from balance)
UPDATE profiles
SET vip_tier = NULL
WHERE vip_tier IS NOT NULL;

-- 2. Remove old vip_tier_override values (or keep if you want manual override to persist)
UPDATE profiles
SET vip_tier_override = NULL
WHERE vip_tier_override IS NOT NULL;

-- 3. Verify
SELECT id, username, balance, vip_tier, vip_tier_override
FROM profiles
WHERE vip_tier IS NOT NULL OR vip_tier_override IS NOT NULL;
-- Should return 0 rows
