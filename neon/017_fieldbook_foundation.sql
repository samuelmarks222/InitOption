-- Fieldbook phase 1 foundation for the existing Neon/PostgreSQL database.
-- Apply after the existing schema; public.users is the existing identity mirror.
-- Server-only schema: no browser access or money movement is enabled here.
BEGIN;
CREATE SCHEMA IF NOT EXISTS fieldbook;
REVOKE ALL ON SCHEMA fieldbook FROM PUBLIC, anon, authenticated;

CREATE TABLE fieldbook.schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE);
CREATE TABLE fieldbook.permissions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE);
CREATE TABLE fieldbook.role_permissions (role_id uuid NOT NULL REFERENCES fieldbook.roles ON DELETE CASCADE, permission_id uuid NOT NULL REFERENCES fieldbook.permissions ON DELETE CASCADE, PRIMARY KEY(role_id, permission_id));
CREATE TABLE fieldbook.user_roles (user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE, role_id uuid NOT NULL REFERENCES fieldbook.roles ON DELETE CASCADE, PRIMARY KEY(user_id, role_id));
-- Existing public.users/public.profiles remain the canonical identity/profile records.
CREATE TABLE fieldbook.sports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), slug text NOT NULL UNIQUE, name text NOT NULL, enabled boolean NOT NULL DEFAULT false);
CREATE TABLE fieldbook.competitions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sport_id uuid NOT NULL REFERENCES fieldbook.sports, name text NOT NULL, country_code char(2), provider text, external_id text, UNIQUE(provider, external_id));
CREATE TABLE fieldbook.teams (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sport_id uuid NOT NULL REFERENCES fieldbook.sports, name text NOT NULL, provider text, external_id text, UNIQUE(provider, external_id));
CREATE TABLE fieldbook.events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), competition_id uuid NOT NULL REFERENCES fieldbook.competitions, home_team_id uuid REFERENCES fieldbook.teams, away_team_id uuid REFERENCES fieldbook.teams, starts_at timestamptz NOT NULL, status text NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled','live','finished','cancelled','postponed')), provider text, external_id text, UNIQUE(provider, external_id), CHECK(home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id));
CREATE TABLE fieldbook.markets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES fieldbook.events, name text NOT NULL, status text NOT NULL DEFAULT 'suspended' CHECK(status IN ('open','suspended','closed','settled','void')), provider text, external_id text, UNIQUE(provider, external_id));
CREATE TABLE fieldbook.selections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), market_id uuid NOT NULL REFERENCES fieldbook.markets, name text NOT NULL, status text NOT NULL DEFAULT 'suspended' CHECK(status IN ('open','suspended','closed','won','lost','void')), provider text, external_id text, UNIQUE(provider, external_id));
CREATE TABLE fieldbook.odds (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), selection_id uuid NOT NULL REFERENCES fieldbook.selections, decimal_odds numeric(12,4) NOT NULL CHECK(decimal_odds > 1), observed_at timestamptz NOT NULL, source text NOT NULL);
CREATE TABLE fieldbook.wallets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), currency char(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), status text NOT NULL DEFAULT 'inactive' CHECK(status IN ('inactive','active','frozen','closed')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,currency));
CREATE TABLE fieldbook.transactions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), wallet_id uuid NOT NULL REFERENCES fieldbook.wallets, reference text NOT NULL UNIQUE, kind text NOT NULL, amount_minor bigint NOT NULL CHECK(amount_minor > 0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed','cancelled')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.deposits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL UNIQUE REFERENCES fieldbook.transactions, provider text, provider_reference text, UNIQUE(provider,provider_reference));
CREATE TABLE fieldbook.withdrawals (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), transaction_id uuid NOT NULL UNIQUE REFERENCES fieldbook.transactions, provider text, provider_reference text, UNIQUE(provider,provider_reference));
CREATE TABLE fieldbook.bets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), wallet_id uuid NOT NULL REFERENCES fieldbook.wallets, reference text NOT NULL UNIQUE, kind text NOT NULL CHECK(kind IN ('single','multiple','system','builder')), stake_minor bigint NOT NULL CHECK(stake_minor > 0), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','rejected','won','lost','void')), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.bet_selections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bet_id uuid NOT NULL REFERENCES fieldbook.bets, selection_id uuid NOT NULL REFERENCES fieldbook.selections, accepted_odds numeric(12,4) NOT NULL CHECK(accepted_odds > 1), UNIQUE(bet_id,selection_id));
CREATE TABLE fieldbook.jackpots (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','closed','settled','cancelled')), currency char(3) NOT NULL CHECK(currency ~ '^[A-Z]{3}$'), entry_fee_minor bigint NOT NULL CHECK(entry_fee_minor >= 0), closes_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.jackpot_entries (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), jackpot_id uuid NOT NULL REFERENCES fieldbook.jackpots, user_id uuid NOT NULL REFERENCES public.users(id), reference text NOT NULL UNIQUE, predictions jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.casino_games (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider text NOT NULL, external_id text NOT NULL, name text NOT NULL, category text NOT NULL, enabled boolean NOT NULL DEFAULT false, UNIQUE(provider,external_id));
CREATE TABLE fieldbook.promotions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL, terms text NOT NULL, starts_at timestamptz, ends_at timestamptz, enabled boolean NOT NULL DEFAULT false, CHECK(ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at));
CREATE TABLE fieldbook.notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), kind text NOT NULL, message text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.audit_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid REFERENCES public.users(id), action text NOT NULL, target_type text NOT NULL, target_id text, details jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE fieldbook.responsible_gambling_limits (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES public.users(id), kind text NOT NULL CHECK(kind IN ('deposit','loss','session','cooling_off','self_exclusion')), period text CHECK(period IN ('daily','weekly','monthly')), amount_minor bigint CHECK(amount_minor >= 0), starts_at timestamptz NOT NULL DEFAULT now(), ends_at timestamptz, CHECK(ends_at IS NULL OR ends_at > starts_at));
CREATE INDEX fieldbook_events_competition_start_idx ON fieldbook.events(competition_id,starts_at);
CREATE INDEX fieldbook_events_status_start_idx ON fieldbook.events(status,starts_at);
CREATE INDEX fieldbook_markets_event_idx ON fieldbook.markets(event_id);
CREATE INDEX fieldbook_selections_market_idx ON fieldbook.selections(market_id);
CREATE INDEX fieldbook_odds_selection_time_idx ON fieldbook.odds(selection_id,observed_at DESC);
CREATE INDEX fieldbook_bets_user_time_idx ON fieldbook.bets(user_id,created_at DESC);
CREATE INDEX fieldbook_transactions_wallet_time_idx ON fieldbook.transactions(wallet_id,created_at DESC);
CREATE INDEX fieldbook_jackpot_entries_user_time_idx ON fieldbook.jackpot_entries(user_id,created_at DESC);
CREATE INDEX fieldbook_notifications_user_time_idx ON fieldbook.notifications(user_id,created_at DESC);
CREATE INDEX fieldbook_audit_time_idx ON fieldbook.audit_logs(created_at DESC);
CREATE INDEX fieldbook_limits_user_idx ON fieldbook.responsible_gambling_limits(user_id,kind);
-- Defence in depth: no client policies are defined. A future API must authenticate,
-- authorize and explicitly use a dedicated server role before exposing any data.
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'fieldbook' LOOP
    EXECUTE format('ALTER TABLE fieldbook.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA fieldbook FROM PUBLIC, anon, authenticated;
INSERT INTO fieldbook.schema_migrations(version) VALUES ('017_fieldbook_foundation');
COMMIT;
