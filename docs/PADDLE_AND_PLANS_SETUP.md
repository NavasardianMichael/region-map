# Plans & Paddle Billing Setup – Step by Step

This doc covers what you need to provide and run to enable **user badges** (observer / explorer / chronographer) and **Paddle one-time payments** (API-created checkouts, webhook for badge upgrade).

---

## 1. Database: `badge` on users

The Prisma schema has the `Badge` enum and `User.badge` field. Apply it to your DB:

```bash
cd server
npx prisma generate
npx prisma db push
```

Existing users get `badge = observer` (free) by default.

---

## 2. Paddle: Create account and products

1. **Sign up / log in** at [Paddle](https://vendors.paddle.com) (production) or [Paddle Sandbox](https://sandbox-vendors.paddle.com) (development/testing).
2. Go to **Catalog → Products → New product**.
   - Create one product (e.g. **Regionify Badge**).
3. Under the product, add **two Prices** — both one-time:
   - **Explorer**: one-time, **$49 USD**.
   - **Chronographer**: one-time, **$149 USD**.
4. Copy the **Price ID** for each (format: `pri_01abc...`). These go into the env vars below.

> **Sandbox vs production:** Price IDs in the sandbox are different from production. Use sandbox credentials in dev and production credentials in prod.

---

## 3. Paddle: Webhook endpoint

1. Go to **Developer Tools → Notifications → New destination**.
2. Set the **URL**:
   - Production: `https://api.regionify.mnavasardian.com/payments/webhook`
   - Dev (local): use a tunnel like ngrok → `https://your-tunnel.ngrok-free.app/payments/webhook`
3. Subscribe to the **`transaction.completed`** event only.
4. Save and copy the **Signing secret** — this is your `PADDLE_WEBHOOK_SECRET`.

> **Sandbox note:** The sandbox dashboard has no "Webhooks → recent deliveries" view. Use **Developer Tools → Simulations** to fire test events at your endpoint instead of completing a real checkout.

---

## 4. Paddle: API key (server) and Client-side token (browser)

Paddle Billing requires **two** different credentials:

1. **API key** (server-only).
   **Developer Tools → Authentication → API keys → New API key.** Copy it — this is `PADDLE_API_KEY`. Keep it secret; never ship it to the browser.
2. **Client-side token** (browser-safe).
   **Developer Tools → Authentication → Client-side tokens → New token.** Copy it — this is `VITE_PADDLE_CLIENT_TOKEN`. This token is required by Paddle.js on `/payments/checkout` to open the overlay; it is designed to be public.

---

## 5. Paddle: Approve your checkout domain and set the default payment link

Paddle only allows transaction `checkout.url`s on approved domains.

1. **Checkout → Website approval** (or "Approved domains") in the Paddle dashboard.
2. Add the host of your `CLIENT_URL`:
   - Local dev: the ngrok hostname for the **client** (e.g. `xxxx.ngrok-free.app`) — see Step 8.
   - Production: `regionify.mnavasardian.com` (or whatever your client origin is).
     In sandbox these are auto-approved; in production they require verification (1–3 days).
3. **Checkout → Checkout settings → Default payment link**.
   Set it to `{CLIENT_URL}/payments/checkout`. This is the page the project hosts that loads Paddle.js and auto-opens the overlay when `?_ptxn=…` is in the URL.

> **Why this matters:** Paddle Billing does **not** use Paddle-hosted checkout pages. The "checkout URL" returned by the API is a payment-link URL on **your** approved domain. The page at that URL must load Paddle.js. Regionify already ships this page as `PaymentCheckoutPage` at `/payments/checkout`.

---

## 6. Server environment variables

Add to `server/.env.development.local` (dev) or your production env:

```env
# Paddle Billing (one-time checkouts; webhook for transaction.completed)
PADDLE_API_KEY=your_api_key_here
PADDLE_WEBHOOK_SECRET=your_webhook_signing_secret
PADDLE_PRICE_ID_EXPLORER=pri_01abc_explorer
PADDLE_PRICE_ID_CHRONOGRAPHER=pri_01abc_chronographer
PADDLE_SANDBOX=true   # omit or set to "false" in production
```

| Variable                        | Description                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------ |
| `PADDLE_API_KEY`                | Paddle API secret key (from Developer Tools → Authentication → API keys)                   |
| `PADDLE_WEBHOOK_SECRET`         | Signing secret from your webhook endpoint configuration                                    |
| `PADDLE_PRICE_ID_EXPLORER`      | Price ID for the Explorer badge (`pri_...`)                                                |
| `PADDLE_PRICE_ID_CHRONOGRAPHER` | Price ID for the Chronographer badge (`pri_...`)                                           |
| `PADDLE_SANDBOX`                | Set to `"true"` to use `sandbox-api.paddle.com`; omit or any other value uses the live API |

All payment vars are required for payments to work. If `PADDLE_API_KEY` is missing, create-checkout returns a service error.

---

## 7. Client environment variables

Add to `client/.env.development.local` (dev) or your production env:

```env
VITE_PADDLE_CLIENT_TOKEN=test_xxxxxxxxxxxx   # client-side token from Step 4
VITE_PADDLE_ENV=sandbox                       # "sandbox" in dev, "production" in prod
```

| Variable                   | Description                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `VITE_PADDLE_CLIENT_TOKEN` | Browser-safe client-side token used by Paddle.js to open the overlay. Required to render the checkout.    |
| `VITE_PADDLE_ENV`          | `"sandbox"` to use Paddle sandbox checkout, `"production"` for live. Must match the server's environment. |

Without `VITE_PADDLE_CLIENT_TOKEN` the overlay cannot open and `/payments/checkout` shows the error state.

---

## 8. Client URL and approved domain

`CLIENT_URL` is the real browser origin of the client with **no trailing slash**. The server builds two URLs from it:

- **Checkout opener** (passed to Paddle as `checkout.url`): `{CLIENT_URL}/payments/checkout`
- **Return page** (where the overlay sends the user after success): `{CLIENT_URL}/payments/return`

Both must be on a domain that is **approved in Paddle** (Step 5). Plain `http://localhost:7002` is usually **not** accepted by Paddle's domain approval; for local testing tunnel the **client** (Vite, port 7002) with ngrok and set `CLIENT_URL` to that public HTTPS host. Keep a **separate** tunnel for the API/webhook (see existing Step 9 below).

---

## 9. Flow summary

1. **Create checkout (server)**
   User clicks "Upgrade" on Billing.
   Client calls `POST {API_URL}/payments/create-checkout` with `{ badge: 'explorer' | 'chronographer' }`.
   Server creates a Paddle transaction (items with price ID, `custom_data.user_id`, `checkout.url = {CLIENT_URL}/payments/checkout`), returns `{ checkoutUrl }` from `data.checkout.url`. Paddle's URL is `{CLIENT_URL}/payments/checkout?_ptxn=txn_…`.

2. **Open the overlay (client)**
   Client does `window.location.href = checkoutUrl`. `PaymentCheckoutPage` mounts, initializes Paddle.js with `VITE_PADDLE_CLIENT_TOKEN`, and Paddle.js auto-detects `?_ptxn=…` and opens the **overlay checkout** on top of the page. The user pays inside the overlay.

3. **Webhook: transaction.completed**
   Paddle sends `POST {API_URL}/payments/webhook` with a `Paddle-Signature` header.
   Server verifies the signature, then for `transaction.completed` reads `data.custom_data.user_id` and `data.items[0].price.id`, maps the price ID to a badge, and updates `User.badge` in the DB. Idempotent — safe to run multiple times.

4. **Return / Cancel (client)**
   - On `checkout.completed` Paddle.js fires an event; the page navigates to `/payments/return`. That page polls `GET {API_URL}/auth/me` until the user's badge is updated by the webhook, then shows success.
   - On `checkout.closed` (user dismisses the overlay without paying) the page navigates to `/payments/cancel`.

All Paddle API calls and secrets stay on the server; the client only uses the public client-side token to open the overlay.

---

## 10. Badge features

| Badge         | Projects  | Sessions | Export formats      | Quality | Advanced styling | High-res (2K/4K) | Time-series & timeline | Animation (GIF/MP4) | AI parser (daily quota) | Public embed |
| ------------- | --------- | -------- | ------------------- | ------- | ---------------- | ---------------- | ---------------------- | ------------------- | ----------------------- | ------------ |
| Observer      | 5         | 5        | PNG, JPEG, PDF      | 100%    | Yes              | Yes              | No                     | No                  | No                      | No           |
| Explorer      | Unlimited | 5        | PNG, SVG, JPEG, PDF | 100%    | Yes              | Yes              | Yes                    | Yes                 | Yes — up to 5/day       | No           |
| Chronographer | Unlimited | 5        | PNG, SVG, JPEG, PDF | 100%    | Yes              | Yes              | Yes                    | Yes                 | Yes — up to 10/day      | Yes          |

Paddle integration is **one-time payment** only. No subscriptions.

---

## 11. Testing (sandbox mode)

1. Set `PADDLE_SANDBOX=true` in `server/.env.development.local` and `VITE_PADDLE_ENV=sandbox` in `client/.env.development.local`.
2. Use your sandbox Price IDs in `PADDLE_PRICE_ID_EXPLORER` and `PADDLE_PRICE_ID_CHRONOGRAPHER`, and the sandbox client-side token in `VITE_PADDLE_CLIENT_TOKEN`.
3. Make sure the **client** origin (the `CLIENT_URL` host, e.g. an ngrok hostname for port 7002) is added under **Checkout → Website approval** in the sandbox dashboard.
4. Complete a test purchase using Paddle sandbox test card:
   - **Card number**: `4242 4242 4242 4242`
   - **Expiry**: any future date
   - **CVC**: any 3 digits (Paddle docs commonly use `100`)
5. After payment, check **Developer Tools → Simulations** in the Paddle sandbox dashboard. Create a **New simulation → transaction.completed**, paste your webhook URL, and fire it. Confirm your server returned 200 in the simulation response.
6. To test idempotency, run the simulation a second time — your server should return 200 again without making a duplicate DB write.

---

## 12. What you must do outside the repo to make payments work

Everything below is a one-time external setup that is not automated by code. Do the sandbox steps first, verify end-to-end, then repeat with live credentials for production.

### Phase 1 — Sandbox (development & testing)

#### Step 1 — Create a Paddle sandbox account

- Go to [sandbox-vendors.paddle.com](https://sandbox-vendors.paddle.com) and register.
- The sandbox is completely isolated from production — separate account, separate price IDs, separate API keys.

#### Step 2 — Create a product and two prices

1. Log in to the sandbox dashboard.
2. **Catalog → Products → New product.**
   - Name: `Regionify Badge` (or any name — not customer-facing for one-time purchases).
   - Save.
3. On the product page, click **New price** twice:
   - Price 1: type = **One-time**, amount = **$49.00 USD**, internal description = `Explorer`.
   - Price 2: type = **One-time**, amount = **$149.00 USD**, internal description = `Chronographer`.
4. Copy both **Price IDs** (shown as `pri_01...` next to each price). You need these for env vars.

#### Step 3 — Get a sandbox API key and client-side token

1. **Developer Tools → Authentication → API keys → New API key.** Name it (e.g. `regionify-dev`), copy immediately — this is `PADDLE_API_KEY` (server-only secret).
2. **Developer Tools → Authentication → Client-side tokens → New token.** Copy it — this is `VITE_PADDLE_CLIENT_TOKEN` (browser-safe).

#### Step 4 — Set up tunnels (client and server)

Paddle cannot reach `localhost`, and it requires the browser-facing URL it redirects to (`checkout.url`) to be on an **approved domain**. Use two tunnels:

```bash
# Tunnel the Vite dev server (browser). This host becomes CLIENT_URL.
ngrok http 7002

# Separate terminal: tunnel the API server (webhook destination).
ngrok http 9002
```

Note both `https://xxxx.ngrok-free.app` URLs. The first is the **client** tunnel (used as `CLIENT_URL` and approved in Paddle); the second is the **API** tunnel (used as the webhook URL).

#### Step 5 — Approve the client domain and set the default payment link

1. **Checkout → Website approval → Add domain.** Paste the **client** tunnel host (no scheme), e.g. `xxxx.ngrok-free.app`. Sandbox approves immediately.
2. **Checkout → Checkout settings → Default payment link.** Set to `https://<client-tunnel-host>/payments/checkout`.

#### Step 6 — Register the sandbox webhook endpoint

1. **Developer Tools → Notifications → New destination.**
2. URL: `https://<api-tunnel-host>/payments/webhook`.
3. Events: select **`transaction.completed`** only. Deselect everything else.
4. Save. Click the destination to open it and copy the **Signing secret** (`pdl_ntfset_...`).
5. This is your `PADDLE_WEBHOOK_SECRET` for the dev env.

> **Note:** The sandbox dashboard has no "recent deliveries" view for webhooks. To send test events to your endpoint, use **Developer Tools → Simulations** (see Step 8).

#### Step 7 — Fill in env files

`server/.env.development.local`:

```env
CLIENT_URL=https://<client-tunnel-host>     # no trailing slash
PADDLE_API_KEY=<sandbox API key from Step 3>
PADDLE_WEBHOOK_SECRET=<signing secret from Step 6>
PADDLE_PRICE_ID_EXPLORER=<Explorer price ID from Step 2>
PADDLE_PRICE_ID_CHRONOGRAPHER=<Chronographer price ID from Step 2>
PADDLE_SANDBOX=true
```

`client/.env.development.local`:

```env
VITE_API_BASE_URL=https://<api-tunnel-host>
VITE_PADDLE_CLIENT_TOKEN=<client-side token from Step 3>
VITE_PADDLE_ENV=sandbox
```

#### Step 8 — Run the full end-to-end test

1. Keep both ngrok tunnels running.
2. `pnpm dev` — start client + server.
3. Open the **client tunnel URL** in the browser (not `localhost:7002`, so cookies and `checkout.url` line up with the approved domain) and log in as a test user (observer badge).
4. Go to `/billing`, click **Upgrade to Explorer**.
5. The browser redirects to `…/payments/checkout?_ptxn=txn_…` and Paddle.js opens the overlay on top of the page.
6. Pay with test card `4242 4242 4242 4242`, any future expiry, CVC `100`.
7. The overlay fires `checkout.completed`; the page navigates to `/payments/return`, which polls and flips to the success screen once the webhook has updated the badge.
8. In the Paddle sandbox dashboard, run **Developer Tools → Simulations → New simulation → transaction.completed** against your API tunnel URL to also test the webhook in isolation. Confirm the response is **200**.
9. In Prisma Studio (`npx prisma studio` in `server/`) or psql, confirm the user's `badge` column changed to `explorer`.
10. Resend the simulation — the server must return 200 again and the badge must not change (idempotency check).

---

### Phase 2 — Production (live payments)

#### Step 1 — Create a Paddle production account

- Go to [vendors.paddle.com](https://vendors.paddle.com) and register or log in.
- Complete **business verification** — Paddle requires company/individual details, tax information, and a payout bank account before you can go live. This can take **1–3 business days**.
- Under **Business → Locations**, confirm Armenia is listed as your business country.

#### Step 2 — Create the same product and prices in production

- Repeat sandbox Step 2 exactly, but in the **production** dashboard.
- The production price IDs (`pri_01...`) will be **different** from sandbox — copy them separately.

#### Step 3 — Get a production API key and client-side token

1. **Developer Tools → Authentication → API keys → New API key.** Copy — this is the production `PADDLE_API_KEY`.
2. **Developer Tools → Authentication → Client-side tokens → New token.** Copy — this is the production `VITE_PADDLE_CLIENT_TOKEN`.

#### Step 4 — Approve the production domain and set the default payment link

1. **Checkout → Website approval → Add domain.** Paste your production client host (e.g. `regionify.mnavasardian.com`). Production approval requires verification (1–3 days).
2. **Checkout → Checkout settings → Default payment link.** Set to `https://regionify.mnavasardian.com/payments/checkout` (or your real client origin).

#### Step 5 — Register the production webhook endpoint

1. **Developer Tools → Notifications → New destination.**
2. URL: `https://api.regionify.mnavasardian.com/payments/webhook`
   _(This must be the live, TLS-secured API URL — no tunnel needed in production.)_
3. Events: **`transaction.completed`** only.
4. Save and copy the **Signing secret**. This is your production `PADDLE_WEBHOOK_SECRET`.

#### Step 6 — Fill in production env files

`server/.env.production.local` (server):

```env
PADDLE_API_KEY=<production API key from Step 3>
PADDLE_WEBHOOK_SECRET=<signing secret from Step 5>
PADDLE_PRICE_ID_EXPLORER=<Explorer price ID from Step 2>
PADDLE_PRICE_ID_CHRONOGRAPHER=<Chronographer price ID from Step 2>
# PADDLE_SANDBOX — omit entirely, or set to anything other than "true"
```

Client production env (wherever Vite builds the client):

```env
VITE_PADDLE_CLIENT_TOKEN=<production client-side token from Step 3>
VITE_PADDLE_ENV=production
```

#### Step 7 — Deploy

Standard deploy. The new env vars take effect on next server start — no code changes needed, no DB migration needed.

#### Step 8 — Run a live smoke test

- Paddle allows test transactions on production before full activation. Use a real card with a small amount, then issue a refund from the Paddle dashboard.
- Alternatively, run one real $49 Explorer purchase on a personal account and verify the full flow: checkout → overlay → webhook → badge updated → success screen.
- Check **Developer Tools → Notifications → recent deliveries** in the production dashboard to confirm the webhook was delivered with a **200** response.

#### Step 9 — Go live

Once you have verified a successful real transaction, Paddle will remove any remaining restrictions on your account (if they exist). Payments from real customers will work from this point.

---

### Quick reference: sandbox vs production differences

|                      | Sandbox                    | Production                     |
| -------------------- | -------------------------- | ------------------------------ |
| Dashboard            | sandbox-vendors.paddle.com | vendors.paddle.com             |
| API base             | sandbox-api.paddle.com     | api.paddle.com                 |
| `PADDLE_SANDBOX` env | `true`                     | omit                           |
| Price IDs            | different `pri_...` values | different `pri_...` values     |
| API key              | separate key               | separate key                   |
| Webhook secret       | separate secret            | separate secret                |
| Webhook URL          | ngrok/tunnel               | api.regionify.mnavasardian.com |
| Real money           | no                         | yes                            |
