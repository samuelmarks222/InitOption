-- Migration: Configure crypto_payment_methods for automated Plisio deposits
-- This migration updates the crypto payment methods with attribution_mode = 'memo',
-- proper wallet_address (Plisio will generate dynamic addresses), and confirmation requirements.
-- 
-- Attribution mode 'memo' means: Plisio generates a dynamic deposit address per user,
-- identified by the memo/tag. No static wallet addresses are stored.
--
-- Apply: psql "$DATABASE_URL" -f neon/010_crypto_payment_methods_config.sql
--
-- IMPORTANT: This migration sets attribution_mode = 'memo'. The actual deposit
-- addresses are generated dynamically by Plisio's Create a Deposit API using the
-- user's UID. No static wallet addresses are required in the database.

-- USDT TRC20 (Tron) - memo mode: Plisio generates dynamic address per user
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',  -- Plisio generates dynamic addresses; empty means "use Plisio UID"
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'USDT' and network = 'TRC20';

-- USDT ERC20 (Ethereum) - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 12,
    updated_at = now()
where symbol = 'USDT' and network = 'ERC20';

-- USDT BEP20 (BSC) - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 15,
    updated_at = now()
where symbol = 'USDT' and network = 'BEP20';

-- ETH ERC20 - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 15,
    confirmations_required = 12,
    updated_at = now()
where symbol = 'ETH' and network = 'ERC20';

-- BTC - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 20,
    confirmations_required = 2,
    updated_at = now()
where symbol = 'BTC' and network = 'Bitcoin';

-- USDC ERC20 - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 12,
    updated_at = now()
where symbol = 'USDC' and network = 'ERC20';

-- USDC TRC20 - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'USDC' and network = 'TRC20';

-- TRX TRC20 - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'TRX' and network = 'TRC20';

-- BNB BEP20 - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 15,
    updated_at = now()
where symbol = 'BNB' and network = 'BEP20';

-- SOL - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 5,
    confirmations_required = 32,
    updated_at = now()
where symbol = 'SOL' and network = 'Solana';

-- XRP - memo mode (requires destination tag)
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Destination Tag',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'XRP' and network = 'Ripple';

-- BTT TRC20 - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'BTT' and network = 'TRC20';

-- BTG - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'BTG' and network = 'Bitcoin';

-- BCH - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'BCH' and network = 'Bitcoin';

-- DOGE - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'DOGE' and network = 'Dogecoin';

-- DASH - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'DASH' and network = 'Dash';

-- ETC - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'ETC' and network = 'Ethereum Classic';

-- LTC - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'LTC' and network = 'Litecoin';

-- LINK - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'LINK' and network = 'Chainlink';

-- UNI - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 1,
    updated_at = now()
where symbol = 'UNI' and network = 'Uniswap';

-- TON - memo mode
update public.crypto_payment_methods
set attribution_mode = 'memo',
    wallet_address = '',
    memo_label = 'Memo',
    minimum_deposit_amount = 10,
    confirmations_required = 5,
    updated_at = now()
where symbol = 'TON' and network = 'Toncoin';

-- SOL (already covered above) - skip

-- Show current configuration
select
  coin_name,
  symbol,
  network,
  attribution_mode,
  case when wallet_address <> '' then 'SET' else 'EMPTY (Plisio dynamic)' end as wallet_status,
  minimum_deposit_amount,
  confirmations_required,
  status
from public.crypto_payment_methods
where status = 'active'
order by coin_name, network;