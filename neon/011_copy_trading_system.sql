-- Migration: 011_copy_trading_system.sql
-- Complete Copy / Social Trading Engine for InitOption

-- 1. Extend profiles with copy trading fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_copy_trading_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS trader_bio TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'Medium';

-- 2. Extend existing copy_settings table with new specification columns
ALTER TABLE public.copy_trading_settings RENAME TO copy_trading_settings_old;
DROP TABLE IF EXISTS public.copy_trading_settings;

ALTER TABLE public.copy_settings
  ADD COLUMN IF NOT EXISTS copy_percentage NUMERIC DEFAULT 20,
  ADD COLUMN IF NOT EXISTS minimum_trade_amount NUMERIC DEFAULT 1,
  ADD COLUMN IF NOT EXISTS maximum_trade_amount NUMERIC DEFAULT 50,
  ADD COLUMN IF NOT EXISTS stop_balance NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_copy BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS stopped_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stop_reason TEXT;

-- Create an alias / view or ensure table name copy_trading_settings exists for full spec compatibility
CREATE TABLE IF NOT EXISTS public.copy_trading_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  master_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'stopped', 'removed')),
  copy_percentage NUMERIC NOT NULL DEFAULT 20 CHECK (copy_percentage > 0 AND copy_percentage <= 100),
  minimum_trade_amount NUMERIC NOT NULL DEFAULT 1 CHECK (minimum_trade_amount > 0),
  maximum_trade_amount NUMERIC NOT NULL DEFAULT 50 CHECK (maximum_trade_amount >= minimum_trade_amount),
  stop_balance NUMERIC NOT NULL DEFAULT 0 CHECK (stop_balance >= 0),
  auto_copy BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stopped_at TIMESTAMPTZ,
  stop_reason TEXT,
  CONSTRAINT copy_trading_settings_no_self_copy CHECK (follower_user_id <> master_user_id),
  CONSTRAINT copy_trading_settings_unique_pair UNIQUE (follower_user_id, master_user_id)
);

CREATE INDEX IF NOT EXISTS copy_trading_settings_follower_idx ON public.copy_trading_settings(follower_user_id, status);
CREATE INDEX IF NOT EXISTS copy_trading_settings_master_idx ON public.copy_trading_settings(master_user_id, status);

-- 3. Table copied_trades linking master trade and follower trade
CREATE TABLE IF NOT EXISTS public.copied_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  copied_trade_id UUID REFERENCES public.trades(id) ON DELETE SET NULL,
  master_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  follower_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_amount NUMERIC NOT NULL,
  copy_percentage NUMERIC NOT NULL DEFAULT 100,
  calculated_amount NUMERIC NOT NULL,
  actual_amount NUMERIC NOT NULL DEFAULT 0,
  minimum_amount NUMERIC DEFAULT 1,
  maximum_amount NUMERIC DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'executed', 'skipped', 'failed')),
  skip_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT copied_trades_master_follower_unique UNIQUE (master_trade_id, follower_user_id)
);

CREATE INDEX IF NOT EXISTS copied_trades_master_idx ON public.copied_trades(master_trade_id);
CREATE INDEX IF NOT EXISTS copied_trades_follower_idx ON public.copied_trades(follower_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS copied_trades_status_idx ON public.copied_trades(status, created_at DESC);

-- 4. Enable RLS and Grant Permissions
ALTER TABLE public.copy_trading_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copied_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own copy trading settings" ON public.copy_trading_settings;
CREATE POLICY "Users can view own copy trading settings" ON public.copy_trading_settings
  FOR SELECT TO authenticated USING (follower_user_id = auth.uid() OR master_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own copy trading settings" ON public.copy_trading_settings;
CREATE POLICY "Users can manage own copy trading settings" ON public.copy_trading_settings
  FOR ALL TO authenticated USING (follower_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own copied trades" ON public.copied_trades;
CREATE POLICY "Users can view own copied trades" ON public.copied_trades
  FOR SELECT TO authenticated USING (follower_user_id = auth.uid() OR master_user_id = auth.uid());

-- 5. Helper procedure to trigger notifications
CREATE OR REPLACE FUNCTION public.create_copy_trading_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'copy_trade'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
  VALUES (p_user_id, p_type, p_title, p_message, '/social/my-copies', false, now());
EXCEPTION WHEN OTHERS THEN
  -- Do not block on notification error
  NULL;
END;
$$;

-- 6. Server-side Core Copy Trading Engine
CREATE OR REPLACE FUNCTION public.process_master_copy_trades(
  p_master_trade_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master_trade public.trades%ROWTYPE;
  v_master_profile public.profiles%ROWTYPE;
  v_setting RECORD;
  v_follower_profile public.profiles%ROWTYPE;
  v_calc_amount NUMERIC;
  v_actual_amount NUMERIC;
  v_percentage NUMERIC;
  v_min_amount NUMERIC;
  v_max_amount NUMERIC;
  v_stop_bal NUMERIC;
  v_follower_trade_id UUID;
  v_executed_count INT := 0;
  v_skipped_count INT := 0;
  v_failed_count INT := 0;
  v_master_name TEXT;
BEGIN
  -- 1. Fetch master trade
  SELECT * INTO v_master_trade FROM public.trades WHERE id = p_master_trade_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Master trade not found');
  END IF;

  -- Tournament trades are ignored for copy trading
  IF v_master_trade.tournament_participant_id IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'copied', 0, 'reason', 'tournament_trade_ignored');
  END IF;

  -- 2. Fetch master profile
  SELECT * INTO v_master_profile FROM public.profiles WHERE id = v_master_trade.user_id;
  IF NOT FOUND OR COALESCE(v_master_profile.is_copy_trading_enabled, true) = false OR COALESCE(v_master_profile.is_visible, true) = false THEN
    RETURN jsonb_build_object('ok', true, 'copied', 0, 'reason', 'master_copy_disabled');
  END IF;

  v_master_name := COALESCE(v_master_profile.display_name, v_master_profile.username, 'Master Trader');

  -- 3. Find active followers from both copy_trading_settings and copy_settings
  FOR v_setting IN
    SELECT 
      s.id AS setting_id,
      s.follower_user_id,
      s.master_user_id,
      COALESCE(s.copy_percentage, 20) AS copy_percentage,
      COALESCE(s.minimum_trade_amount, 1) AS minimum_trade_amount,
      COALESCE(s.maximum_trade_amount, 50) AS maximum_trade_amount,
      COALESCE(s.stop_balance, 0) AS stop_balance,
      COALESCE(s.auto_copy, true) AS auto_copy,
      COALESCE(s.status, 'active') AS status
    FROM (
      SELECT 
        id, 
        follower_user_id, 
        master_user_id, 
        copy_percentage, 
        minimum_trade_amount, 
        maximum_trade_amount, 
        stop_balance, 
        auto_copy, 
        status
      FROM public.copy_trading_settings
      WHERE master_user_id = v_master_trade.user_id AND status = 'active' AND auto_copy = true
      
      UNION ALL
      
      SELECT 
        cs.id, 
        cs.user_id AS follower_user_id, 
        cs.target_user_id AS master_user_id, 
        COALESCE(cs.copy_percentage, (cs.ratio * 100), 20) AS copy_percentage, 
        COALESCE(cs.minimum_trade_amount, 1) AS minimum_trade_amount, 
        COALESCE(cs.max_per_trade, cs.maximum_trade_amount, 50) AS maximum_trade_amount, 
        COALESCE(cs.stop_balance, 0) AS stop_balance, 
        (cs.execution_mode = 'automatic') AS auto_copy, 
        CASE WHEN cs.enabled THEN 'active' ELSE 'paused' END AS status
      FROM public.copy_settings cs
      WHERE cs.target_user_id = v_master_trade.user_id AND cs.enabled = true AND cs.execution_mode = 'automatic'
        AND NOT EXISTS (
          SELECT 1 FROM public.copy_trading_settings cts 
          WHERE cts.follower_user_id = cs.user_id AND cts.master_user_id = cs.target_user_id
        )
    ) s
  LOOP
    BEGIN
      -- Idempotency check: don't create duplicate copy trade for same master trade & follower
      IF EXISTS (
        SELECT 1 FROM public.copied_trades 
        WHERE master_trade_id = v_master_trade.id AND follower_user_id = v_setting.follower_user_id
      ) THEN
        CONTINUE;
      END IF;

      -- Prevent self-copying
      IF v_setting.follower_user_id = v_master_trade.user_id THEN
        CONTINUE;
      END IF;

      -- Fetch follower profile with lock
      SELECT * INTO v_follower_profile 
      FROM public.profiles 
      WHERE id = v_setting.follower_user_id 
      FOR UPDATE;

      IF NOT FOUND THEN
        INSERT INTO public.copied_trades (
          master_trade_id, master_user_id, follower_user_id, original_amount,
          copy_percentage, calculated_amount, actual_amount, status, skip_reason
        ) VALUES (
          v_master_trade.id, v_master_trade.user_id, v_setting.follower_user_id, v_master_trade.amount,
          v_setting.copy_percentage, 0, 0, 'failed', 'trader_not_available'
        );
        v_failed_count := v_failed_count + 1;
        CONTINUE;
      END IF;

      -- Calculate copy amount
      v_percentage := GREATEST(0.01, LEAST(100.0, v_setting.copy_percentage));
      v_calc_amount := ROUND((v_master_trade.amount * (v_percentage / 100.0))::numeric, 2);
      v_min_amount := GREATEST(0.01, v_setting.minimum_trade_amount);
      v_max_amount := GREATEST(v_min_amount, v_setting.maximum_trade_amount);
      v_stop_bal := GREATEST(0, v_setting.stop_balance);

      -- Bounds enforcement: below minimum -> SKIP
      IF v_calc_amount < v_min_amount THEN
        INSERT INTO public.copied_trades (
          master_trade_id, master_user_id, follower_user_id, original_amount,
          copy_percentage, calculated_amount, actual_amount, minimum_amount, maximum_amount, status, skip_reason
        ) VALUES (
          v_master_trade.id, v_master_trade.user_id, v_setting.follower_user_id, v_master_trade.amount,
          v_percentage, v_calc_amount, 0, v_min_amount, v_max_amount, 'skipped', 'below_minimum'
        );
        
        PERFORM public.create_copy_trading_notification(
          v_setting.follower_user_id,
          'Copy Trade Skipped',
          format('A trade from %s was skipped because the calculated amount ($%s) is below your minimum threshold ($%s).', v_master_name, v_calc_amount, v_min_amount)
        );
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Clamp to maximum amount
      v_actual_amount := LEAST(v_calc_amount, v_max_amount);

      -- Check Stop Balance condition
      IF v_stop_bal > 0 AND (v_follower_profile.balance <= v_stop_bal OR (v_follower_profile.balance - v_actual_amount) < v_stop_bal) THEN
        -- Stop copying automatically
        UPDATE public.copy_trading_settings 
        SET status = 'stopped', stopped_at = now(), stop_reason = 'stop_balance_reached', updated_at = now()
        WHERE follower_user_id = v_setting.follower_user_id AND master_user_id = v_master_trade.user_id;

        UPDATE public.copy_settings
        SET enabled = false, updated_at = now()
        WHERE user_id = v_setting.follower_user_id AND target_user_id = v_master_trade.user_id;

        INSERT INTO public.copied_trades (
          master_trade_id, master_user_id, follower_user_id, original_amount,
          copy_percentage, calculated_amount, actual_amount, minimum_amount, maximum_amount, status, skip_reason
        ) VALUES (
          v_master_trade.id, v_master_trade.user_id, v_setting.follower_user_id, v_master_trade.amount,
          v_percentage, v_calc_amount, v_actual_amount, v_min_amount, v_max_amount, 'skipped', 'stop_balance_reached'
        );

        PERFORM public.create_copy_trading_notification(
          v_setting.follower_user_id,
          'Copy Trading Stopped',
          format('Copy trading from %s has been stopped because your account balance reached your stop balance of $%s.', v_master_name, v_stop_bal)
        );
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- Check Available Balance
      IF v_follower_profile.balance < v_actual_amount THEN
        INSERT INTO public.copied_trades (
          master_trade_id, master_user_id, follower_user_id, original_amount,
          copy_percentage, calculated_amount, actual_amount, minimum_amount, maximum_amount, status, skip_reason
        ) VALUES (
          v_master_trade.id, v_master_trade.user_id, v_setting.follower_user_id, v_master_trade.amount,
          v_percentage, v_calc_amount, v_actual_amount, v_min_amount, v_max_amount, 'skipped', 'insufficient_balance'
        );

        PERFORM public.create_copy_trading_notification(
          v_setting.follower_user_id,
          'Copy Trade Skipped',
          format('A trade from %s was skipped due to insufficient account balance.', v_master_name)
        );
        v_skipped_count := v_skipped_count + 1;
        CONTINUE;
      END IF;

      -- CREATE FOLLOWER TRADE
      v_follower_trade_id := gen_random_uuid();

      INSERT INTO public.trades (
        id,
        user_id,
        asset_symbol,
        direction,
        amount,
        entry_price,
        expiry_seconds,
        payout_rate,
        status,
        opened_at,
        copy_setting_id
      ) VALUES (
        v_follower_trade_id,
        v_setting.follower_user_id,
        v_master_trade.asset_symbol,
        v_master_trade.direction,
        v_actual_amount,
        v_master_trade.entry_price,
        v_master_trade.expiry_seconds,
        v_master_trade.payout_rate,
        'open',
        v_master_trade.opened_at,
        v_setting.setting_id
      );

      -- DEBIT FOLLOWER BALANCE
      UPDATE public.profiles
      SET balance = balance - v_actual_amount,
          total_trades = total_trades + 1,
          updated_at = now()
      WHERE id = v_setting.follower_user_id;

      -- AUDIT LOG
      INSERT INTO public.trade_balance_audit_logs (
        user_id, trade_id, event_type, account_scope, asset_symbol, direction, status, amount, payout_rate, change_amount,
        balance_before, balance_after, available_balance_before, available_balance_after, context
      ) VALUES (
        v_setting.follower_user_id, v_follower_trade_id, 'trade_open', 'live', v_master_trade.asset_symbol,
        v_master_trade.direction, 'open', v_actual_amount, v_master_trade.payout_rate, -v_actual_amount,
        v_follower_profile.balance, v_follower_profile.balance - v_actual_amount,
        v_follower_profile.balance, v_follower_profile.balance - v_actual_amount,
        jsonb_build_object('copied_from_trade_id', v_master_trade.id, 'master_user_id', v_master_trade.user_id)
      );

      -- RECORD IN copied_trades
      INSERT INTO public.copied_trades (
        master_trade_id, copied_trade_id, master_user_id, follower_user_id, original_amount,
        copy_percentage, calculated_amount, actual_amount, minimum_amount, maximum_amount, status
      ) VALUES (
        v_master_trade.id, v_follower_trade_id, v_master_trade.user_id, v_setting.follower_user_id,
        v_master_trade.amount, v_percentage, v_calc_amount, v_actual_amount, v_min_amount, v_max_amount, 'executed'
      );

      -- NOTIFY FOLLOWER
      PERFORM public.create_copy_trading_notification(
        v_setting.follower_user_id,
        'Copied Trade Executed',
        format('%s opened a %s trade on %s. A $%s trade was copied to your account.', v_master_name, UPPER(v_master_trade.direction), v_master_trade.asset_symbol, v_actual_amount)
      );

      v_executed_count := v_executed_count + 1;

    EXCEPTION WHEN OTHERS THEN
      -- Log failure for individual follower without crashing whole loop
      INSERT INTO public.copied_trades (
        master_trade_id, master_user_id, follower_user_id, original_amount,
        copy_percentage, calculated_amount, actual_amount, status, skip_reason
      ) VALUES (
        v_master_trade.id, v_master_trade.user_id, v_setting.follower_user_id, v_master_trade.amount,
        COALESCE(v_percentage, 20), COALESCE(v_calc_amount, 0), 0, 'failed', SQLERRM
      );
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'executed', v_executed_count,
    'skipped', v_skipped_count,
    'failed', v_failed_count
  );
END;
$$;

-- 7. Admin Social Trading Stats Function
CREATE OR REPLACE FUNCTION public.get_admin_social_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_traders INT;
  v_active_relationships INT;
  v_total_followers INT;
  v_copied_today INT;
  v_volume NUMERIC;
  v_profit_loss NUMERIC;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO v_total_traders FROM public.trades WHERE status != 'open';
  
  SELECT COUNT(*) INTO v_active_relationships 
  FROM public.copy_trading_settings WHERE status = 'active'
  + (SELECT COUNT(*) FROM public.copy_settings WHERE enabled = true);

  SELECT COUNT(*) INTO v_total_followers FROM public.follows;

  SELECT COUNT(*) INTO v_copied_today 
  FROM public.copied_trades WHERE created_at >= CURRENT_DATE;

  SELECT COALESCE(SUM(actual_amount), 0) INTO v_volume 
  FROM public.copied_trades WHERE status = 'executed';

  SELECT COALESCE(SUM(t.profit - ct.actual_amount), 0) INTO v_profit_loss
  FROM public.copied_trades ct
  JOIN public.trades t ON t.id = ct.copied_trade_id
  WHERE ct.status = 'executed' AND t.status IN ('won', 'lost');

  RETURN jsonb_build_object(
    'total_traders', COALESCE(v_total_traders, 0),
    'active_relationships', COALESCE(v_active_relationships, 0),
    'total_followers', COALESCE(v_total_followers, 0),
    'copied_today', COALESCE(v_copied_today, 0),
    'volume', COALESCE(v_volume, 0),
    'profit_loss', COALESCE(v_profit_loss, 0)
  );
END;
$$;
