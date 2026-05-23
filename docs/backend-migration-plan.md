# Backend Migration Plan

This plan is for moving Init Option away from an overloaded Supabase project with the least breakage.

## Current Backend Dependencies

The app currently depends on Supabase for:

- Postgres tables, RLS policies, functions, and RPC calls.
- Supabase Auth, including Google login.
- Supabase Storage, mainly the `branding` bucket.
- Server-side Vercel functions using `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and anon/publishable keys.
- Frontend calls using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Because of that, the lowest-risk migration is not Neon first. The lowest-risk move is a fresh Supabase project first, then storage, then Neon later.

## Phase 1: Fresh Supabase Project Or Temporary Upgrade

Goal: get the live app onto a Supabase project that can respond normally.

Preferred path:

1. Temporarily upgrade or uncap the current Supabase project if possible.
2. Export the current database using CLI or dashboard backups.
3. Create a fresh Supabase project in the same region if possible.
4. Restore data into the fresh project.
5. Recreate Auth settings:
   - Site URL: `https://initoption.com`
   - Redirect URL: `https://initoption.com/auth/callback`
   - Google OAuth client settings.
6. Recreate Storage bucket:
   - `branding`
   - public read enabled
   - authenticated/admin upload and delete policy.
7. Update Vercel environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
8. Redeploy Vercel.
9. Test:
   - `/login`
   - Google sign-in
   - `/trade`
   - admin dashboard
   - deposits and withdrawals
   - logo/background upload from admin.

Fallback if SQL editor keeps timing out:

- Do not keep retrying cleanup SQL.
- Use Supabase dashboard backups/clone if available.
- Use CLI dump from your machine instead of SQL editor.
- If export still fails, temporarily upgrade compute/storage so export can finish.

## Phase 2: Export And Import Safely

Use the backup script in this repo:

```powershell
.\scripts\export-supabase-backup.ps1 -SourceDbUrl "postgresql://..."
```

That creates:

- `roles.sql`
- `schema.sql`
- `data.sql`

Restore to a test target first:

```powershell
.\scripts\restore-postgres-backup.ps1 -TargetDbUrl "postgresql://..." -BackupDir ".backups\supabase-YYYYMMDD-HHMMSS"
```

Verify before switching production:

```sql
select count(*) from auth.users;
select count(*) from public.profiles;
select count(*) from public.trades;
select count(*) from public.deposit_requests;
select count(*) from public.withdrawal_requests;
```

## Phase 3: Move File Storage To Cloudinary Or S3

Goal: stop Supabase Storage from growing again.

Recommended path:

1. Keep old Supabase Storage URLs working during transition.
2. Add Cloudinary or S3 upload API routes on Vercel.
3. Change admin uploads to store new files in Cloudinary/S3.
4. Store the returned HTTPS URL in existing settings/tables.
5. Re-upload current branding/media from admin so important assets move first.
6. Delete old Supabase Storage files from Supabase dashboard after confirming no current settings reference them.

Do not bulk-delete `storage.objects` while the app is live unless you have a verified list of unused files.

## Phase 4: Move Database To Neon Later

Goal: use Neon Postgres for database while replacing Supabase-specific services properly.

This requires code changes because the frontend currently queries Supabase directly.

Work needed:

1. Move database reads/writes into Vercel API routes.
2. Replace Supabase Auth with Clerk, Firebase Auth, or Auth.js.
3. Replace Supabase Storage with Cloudinary/S3.
4. Replace Supabase realtime if still needed.
5. Update frontend contexts/hooks to call API routes instead of `supabase.from(...)`.
6. Switch database connection to Neon.

Do this only after the app is stable on a fresh Supabase project or upgraded current project.

## Cutover Checklist

- [ ] Source backup completed.
- [ ] Restore tested on target.
- [ ] Auth provider configured on target.
- [ ] Storage bucket and policies configured on target.
- [ ] Vercel env vars updated.
- [ ] Vercel redeployed.
- [ ] Login tested.
- [ ] Google login tested.
- [ ] Trading dashboard tested.
- [ ] Admin dashboard tested.
- [ ] Deposits/withdrawals tested.
- [ ] Old Supabase project kept online for rollback until new project is stable.

## Rollback

If the new project breaks production:

1. Put old Supabase values back in Vercel env vars.
2. Redeploy Vercel.
3. Keep the new Supabase project untouched for debugging.
