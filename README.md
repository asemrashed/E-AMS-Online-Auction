# e-AMS — Auction Management System

Production-oriented fullstack rebuild: **Next.js (App Router) + Express + PostgreSQL (Prisma/Neon) + Stripe/SSLCommerz**, real-time bidding via **Socket.io**.

This matches `MASTER-PLAN.md` from the planning phase: strict role separation (Buyer / Seller / Admin / Super Admin), cart + escrow checkout, and a seller payout-claim flow with admin approval and a 5% platform commission.

## Monorepo layout

```
e-ams/
├── packages/db/         # Prisma schema, client, seed script — shared by API
├── apps/api/             # Express REST API + Socket.io bidding engine
└── apps/web/              # Next.js frontend (App Router, Tailwind, DESIGN.md tokens)
```

## 1. Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database (or any Postgres instance)
- Stripe account (test mode is fine) for card payments
- SSLCommerz sandbox credentials for BDT/local payments

## 2. Install

From the repo root (npm workspaces):

```bash
npm install
```

## 3. Environment variables

Copy `.env.example` to `.env` in the repo root **and** in `apps/api/` (Express reads `process.env` directly) and `apps/web/` (Next.js needs its own `.env.local` for `NEXT_PUBLIC_*` vars):

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Fill in:
- `DATABASE_URL` — your Neon connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — long random strings
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PUBLISHABLE_KEY`
- `SSLCOMMERZ_STORE_ID` / `SSLCOMMERZ_STORE_PASSWORD`

## 4. Database

```bash
npm run db:generate     # generate Prisma client
npm run db:migrate      # create tables (dev migration)
npm run db:seed         # seed sample super admin / admin / seller / buyer / auction
```

Seeded logins (password for all: `Password123!`):
| Role | Email |
|---|---|
| Super Admin | superadmin@eams.com |
| Admin | admin@eams.com |
| Seller (bank verified) | seller@eams.com |
| Buyer | buyer@eams.com |

## 5. Run

Two terminals:

```bash
npm run dev:api    # Express + Socket.io on :4000
npm run dev:web    # Next.js on :3000
```

Visit `http://localhost:3000`.

## 6. Payment webhooks (local testing)

**Stripe** — use the Stripe CLI to forward events:
```bash
stripe listen --forward-to localhost:4000/api/payments/webhook/stripe
```

**SSLCommerz** — the sandbox posts directly to `success_url`, which is configured to hit `API_URL/api/payments/webhook/sslcommerz`. For local dev, expose your API with a tunnel (e.g. `ngrok http 4000`) and set `API_URL` accordingly so SSLCommerz's sandbox can reach it.

## 7. Core flows implemented

- **Registration** — role picker (Buyer/Seller), fixed at signup; Admin/Super Admin are never self-registered
- **Seller onboarding gate** — a seller cannot publish an auction until `BankAccount` exists (`POST /api/auctions` returns `412` otherwise)
- **Live bidding** — Socket.io room per auction (`auction:<id>`), broadcasts `bid:new`, `auction:extended` (anti-snipe), and a targeted `outbid` event to the previous top bidder
- **Cart & Checkout** — buyer adds a won/buy-now auction to cart → `POST /api/orders/:auctionId/checkout` creates an `Order` (`AWAITING_PAYMENT`) → Stripe or SSLCommerz checkout session
- **Escrow** — payment webhook flips the order to `PAID_ESCROW` (funds held by platform, not the seller)
- **Fulfillment** — seller marks `SHIPPED` → buyer marks `RECEIVED_CONFIRMED`
- **Payout claim** — seller can only claim once `RECEIVED_CONFIRMED` and bank account is verified → creates a `Payout` (`REQUESTED`) → admin/super-admin approves → order becomes `PAYOUT_COMPLETED`. The 5% platform fee (`platformFeeAmt`) is computed once at checkout and never transferred — only `sellerPayoutAmt` (95%) moves out.
- **Admin** — moderation queue (flagged auctions), user KYC/suspend, bank verification, payout approvals, analytics
- **Super Admin** — everything Admin can do, plus creating/deactivating Admin accounts and a commission report

## 8. What's stubbed / needs production hardening before launch

- **MFA** — `/api/auth/mfa/*` are stubs; wire up `otplib` for real TOTP generation/verification
- **Image upload** — `images: string[]` on `Auction` expects URLs; wire an actual uploader (S3/R2/UploadThing) and swap the placeholder file-input UI in the create-listing form
- **Email notifications** — only in-app (`Notification` model + Socket.io push) is implemented; add Resend/SES for email fan-out
- **Stripe payouts** — admin "Approve & Pay" currently just flips status; wire real fund transfer via Stripe Connect (international) and a manual/back-office process for SSLCommerz sellers (no Connect-equivalent API)
- **Refunds/disputes** — `Order.status` includes `DISPUTED`/`REFUNDED` and `PaymentService.refund()` exists, but there's no dispute-filing UI yet
- **Rate limiting / input sanitization hardening**, **audit logging** for admin actions, and **production CORS/cookie** config for cross-domain deploys
