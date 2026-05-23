# Vercel Supabase Cutover

Use this when switching the hosted app from the old Supabase project to a fresh Supabase project.

## Required Vercel Environment Variables

Set these for Production, Preview, and Development as needed:

```text
SUPABASE_URL=https://NEW_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ANON_KEY=...
VITE_SUPABASE_URL=https://NEW_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

The server code also accepts these fallback names, but the names above are the clean target:

```text
VITE_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

## Supabase Project Settings To Recreate

In the fresh Supabase project:

1. Authentication:
   - Site URL: `https://initoption.com`
   - Redirect URL: `https://initoption.com/auth/callback`
   - Google provider enabled with the correct Google OAuth client.
2. Storage:
   - Bucket: `branding`
   - Public read if current branding URLs are public.
   - Authenticated/admin upload/update/delete policy.
3. Email:
   - Confirmation email template from `supabase/templates/confirmation.html`.
4. Database:
   - Confirm migrations/functions/tables exist.
   - Confirm roles and RLS policies exist.
5. Scheduled jobs:
   - Vercel cron still points to `/api/mobile-money/process-withdrawals`.

## Cutover Steps

1. Make a production backup of the old project.
2. Restore/import into the fresh Supabase project.
3. Test fresh project using Preview Vercel env vars if possible.
4. Update Production env vars in Vercel.
5. Trigger a fresh Vercel deployment.
6. Test:
   - `/login`
   - Google sign-in
   - `/trade`
   - `/admin`
   - deposits
   - withdrawals
   - support/chat
   - branding upload.

## Rollback

If login/trading/admin breaks after cutover:

1. Restore the old Supabase env vars in Vercel.
2. Redeploy.
3. Keep the new project intact for debugging.
