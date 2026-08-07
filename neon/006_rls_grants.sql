-- RLS grants so the API layer can run row-level-security-enforced queries.
-- The provider connects as the table owner (which bypasses RLS); to preserve
-- per-user row scoping (the exact behavior Supabase gave us), the API route
-- executes `SET ROLE authenticated` + `SET LOCAL app.current_user_id` in a
-- transaction. That requires (a) the app DB role to be a member of the
-- 'authenticated' role so SET ROLE is permitted, and (b) table privileges for
-- 'authenticated'. GRANTs are additive and reversible. Actual access is still
-- gated by the existing RLS policies on these tables.
-- Applies to every table that "ENABLE ROW LEVEL SECURITY".

-- (a) membership needed by the Node owner connection for `SET ROLE authenticated`
grant authenticated to neondb_owner;

grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.assets_config to authenticated;
grant select, insert, update, delete on public.bonus_settings to authenticated;
grant select on public.chat_messages to authenticated;
grant select, insert, update, delete on public.copy_settings to authenticated;
grant select, insert, update, delete on public.crypto_deposit_address_pool to authenticated;
grant select on public.crypto_deposit_events to authenticated;
grant select, insert, update, delete on public.crypto_deposit_instructions to authenticated;
grant select on public.crypto_payment_methods to authenticated;
grant select, insert, update, delete on public.customer_reviews to authenticated;
grant select, insert, update, delete on public.deposit_bonus_offers to authenticated;
grant select, insert, update, delete on public.deposit_bonus_redemptions to authenticated;
grant select, insert, update, delete on public.deposit_requests to authenticated;
grant select, insert, update, delete on public.email_verification_codes to authenticated;
grant select, insert, update, delete on public.follows to authenticated;
grant select, insert, update, delete on public.notification_email_deliveries to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.platform_settings to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.promo_codes to authenticated;
grant select, insert, update, delete on public.promo_materials to authenticated;
grant select, insert, update, delete on public.referral_commissions to authenticated;
grant select, insert, update, delete on public.social_feed to authenticated;
grant select, insert, update, delete on public.support_messages to authenticated;
grant select, insert, update, delete on public.support_threads to authenticated;
grant select, insert, update, delete on public.support_tickets to authenticated;
grant select, insert, update, delete on public.tournament_participants to authenticated;
grant select, insert, update, delete on public.tournament_payouts to authenticated;
grant select, insert, update, delete on public.tournaments to authenticated;
grant select, insert, update, delete on public.trade_balance_audit_logs to authenticated;
grant select, insert, update, delete on public.trades to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, update, delete on public.withdrawal_requests to authenticated;