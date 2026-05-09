# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## Pending Deposit Migration

Before testing the pending deposit request flow, apply `supabase/migrations/20260322_c_pending_deposit_review.sql`.

That migration creates the `deposit_requests` table and the `request_deposit_review` / `admin_update_deposit_status` RPCs. Without it, new deposit submissions fail.

## Automatic Crypto Deposit Migration

To enable memo-based and dynamic-address crypto deposits, also apply `supabase/migrations/20260323_auto_crypto_deposit_automation.sql`.

That migration adds:

- `crypto_deposit_instructions` for user-facing deposit address + memo instructions
- `crypto_deposit_events` for idempotent webhook ingestion
- `crypto_deposit_address_pool` for unique-address allocation on non-memo chains
- `create_crypto_deposit_instruction` and `process_crypto_deposit_detection` RPCs

For the hosted crypto checkout and webhook endpoint, set these server-side variables:

```sh
SUPABASE_SERVICE_ROLE_KEY=...
CRYPTO_WEBHOOK_SECRET=...
PLISIO_API_KEY=...
# optional if you want to force an exact callback host
PLISIO_CALLBACK_URL=https://initoption.com/api/crypto/webhook?json=true
```

The webhook route is `POST /api/crypto/webhook`.
Plisio hosted checkout creation route is `POST /api/crypto/create-payment` (authenticated with Supabase Bearer token from the app).

## SasaPay Mobile Money

To enable M-PESA deposits and withdrawals through SasaPay, apply `supabase/migrations/20260401_sasapay_mobile_money.sql`.

That migration extends `deposit_requests` and `withdrawal_requests` with provider-tracking fields and adds two webhook-safe RPCs:

- `process_mobile_money_deposit_callback`
- `process_mobile_money_withdrawal_callback`

Set these server-side variables:

```sh
SASAPAY_CLIENT_ID=...
SASAPAY_CLIENT_SECRET=...
SASAPAY_MERCHANT_CODE=600980
SASAPAY_ENVIRONMENT=sandbox
# optional explicit override if needed for production
SASAPAY_BASE_URL=https://sandbox.sasapay.app
SASAPAY_CALLBACK_BASE_URL=https://initoption.com
# optional extra callback guard
SASAPAY_CALLBACK_TOKEN=replace-with-a-random-value
```

Authenticated app routes:

- `POST /api/mobile-money/deposit`
- `POST /api/mobile-money/withdraw`

SasaPay callback routes:

- `POST /api/mobile-money/deposit-callback`
- `POST /api/mobile-money/withdraw-callback`

If `SASAPAY_CALLBACK_TOKEN` is set, the app automatically appends it to both callback URLs and rejects callbacks without that token.

It now accepts these authenticated formats:

- Generic JSON webhooks signed with HMAC-SHA256 in `x-crypto-signature` or `x-deposit-signature`
- Plisio JSON callbacks signed with `verify_hash` using your `PLISIO_API_KEY`

For Plisio callbacks, configure the callback URL with `?json=true`. The route accepts fields like `txn_id`, `order_number`, `amount`, `currency`, `confirmations`, `status`, `source_amount`, `source_currency`, and `verify_hash`.

For generic JSON webhooks, the body should include at least `address` and `txHash`, plus optional fields such as `memo`, `confirmations`, `amountUsd`, `amountAsset`, `amountAssetSymbol`, `paymentMethodId`, `status`, and `provider`.

For Plisio automatic crediting:

- Point Plisio invoice callbacks to `/api/crypto/webhook?json=true`
- Use a non-static crypto method in the admin crypto panel so deposits can be created through hosted checkout
- Keep static/manual crypto methods for manual review only

If you are using the Supabase CLI locally, run:

```sh
npx supabase db push
```

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
