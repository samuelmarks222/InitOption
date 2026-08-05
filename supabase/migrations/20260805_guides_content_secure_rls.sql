-- Fix insecure RLS on guides content tables.
-- The original migration (20260604_guides_content_management.sql) referenced
-- auth.jwt() -> 'user_metadata' ->> 'role', which is end-user-editable and
-- therefore MUST NOT be trusted in a security context. Replace those checks with
-- the server-authoritative user_roles table (admin + content_marketing_manager),
-- matching the convention used by promo_materials, customer_reviews, etc.

-- A user is considered "staff" for guide management if they hold the admin or
-- content_marketing_manager role. user_roles rows are written only by trusted
-- server-side code (assign_staff_role RPC / admin UI), never from the client.

-- ── guides ──
DROP POLICY IF EXISTS "Allow reading published guides" ON guides;
DROP POLICY IF EXISTS "Allow staff to manage guides" ON guides;

CREATE POLICY "Allow reading published guides"
  ON guides FOR SELECT
  USING (
    is_published = true
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  );

CREATE POLICY "Allow staff to manage guides"
  ON guides FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  );

-- ── guide_content ──
DROP POLICY IF EXISTS "Allow reading published guide content" ON guide_content;
DROP POLICY IF EXISTS "Allow staff to manage guide content" ON guide_content;

CREATE POLICY "Allow reading published guide content"
  ON guide_content FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_content.guide_id AND is_published = true)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  );

CREATE POLICY "Allow staff to manage guide content"
  ON guide_content FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  );

-- ── guide_media ──
DROP POLICY IF EXISTS "Allow reading media from published guides" ON guide_media;
DROP POLICY IF EXISTS "Allow staff to manage guide media" ON guide_media;

CREATE POLICY "Allow reading media from published guides"
  ON guide_media FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM guides WHERE id = guide_media.guide_id AND is_published = true)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  );

CREATE POLICY "Allow staff to manage guide media"
  ON guide_media FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'content_marketing_manager'::public.app_role)
  );
