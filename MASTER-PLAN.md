# e-AMS — Master Plan
### Production Fullstack Rebuild — Next.js + Express + PostgreSQL (Prisma/Neon) + Stripe/SSLCommerz

**Model:** Closed marketplace — account required to buy or sell, role chosen at registration (Buyer / Seller), fixed thereafter. Separate Admin / Super Admin roles (internal, not self-registered).
**Payments:** Stripe (international) + SSLCommerz (regional/BDT), held in **platform escrow** until buyer confirms receipt. Platform takes 5% commission on release; seller claims payout to bank account.
**Bidding:** Real-time via Socket.io

---

## 1. User & Role Model

Four fixed roles, chosen (for Buyer/Seller) at registration and not switchable by the user:

- **BUYER** — browse, bid, add to cart / buy-now, checkout, confirm receipt, view order history. Can browse and view auction details while logged out, but must be logged in **as a buyer** to bid, cart, or checkout.
- **SELLER** — create/manage listings, must complete **bank credential setup** before publishing a live auction (payouts are meaningless without it), request payout once an order is marked received.
- **ADMIN** — moderation queue, flagged auctions, user/KYC review, dispute handling. Created by Super Admin only (no public signup).
- **SUPER_ADMIN** — everything Admin can do, plus: create/manage Admin accounts, platform-wide financial oversight (commission reports, payout approvals if manual-review is enabled), system settings.

Registration flow: user picks **Buyer** or **Seller** on the signup form → account is scoped to that role permanently (an org needing both would register two accounts — matches "role is separate").

Dashboard shells:
- `/dashboard` (buyer) → Overview, My Bids, Cart, Orders, Watchlist
- `/dashboard` (seller) → Overview, My Listings, Bank Details, Payout Requests, Sales History
- `/admin` → Admin shell (moderation, users, disputes)
- `/admin` (super admin extra tabs) → Admin Management, Payout Approvals, Commission Reports

---

## 2. Database Schema (Prisma models — condensed)

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  passwordHash  String
  fullName      String
  organization  String?
  phone         String?
  role          Role     // BUYER | SELLER | ADMIN | SUPER_ADMIN — set at registration, fixed
  kycStatus     KycStatus @default(UNVERIFIED)
  mfaEnabled    Boolean  @default(false)
  mfaSecret     String?
  createdAt     DateTime @default(now())

  // seller-only
  bankAccount   BankAccount?
  listings      Auction[]     @relation("SellerListings")

  // buyer-only
  bids          Bid[]
  cart          Cart?
  orders        Order[]       @relation("BuyerOrders")
  watchlist     Watchlist[]

  notifications Notification[]
  addresses     Address[]

  // admin bookkeeping
  createdByAdmin String?      // super admin who created this admin account
}

model BankAccount {
  id            String   @id @default(cuid())
  sellerId      String   @unique
  seller        User     @relation(fields: [sellerId], references: [id])
  accountName   String
  accountNumber String
  bankName      String
  routingOrBranch String
  verified      Boolean  @default(false)   // admin-verified before first payout
  createdAt     DateTime @default(now())
}

model Auction {
  id             String   @id @default(cuid())
  sellerId       String
  seller         User     @relation("SellerListings", fields: [sellerId], references: [id])
  title          String
  slug           String   @unique
  description    String
  category       String
  condition      String
  images         String[]
  startingBid    Decimal
  reservePrice   Decimal?
  buyNowPrice    Decimal?
  currentBid     Decimal  @default(0)
  minIncrement   Decimal  @default(100)
  status         AuctionStatus @default(DRAFT) // DRAFT, LIVE, ENDED, CANCELLED, FLAGGED
  antiSnipe      Boolean  @default(false)
  startsAt       DateTime
  endsAt         DateTime
  reserveMet     Boolean  @default(false)
  winnerId       String?
  createdAt      DateTime @default(now())

  bids           Bid[]
  watchers       Watchlist[]
  flags          AuctionFlag[]
  cartItems      CartItem[]
  order          Order?
}

model Bid {
  id          String   @id @default(cuid())
  auctionId   String
  auction     Auction  @relation(fields: [auctionId], references: [id])
  bidderId    String
  bidder      User     @relation(fields: [bidderId], references: [id])
  amount      Decimal
  isProxy     Boolean  @default(false)
  maxProxyAmt Decimal?
  createdAt   DateTime @default(now())
}

model Cart {
  id     String     @id @default(cuid())
  buyerId String    @unique
  buyer  User        @relation(fields: [buyerId], references: [id])
  items  CartItem[]
}

model CartItem {
  id        String   @id @default(cuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id])
  auctionId String   // only auctions the buyer WON or a buy-now item, pre-checkout
  auction   Auction  @relation(fields: [auctionId], references: [id])
  addedAt   DateTime @default(now())
}

// One Order per completed auction sale — the escrow + fulfillment record
model Order {
  id               String   @id @default(cuid())
  auctionId        String   @unique
  auction          Auction  @relation(fields: [auctionId], references: [id])
  buyerId          String
  buyer            User     @relation("BuyerOrders", fields: [buyerId], references: [id])
  finalAmount      Decimal
  platformFeePct   Decimal  @default(5.0)
  platformFeeAmt   Decimal
  sellerPayoutAmt  Decimal  // finalAmount - platformFeeAmt
  status           OrderStatus @default(AWAITING_PAYMENT)
  // AWAITING_PAYMENT -> PAID_ESCROW -> SHIPPED -> RECEIVED_CONFIRMED -> PAYOUT_REQUESTED -> PAYOUT_COMPLETED
  // side paths: DISPUTED, REFUNDED, CANCELLED
  paidAt           DateTime?
  receivedConfirmedAt DateTime?
  payoutRequestedAt   DateTime?
  payoutCompletedAt   DateTime?
  createdAt        DateTime @default(now())

  payment          Payment?
  payout           Payout?
}

model Payment {
  id              String   @id @default(cuid())
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  gateway         Gateway  // STRIPE, SSLCOMMERZ
  amount          Decimal
  status          PaymentStatus @default(PENDING) // PENDING, PAID, FAILED, REFUNDED
  providerRef     String?
  createdAt       DateTime @default(now())
}

// Seller-initiated withdrawal request against a RECEIVED_CONFIRMED order
model Payout {
  id           String   @id @default(cuid())
  orderId      String   @unique
  order        Order    @relation(fields: [orderId], references: [id])
  sellerId     String
  amount       Decimal
  status       PayoutStatus @default(REQUESTED) // REQUESTED, APPROVED, PAID, REJECTED
  approvedBy   String?  // admin/super-admin userId
  requestedAt  DateTime @default(now())
  paidAt       DateTime?
}

model Watchlist {
  id        String  @id @default(cuid())
  userId    String
  user      User    @relation(fields: [userId], references: [id])
  auctionId String
  auction   Auction @relation(fields: [auctionId], references: [id])
  @@unique([userId, auctionId])
}

model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // OUTBID, ENDING_SOON, PAYMENT_CONFIRMED, ORDER_RECEIVED, PAYOUT_APPROVED, KYC_UPDATE, AUCTION_FLAGGED
  title     String
  body      String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())
}

model AuctionFlag {
  id          String   @id @default(cuid())
  auctionId   String
  auction     Auction  @relation(fields: [auctionId], references: [id])
  reason      String
  resolvedBy  String?
  resolvedAt  DateTime?
  createdAt   DateTime @default(now())
}

model Address { id String @id @default(cuid()) userId String user User @relation(fields:[userId],references:[id]) line1 String city String state String country String }

enum Role { BUYER SELLER ADMIN SUPER_ADMIN }
enum KycStatus { UNVERIFIED PENDING VERIFIED REJECTED }
enum AuctionStatus { DRAFT LIVE ENDED CANCELLED FLAGGED }
enum OrderStatus { AWAITING_PAYMENT PAID_ESCROW SHIPPED RECEIVED_CONFIRMED PAYOUT_REQUESTED PAYOUT_COMPLETED DISPUTED REFUNDED CANCELLED }
enum Gateway { STRIPE SSLCOMMERZ }
enum PaymentStatus { PENDING PAID FAILED REFUNDED }
enum PayoutStatus { REQUESTED APPROVED PAID REJECTED }
```

**Escrow flow:** Buyer wins/buy-nows → `Order` created (`AWAITING_PAYMENT`) → pays via Stripe/SSLCommerz → webhook flips to `PAID_ESCROW` (money sits with platform, not seller) → seller marks `SHIPPED` → buyer confirms receipt → `RECEIVED_CONFIRMED` → seller can now hit "Claim Payout" → `Payout` record created (`REQUESTED`) → admin/super-admin approves → platform transfers `sellerPayoutAmt` (95%) to the seller's verified `BankAccount` → `PAYOUT_COMPLETED`. The 5% (`platformFeeAmt`) stays with the platform automatically — it's computed at Order creation, never separately transferred.

---

## 3. API Surface (Express, REST)

```
/api/auth            register (role: BUYER|SELLER), login, refresh, mfa/setup, mfa/verify
/api/users           me, kyc/submit, kyc/status
/api/auctions        GET (list+filter), GET/:slug, POST (SELLER, create), PATCH/:id, POST/:id/publish
/api/bids            POST /auctions/:id/bids, GET /auctions/:id/bids            [BUYER only]
/api/cart            GET, POST /:auctionId, DELETE /:auctionId                  [BUYER only]
/api/watchlist       POST/DELETE /:auctionId                                    [BUYER only]
/api/seller/bank     GET, POST, PATCH (bank credentials)                        [SELLER only]
/api/orders          GET (mine), GET/:id, POST /:auctionId/checkout,
                      PATCH /:id/ship        [SELLER]
                      PATCH /:id/confirm-receipt  [BUYER]
/api/payments        POST /checkout/stripe, POST /checkout/sslcommerz, webhooks
/api/payouts         POST /orders/:id/claim  [SELLER], GET /mine [SELLER]
/api/notifications   GET, PATCH/:id/read
/api/admin           GET /users, PATCH /users/:id, GET /flags, PATCH /flags/:id,
                      GET /payouts, PATCH /payouts/:id/approve|reject, GET /analytics
/api/super-admin     POST /admins, GET /admins, PATCH /admins/:id/deactivate,
                      GET /commission-report
```

**WebSocket namespace `/ws/auctions/:id`**
- `bid:new` → broadcast updated currentBid + bidder (masked) + bid history entry
- `auction:extended` → anti-snipe trigger, new endsAt
- `auction:ended` → final state, winner
- `outbid` → targeted event to previous highest bidder → triggers Notification

---

## 4. Next.js Route Tree

```
/                              → home (live auctions, how-it-works)
/auctions                      → listing + filters (public, viewable logged-out)
/auctions/[slug]                → detail (bidding UI locked unless logged in as BUYER)
/login /register                 → auth — register has a Buyer/Seller role picker, fixed after signup
/cart                             → BUYER — items pending checkout (won/buy-now auctions)
/checkout/[orderId]              → escrow payment (Stripe/SSLCommerz)

/dashboard                       → BUYER: Overview, My Bids, Watchlist, Orders (+ confirm receipt action)
/dashboard/listings              → SELLER: My Listings (Draft/Live/Ended)
/dashboard/listings/new          → SELLER: create auction — blocked until bank details are set
/dashboard/listings/[id]/edit
/dashboard/bank                  → SELLER: bank credential setup/edit (required before publish)
/dashboard/sales                 → SELLER: sold orders + "Claim Payout" per RECEIVED_CONFIRMED order
/dashboard/payouts                → SELLER: payout request history/status

/notifications
/admin                            → ADMIN + SUPER_ADMIN: moderation queue, flagged auctions
/admin/users                      → KYC review, suspend/reinstate
/admin/payouts                    → approve/reject seller payout requests
/admin/analytics
/admin/admins                     → SUPER_ADMIN only: create/manage admin accounts
/admin/commission-report          → SUPER_ADMIN only
```

Top nav: **Home / Auctions / Cart (buyer) / Dashboard**. Sellers never see Cart; buyers never see "Create Listing" — nav renders per role.

---

## 5. Payment Gateway Strategy

Both gateways route into **platform escrow**, not directly to the seller. Abstraction layer picks gateway by user region/currency at checkout:
- Stripe: card payments, international, webhook-verified → `Payment.status = PAID` → `Order.status = PAID_ESCROW`
- SSLCommerz: BDT/local bank, webhook-verified → same transition
- Shared `PaymentService` interface: `createSession()`, `verifyWebhook()`, `refund()`
- **Payout** is a *separate* transfer, seller-initiated after `RECEIVED_CONFIRMED`, admin-approved, executed via Stripe Connect payouts (int'l sellers) or manual/SSLCommerz disbursement (local sellers) against the verified `BankAccount`.

---

## 6. Build Phases

| Phase | Scope |
|---|---|
| **0 — Foundation** | Repo setup, Neon DB, Prisma schema + migrations, auth (JWT + MFA) with role picker at registration, base Next.js layout using DESIGN.md tokens (Tailwind theme config), role-based route guards |
| **1 — Core Marketplace** | Auction CRUD (seller-only, gated behind verified bank account), listing/detail pages, search & filter, image upload |
| **2 — Bidding Engine** | Socket.io server, live bid updates, proxy bidding, anti-snipe, bid history — buyer-only |
| **3 — Cart & Checkout** | Cart (won/buy-now items), Order creation, Stripe + SSLCommerz checkout, webhook → `PAID_ESCROW` |
| **4 — Fulfillment & Escrow** | Seller "Mark Shipped", buyer "Confirm Receipt", order status timeline UI |
| **5 — Payouts** | Seller "Claim Payout" flow, admin/super-admin approval queue, commission auto-calc, payout execution |
| **6 — Dashboards** | Buyer dashboard (bids/orders/watchlist), Seller dashboard (listings/sales/bank/payouts), Admin dashboard (moderation/users/payout approvals), Super Admin (admin management/commission reports) |
| **7 — Notifications** | In-app + email, real-time push via socket, notification center UI (outbid, shipped, payout approved, etc.) |
| **8 — Polish & Deploy** | KYC gating refinement, responsive/mobile breakpoints per DESIGN.md, Vercel + API host deploy, seed data |

---

## 7. Open Decisions For Later (flag, not blocking)
- Image storage provider (R2 vs UploadThing vs S3)
- Email provider (Resend vs SES)
- Dispute resolution flow detail (buyer claims item not received/not as described — refund path)
- Payout execution mechanism per gateway: Stripe Connect (automated) vs SSLCommerz (likely manual admin-triggered bank transfer, since SSLCommerz doesn't have a Connect-style payouts API)
- Whether platform fee % should be configurable per category/admin-adjustable, or hardcoded 5%

---

*Next: Phase 0 scaffolding — repo structure, Prisma schema file, Tailwind theme mapped from DESIGN.md, and auth flow.*
