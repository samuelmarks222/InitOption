-- Server-owned data. Apply with the application migration/owner connection.
-- Never add these tables to the browser CRUD allowlist or grant browser access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.account_details (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.identity_cases (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Submitted','Verified','Rejected')),
  revision integer NOT NULL DEFAULT 0,
  identity jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  review_note text,
  consent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.identity_documents (
  user_id uuid NOT NULL REFERENCES public.identity_cases(user_id) ON DELETE CASCADE,
  slot text NOT NULL CHECK (slot IN ('front','back')),
  name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('national_id','passport','driving_licence')),
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 2097152),
  encrypted_data bytea NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id,slot)
);
CREATE TABLE IF NOT EXISTS public.identity_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event text NOT NULL,
  revision integer NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS identity_cases_queue ON public.identity_cases(status, submitted_at);
CREATE INDEX IF NOT EXISTS identity_audit_user ON public.identity_audit(user_id,created_at DESC);
ALTER TABLE public.account_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.account_details, public.identity_cases, public.identity_documents, public.identity_audit FROM PUBLIC;
-- Existing installations may have legacy Supabase browser roles.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.account_details, public.identity_cases, public.identity_documents, public.identity_audit FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.account_details, public.identity_cases, public.identity_documents, public.identity_audit FROM authenticated;
  END IF;
END $$;
-- Keep legacy decisions, but move old URL metadata out of public profile responses.
-- Old public storage objects are NOT revoked by this migration; rotate/remove them
-- through the original storage provider after an approved retention review.
INSERT INTO public.identity_cases(user_id,status,identity)
SELECT id, CASE WHEN lower(coalesce(kyc_status,'')) IN ('verified','approved') THEN 'Verified' ELSE 'Draft' END,
       jsonb_build_object('legacy',true,'legacyDocuments',coalesce(kyc_documents,'{}'::jsonb))
FROM public.profiles
WHERE lower(coalesce(kyc_status,'')) IN ('verified','approved') OR coalesce(kyc_documents,'{}'::jsonb) <> '{}'::jsonb
ON CONFLICT DO NOTHING;
UPDATE public.profiles SET kyc_documents='{}'::jsonb
WHERE kyc_documents IS DISTINCT FROM '{}'::jsonb
  AND NOT (coalesce(kyc_documents,'{}'::jsonb) ? 'submission');
COMMIT;
