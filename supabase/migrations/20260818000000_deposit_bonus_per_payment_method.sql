-- Deposit bonus per payment method (M-PESA / Cryptocurrency)
-- Adds independent admin toggles so the bonus can be enabled for one method
-- while disabled for the other. Falls back to deposit_bonus_enabled when NULL.
alter table public.bonus_settings
  add column if not exists deposit_bonus_mpesa_enabled boolean,
  add column if not exists deposit_bonus_crypto_enabled boolean;

-- Backfill existing installs: preserve the current global toggle as the default
-- for both methods so behavior is unchanged until admins opt into per-method control.
update public.bonus_settings
   set deposit_bonus_mpesa_enabled = deposit_bonus_enabled,
       deposit_bonus_crypto_enabled = deposit_bonus_enabled
 where deposit_bonus_mpesa_enabled is null
    or deposit_bonus_crypto_enabled is null;