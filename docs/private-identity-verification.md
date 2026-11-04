# Account profile and private identity verification

## Scope

The **My account** panel now has Personal details, Identity verification, and
Security & preferences sections, responsive mobile fields, explicit required
information, save errors, and a status/correction/resubmission flow. Personal
information is saved to PostgreSQL, not solely to browser local storage. Username
and country retain the existing public-profile behavior; legal names, date of
birth, phone, address, and document numbers are kept in server-owned private tables.

Verification is **manual staff review**, not an automated authenticity, government
registry, sanctions/PEP, facial-match, biometric or liveness service. An image
upload alone never confers verification. This is not a claim of regulatory KYC
certification. Reviewer training, identity policy and appropriate legal/privacy
review remain operational prerequisites.

## Required production setup (not performed by this change)

1. Back up the application database. Review and apply
   `neon/015_private_identity_verification.sql` to the **existing application
   PostgreSQL database**, with the authorized migration/owner connection.
2. Set **server-only** `KYC_DOCUMENT_ENCRYPTION_KEY` in the deployed environment.
   It must be the canonical base64 encoding of 32 cryptographically random bytes.
   For example, generate it locally using `openssl rand -base64 32`. Do not paste
   the generated value into chat, commit it, or use a `VITE_` prefix. Back it up in
   an approved secrets manager. Changing it without re-encrypting existing records
   makes existing documents unreadable; this change does not implement key rotation.
3. Confirm the existing `DATABASE_URL` and verified Appwrite authentication
   configuration. The new routes fail closed without a verified session. The DB
   connection must have server-owned access to the new tables; browser roles must
   not receive grants. Do not add the tables to generic CRUD/embed allowlists.
4. Deploy the application. Use real test accounts and an authorized reviewer to
   complete the acceptance checklist below before allowing production uploads.

No production migration, environment change, billing upgrade, or deployment has
been performed by this implementation. A missing migration returns a clear 503;
missing/invalid encryption configuration rejects document storage rather than
falling back to public URLs or unencrypted data.

## Storage and privacy boundaries

- `account_details`: private saved form values.
- `identity_cases`: current review status, revision, immutable submitted identity
  snapshot, consent timestamp, reviewer and correction note.
- `identity_documents`: at most two document slots per account, AES-256-GCM
  encrypted image bytes with random nonces and owner/slot authenticated binding.
  Document type is bound to each upload; switching document type requires matching
  images. Supported input: JPEG/PNG, at most 2 MB per image; no PDF/HEIC/SVG.
- `identity_audit`: server-recorded uploads/removals, secure document views,
  submissions, reviewer decisions and reopened cases. No image bytes are logged.
- New private tables have RLS enabled and no public/anon/authenticated grants.
  Server owner access is intentional: every route verifies ownership or a reviewer
  role before reading/mutating these records.
- Responses are `private, no-store`; images require authenticated fetches, are
  served as attachments with `nosniff`, and preview using temporary object URLs
  revoked when closed. No public/signed share links are created.
- New uploads no longer use Cloudinary. The old `kyc` upload folder flow returns
  410. Direct KYC writes through profile PATCH/generic profile CRUD are blocked;
  generic role writes require verified admin authorization. Profile CRUD cannot
  reassign an account's ID, and non-admin mutations are forced to their own ID.
- Migration 015 preserves legacy verified decisions and archives old document URL
  metadata privately. Public profile URL metadata is cleared. **This does not
  revoke/delete previously public objects at their original storage provider.**
  Review and remove/restrict those objects using approved provider access and a
  documented retention policy. This was not performed here.
- Legacy pending uploads must be resubmitted using the private flow. Legacy
  verified accounts lacking private legal details must ask staff to reopen their
  case for fresh verification; they are not silently downgraded on page load.
- Account deletion cascades private records. Replacing an image overwrites its
  current slot; reopening a case deletes current images. A separate retention,
  backup-erasure and access-governance policy must be agreed before production.
  There is no unattended document-purge scheduler in this implementation.
- Plan storage capacity: up to roughly 4 MB encrypted image payload per account,
  plus DB overhead/backups. No database/billing upgrade is authorized or applied.

## Routes (existing Vercel Function)

All new requests use `/api/system?route=identity&action=...`, preserving the existing
Function count. Bearer identity comes from verified Appwrite authentication, never
from client-supplied account IDs.

| Action | Method | Access / effect |
| --- | --- | --- |
| status | GET | Own saved details, status, document metadata; no public URLs |
| profile | POST | Own validated details; legal fields locked during review/verification |
| upload / remove | POST | Own Draft/Rejected case; only matching image slots/types |
| submit | POST | Own case, complete saved adult details, consent and required images |
| document | GET | Own image, or authorized staff access to a specified user/slot |
| queue | GET | Admin/support_agent/finance_manager only; latest 100 cases, pending first |
| review | POST | Staff, not self; current revision and explicit attestation required |
| reset | POST | Staff, not self; reopen Verified/Rejected case with an explanation |

The old `/api/system/admin-review-kyc` endpoint returns 410. Staff now use
**Admin → KYC Verification** (`/admin/users?tab=kyc`). The user-management modal links
there rather than displaying old public images or offering unsafe direct approval.

## Lifecycle

1. Save validated legal details (18+, valid calendar date, supported country,
   international phone number, address and username). Unsaved edits cannot be
   submitted. Phone/address/username can still change while legal identity is locked.
2. Select national ID, passport or driving licence. Upload both sides for a card
   or licence, only the photo page for a passport. Upload does not submit.
3. Explicitly consent and submit. The server locks the case and snapshots **saved**
   details; status becomes Submitted and the withdrawal-facing `profiles.kyc_status`
   remains Pending. Uploads are limited to 20 per account/hour.
4. Authorized staff inspect details and privately fetched images, then attest and
   approve or request changes. Rejection requires an actionable 10–1000 character
   reason. Self-review and stale/already-reviewed revisions are refused.
5. Decisions and their audit records are transactional. The profile status is
   mirrored to Verified/Rejected for existing withdrawal checks and notification
   triggers. Notification/email delivery still depends on existing infrastructure;
   the account page itself is the authoritative source of review feedback.
6. Rejected users can correct details/images and explicitly resubmit; the revision
   increments. Legal corrections after verification require staff reopening.

## Verification performed locally

- `npx vitest run --config vitest.identity.config.ts`: UI, validation, encryption,
  authorization/lifecycle guards, legacy escape-route guards and embedded PostgreSQL
  lifecycle tests (PGlite, existing development-only dependency).
- Embedded PostgreSQL test applies the migration twice, preserves legacy decisions,
  removes public URL metadata, persists encrypted images, tests ownership, explicit
  submission, rejection/resubmission, stale review refusal, approval, reopening,
  profile status/audit persistence and rollback on missing encryption configuration.
  Authentication is mocked here; this is not a live Appwrite/deployed DB test.
- Isolated Chromium real-component fixtures at 320, 393 and 1280px showed no
  horizontal page overflow in Personal details or Identity verification. Contexts,
  API data and unrelated settings/photo/email subcomponents were mocked.
- API typecheck, Vercel Function-count check, production build, focused chart/trading
  regression suite and baseline-comparison app TypeScript check are run separately.

### Required live acceptance

Verify authenticated save/reload on a second device, upload/preview failures,
passport versus two-sided requirements, wrong-user and wrong-role denial, actual
staff image inspection, approval/withdrawal gating, rejection reason visibility,
resubmission and stale reviewer conflict handling. Test iPhone keyboard, screen
reader/dialog focus and narrow screens in the real overlay. Validate privacy
policy, staff permissions, capacity, backups, retention and encryption-key custody.
The broader legacy RPC/accounting API has not undergone a full security audit in
this task; no claim of platform-wide security or regulatory compliance is made.
