-- Strip "TO authenticated" from all RLS policies so they apply to ALL roles.
-- The app.current_user_id GUC check provides per-user isolation; the TO clause
-- causes INSERT/UPDATE/DELETE to be denied when SET LOCAL ROLE cannot switch
-- (Neon pooler edge cases where the role stays as neondb_owner).

-- Drop and recreate each policy without TO authenticated
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND 'authenticated'::text = ANY(roles)
  LOOP
    -- Drop the existing policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

    -- Recreate without TO clause (applies to ALL roles)
    IF pol.cmd = 'ALL' THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I.%I FOR ALL%s%s',
        pol.policyname, pol.schemaname, pol.tablename,
        CASE WHEN pol.qual IS NOT NULL THEN ' USING (' || pol.qual || ')' ELSE '' END,
        CASE WHEN pol.with_check IS NOT NULL THEN ' WITH CHECK (' || pol.with_check || ')' ELSE '' END
      );
    ELSIF pol.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN
      IF pol.cmd = 'INSERT' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR INSERT WITH CHECK (%s)',
          pol.policyname, pol.schemaname, pol.tablename, pol.with_check
        );
      ELSIF pol.cmd = 'SELECT' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR SELECT USING (%s)',
          pol.policyname, pol.schemaname, pol.tablename, pol.qual
        );
      ELSIF pol.cmd = 'UPDATE' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR UPDATE USING (%s)%s',
          pol.policyname, pol.schemaname, pol.tablename,
          pol.qual,
          CASE WHEN pol.with_check IS NOT NULL THEN ' WITH CHECK (' || pol.with_check || ')' ELSE '' END
        );
      ELSIF pol.cmd = 'DELETE' THEN
        EXECUTE format(
          'CREATE POLICY %I ON %I.%I FOR DELETE USING (%s)',
          pol.policyname, pol.schemaname, pol.tablename, pol.qual
        );
      END IF;
    END IF;

    RAISE NOTICE 'Recreated policy % on %.% without TO authenticated', pol.policyname, pol.schemaname, pol.tablename;
  END LOOP;
END $$;

-- Ensure neondb_owner can SET ROLE authenticated (needed for runScoped)
DO $$
BEGIN
  GRANT authenticated TO neondb_owner;
  GRANT service_role TO neondb_owner;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Grant failed (may already exist): %', SQLERRM;
END $$;
