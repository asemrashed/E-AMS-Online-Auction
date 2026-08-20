# e-AMS — Complete Client Guideline

This is the handover guide for **e-AMS** (Auction Management System). It is written for a client who does not code. Follow the steps in order. If a step asks you to “open a terminal,” that means the black command window where you type short commands — you do not need to understand programming to do this.

---

## How to use this document

| If you want to… | Go to |
|---|---|
| Understand what you received | Part 1 |
| Install the computer programs | Part 2 |
| Put the project on a computer and start it | Part 3 |
| Log in and try the demo accounts | Part 4 |
| Learn the public website (what visitors see) | Part 5 |
| Learn the dashboard (logged-in control panel) | Part 6 |
| Learn admin / owner tools | Part 7 |
| See every screen, listed | Part 8 |
| See how money, bidding, and payouts work | Part 9 |
| Fill in keys (database, email, payments, images) | Part 10 |
| Fix common problems | Part 11 |

**Simple language used in this project**

| What people say | What it means here |
|---|---|
| **Public site / frontend** | The website visitors use: Home, Auctions, About, Contact, Login, Register, lot pages. Address: `http://localhost:3000` |
| **Dashboard / backend (for users)** | The logged-in control panel after Login: buyer tools, seller tools, and admin tools. Same website, different pages (`/dashboard` and `/admin`) |
| **API / engine (technical)** | A second program that must also be running in the background on port **4000**. The public site and dashboard both talk to this engine. If it is off, the website looks empty or shows errors. |

You always start **two** things: the **engine** and the **website**. Both are required.

---

## Part 1 — What you received

e-AMS is a **closed marketplace** for high-value lots (machinery, vehicles, equipment, and similar assets).

- Anyone can **browse** auctions without an account.
- To **bid, buy, or sell**, a person must create an account.
- At signup they choose **Buyer** or **Seller**. That choice is **permanent** for that account. If a company needs both, they create two accounts.
- **Admin** and **Super Admin** accounts are **not** created from the public Register page. They are created internally (demo accounts are included; Super Admin can create more admins).
- Buyer payments go into **platform escrow**. The seller is paid only after the buyer confirms they received the item, then a payout request is approved.
- The platform keeps a **5% commission**. The seller’s claim amount is **95%** of the sale.

### What is in the project folder

This is **one** project (not two separate GitHub clones).

```
e-ams/
├── guideline.md          ← this file
├── .env.example          ← template for secrets (copy, then fill in)
├── .env                  ← your real secrets (never share this file)
├── apps/web              ← public website + dashboard (the screens people see)
├── apps/api              ← engine / API (must run on port 4000)
└── packages/db           ← database structure
```

### Accounts (roles)

| Role | Who it is for | Can they sign up themselves? |
|---|---|---|
| **Buyer** | People who bid and pay | Yes, on Register |
| **Seller** | People who list lots and receive payouts | Yes, on Register |
| **Admin** | Staff who verify users, banks, flags, payouts | No — Super Admin creates them |
| **Super Admin** | Owner. Everything Admin can do, plus create admins and see commission | No — included in the seed data |

---

## Part 2 — Install the programs (once per computer)

Do this **before** you try to run the project. Windows is assumed. Mac/Linux is similar; use Terminal instead of PowerShell.

### 2.1 Node.js (required)

Node.js is the runtime that runs this project. **npm** (the installer for project libraries) is included with Node.js.

1. Open: [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** version (**20 or newer**).
3. Run the installer. Keep the option that says **npm** checked.
4. Restart the computer if the installer asks you to.

**Check it worked**

1. Press the Windows key, type `PowerShell`, open **Windows PowerShell**.
2. Type these two commands, pressing Enter after each:

```powershell
node -v
npm -v
```

You should see version numbers (for example `v20.18.0` and `10.x.x`). If Windows says the command is not recognized, Node.js is not installed correctly — reinstall and restart.

This project uses **npm**, not pnpm.

### 2.2 Git (recommended)

Git copies the project from a repository if you were given a GitHub/GitLab link.

1. Open: [https://git-scm.com](https://git-scm.com)
2. Install with default options.

Check:

```powershell
git --version
```

If you were given a **ZIP file** instead of a Git link, skip Git. Unzip the folder to a simple path such as `C:\Projects\e-ams`.

### 2.3 A code editor (optional but useful)

[Visual Studio Code](https://code.visualstudio.com) lets you open the folder, edit the `.env` file, and open a terminal inside the project. You can also use Notepad for `.env` if you prefer.

### 2.4 A PostgreSQL database (required)

The old BidWise-style apps used MongoDB. **This project uses PostgreSQL.**

Easiest option: a free cloud database at [Neon](https://neon.tech).

1. Create an account and a new project.
2. Copy the **connection string**. It looks like:

`postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require`

You will paste this into `.env` as `DATABASE_URL` in Part 3.

You may also use any other PostgreSQL server (local or hosted). The connection string still goes in `DATABASE_URL`.

### 2.5 Accounts you will need for a full live system

| Service | Why | When you need it |
|---|---|---|
| **Neon / Postgres** | Stores users, auctions, orders | Always |
| **Gmail (or other SMTP)** | Email verification and password reset codes | Needed for real signup and “forgot password” |
| **Cloudinary** | Uploading listing photos, KYC docs, avatars | Needed for image upload |
| **Stripe** (test keys are fine at first) | Card payments in USD | Needed to test card checkout |
| **SSLCommerz** (sandbox is fine) | Local / BDT payments | Needed to test SSLCommerz checkout |

You can start the website with only the database filled in. Payments, email, and image upload will fail until those keys are added. That is normal during first setup.

---

## Part 3 — Put the project on the computer and run it

### 3.1 Get the folder

**If you have Git and a repository URL:**

```powershell
cd C:\Projects
git clone PASTE_THE_REPO_URL_HERE
cd e-ams
```

**If you have a ZIP:** unzip it, then in PowerShell:

```powershell
cd C:\path\to\e-ams
```

You must be **inside** the `e-ams` folder (the one that contains `package.json` and `guideline.md`) for the next commands.

### 3.2 Install project libraries

This downloads everything the software needs. It can take a few minutes. You only do this once (or again if libraries change).

```powershell
npm install
```

Wait until it finishes without a red error. A `node_modules` folder will appear. Do not delete it.

### 3.3 Create the secret file (`.env`)

1. In the project root, copy `.env.example` to `.env`.

PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Also copy the same file for the public website (Next.js reads public keys from this location):

```powershell
Copy-Item .env.example apps\web\.env.local
```

3. Open `.env` in Notepad or VS Code. Fill in at least:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Your Neon / Postgres connection string |
| `JWT_ACCESS_SECRET` | A long random sentence or password (any secret string) |
| `JWT_REFRESH_SECRET` | A **different** long random string |
| `WEB_URL` | Leave `http://localhost:3000` for local use |
| `API_URL` | Leave `http://localhost:4000` for local use |
| `NEXT_PUBLIC_API_URL` | Leave `http://localhost:4000` for local use |
| `PLATFORM_FEE_PCT` | `5` (5% commission) |

Copy the **same** values into `apps\web\.env.local` for any line that starts with `NEXT_PUBLIC_`.

**Never send `.env` by email or commit it to a public repository.** It contains passwords and payment keys.

The other keys (Stripe, SSLCommerz, Cloudinary, SMTP) are explained in Part 10. Leave placeholders if you only want to look at screens first.

### 3.4 Create the database tables and demo data

Run these **in order**, still from the `e-ams` folder:

```powershell
npm run db:generate
npm run db:migrate
npm run db:seed
```

- `db:generate` — prepares the database toolkit.
- `db:migrate` — creates all tables (users, auctions, orders, and so on).
- `db:seed` — inserts **demo accounts** and one sample live auction.

If `db:migrate` asks for a migration name, type `init` and press Enter.

If these fail, your `DATABASE_URL` is wrong, or the database is not reachable. Double-check the Neon string and that your internet is on.

### 3.5 Start the software (two windows)

You need **two** PowerShell windows. Keep both open while you use the site.

**Window 1 — engine (API)**

```powershell
cd C:\path\to\e-ams
npm run dev:api
```

Wait until you see a line like: `e-AMS API listening on port 4000`.

**Window 2 — public website + dashboard**

```powershell
cd C:\path\to\e-ams
npm run dev:web
```

Wait until you see something like: `Ready` and `http://localhost:3000`.

### 3.6 Open it in a browser

Go to: **[http://localhost:3000](http://localhost:3000)**

| Address | What you get |
|---|---|
| `http://localhost:3000` | Public website |
| `http://localhost:3000/dashboard` | User dashboard (after login) |
| `http://localhost:3000/admin` | Admin dashboard (admin login only) |
| `http://localhost:4000/health` | Engine health check. Should show `{"status":"ok"}` |

To stop the software, click each terminal window and press **Ctrl + C**.

You do **not** run `node index.js` or `pnpm`. Use the two `npm run` commands above.

---

## Part 4 — Demo logins (after seed)

Password for **all** demo users:

```
Password123!
```

| Role | Email | After login goes to |
|---|---|---|
| Super Admin (owner) | `superadmin@eams.com` | `/admin` |
| Admin (staff) | `admin@eams.com` | `/admin` |
| Seller (bank already verified) | `seller@eams.com` | `/dashboard` |
| Buyer (KYC already verified) | `buyer@eams.com` | `/dashboard` |

These accounts skip email verification because the seed marks them as verified.

There is a sample live lot: **Caterpillar D9T Track-Type Tractor (2018)** listed by the demo seller, with bids already placed by the demo buyer.

---

## Part 5 — Public website (frontend)

This is everything a visitor sees **without** using the dashboard sidebar. The top bar includes: **Home**, **Auctions**, **About**, **Contact**, theme (light/dark), cart (buyers only), notifications, and Login / Register.

A **live market ticker** under the header shows current live lots and prices.

### 5.1 Home — `/`

- Hero message and buttons: Browse Live Auctions, Create an Account.
- Featured live lot with countdown and current bid.
- Stats strip (display figures).
- Up to three live auction cards.
- Browse by category: Heavy Machinery, Industrial Equipment, Vehicles, Electronics, Office Equipment, Real Estate & Land.
- How it works (register / KYC → bid → escrow settlement).
- Security section: escrow, optional MFA, real-time bids, verified sellers.
- Call-to-action to register as buyer or seller.

### 5.2 Auctions list — `/auctions`

- Search by title text.
- Filter by category.
- Filter by time: **Live**, **Upcoming**, **Ended**.
- Sort (including price).
- Each card opens the lot detail page.

### 5.3 Auction / lot detail — `/auctions/[slug]`

Anyone can view:

- Photo gallery.
- Title, description, category, condition, seller name (link to public profile).
- Countdown until end.
- Current bid, whether **reserve is met**.
- Bid history (amount, time, bidder display name).
- **Watch** (buyers, after login).
- **Flag / report** listing (logged-in users).

Bidding (buyers only, after login + **KYC verified**):

- Minimum next bid = current bid + minimum increment.
- Quick buttons: +1×, +5×, +10× increment.
- Optional **proxy max** (auto-bid up to a ceiling).
- You cannot outbid yourself while you already hold the lead.
- **Buy Now** if the seller set a Buy Now price — ends the auction immediately, adds the lot to the cart.
- Bids update **live** for everyone watching the page (no refresh needed).
- If **anti-snipe** is on and a bid arrives in the last **5 minutes**, the clock extends by **5 minutes**.

Sellers cannot bid. Guests see “Log in to bid.” Unverified buyers are sent to KYC.

### 5.4 About — `/about`

Explains the platform, escrow, and trust practices (marketing / help content).

### 5.5 Contact — `/contact`

Public form: name, email, subject, message. Saved as a contact inquiry. Also shows placeholder office details (email, phone, address, hours).

### 5.6 Register — `/register`

- Choose **Buy** or **Sell** (permanent).
- Full name, email, password, phone.
- Sellers also enter **organization**.
- After signup, user is sent to **Verify email**.

Admin / Super Admin **cannot** be created here.

### 5.7 Verify email — `/verify-email`

- 5-character code emailed to the user (valid about 10 minutes).
- “Resend code” is available.
- After success, the user is logged in and sent to their dashboard.

Requires SMTP to be configured (Part 10). Demo seed users skip this.

### 5.8 Login — `/login`

- Email + password.
- If email is not verified, user is sent back to verify-email.
- If MFA is enabled, user is sent to `/login/mfa` for a 6-digit authenticator code.
- Optional `?next=` so they return to the page they wanted (for example cart).
- Link to **Forgot password**.

### 5.9 Forgot password — `/forgot-password`

1. Enter email → a reset code is emailed.
2. Enter code + new password.
3. Return to login.

### 5.10 Cart — `/cart` (buyers, must be logged in)

Not a shopping cart for random lots. Items appear when:

- The buyer **won** an auction, or
- The buyer used **Buy Now**, or
- The buyer added a lot they are allowed to check out.

Checkout is enabled only if they **won** (auction ended and they are the winner). Live lots in the cart wait until the auction ends. Non-winners cannot pay. Items can be removed.

### 5.11 Checkout — `/checkout/[orderId]` (buyers)

- Shows the lot and amount.
- Choose **Stripe (card, USD)** or **SSLCommerz (BDT / local banks)**.
- Redirects to the payment provider.
- Success page: `/checkout/[orderId]/success`.
- Failed / cancelled returns with a status message.
- Money is treated as **escrow** after a successful payment webhook — not paid out to the seller yet.

### 5.12 Public profile — `/users/[id]`

Visible profile for buyers and sellers:

- Photo, name, organization, bio, phone, address, member since.
- Total sells, total buys, average rating, review count.
- Written reviews from counterparties after completed deals.

Admins do not use this the same way; they work inside `/admin`.

### 5.13 Notifications — `/notifications` (logged in)

Bell in the header. Full page lists all / unread. Types include outbid, auction won/ended, payment, shipping, payout, KYC, flags, and similar. Clicking a notice can open the related page. Individual items can be marked read.

### 5.14 Footer

Links to live auctions, register, about, category shortcuts, contact, KYC, escrow explanation. Light/dark theme toggle is in the header.

---

## Part 6 — Dashboard (what you called backend)

After login, open **Dashboard** from the account menu (top right). Buyers and sellers get a **left sidebar**. Admins are redirected to `/admin` (Part 7).

Shared for buyers and sellers:

- Header: role label, theme, notifications, account menu (Dashboard, Profile, Logout).
- **KYC** and **Account** pages.

### 6.1 Buyer dashboard

**Sidebar:** Overview · My Bids · Watchlist · Cart · Orders · KYC · Account

#### Overview — `/dashboard`

Counts: orders, active bids, watchlist. Shortcuts to orders, bids, and browse lots.

#### My Bids — `/dashboard/bids`

Every bid this buyer placed, with lot status and amount. If they **won**, a **Checkout** button opens payment.

#### Watchlist — `/dashboard/watchlist`

Lots they saved with the Watch button. Can remove or open the lot.

#### Cart — `/cart`

Same cart as the public header icon.

#### Orders — `/dashboard/orders`

Table of purchases:

| Status you see | Meaning | What the buyer does |
|---|---|---|
| Awaiting Payment | Order created, not paid | **Pay Now** |
| Paid — In Escrow | Card/SSLCommerz succeeded; platform holds funds | Wait for shipping |
| Shipped | Seller marked shipped | **Confirm Receipt** |
| Receipt Confirmed | Buyer confirmed delivery | Optional **Review** seller |
| Payout Requested | Seller asked for their 95% | Wait |
| Completed | Admin recorded payout | Done |
| Disputed / Refunded / Cancelled | Exception paths | Contact support |

After confirm receipt, a review popup can appear (1–5 stars + comment).

#### KYC — `/dashboard/kyc`

Required before bidding. Upload ID / business documents. Status: Unverified → Pending → Verified or Rejected (admin decides). Seed buyer is already Verified.

#### Account — `/dashboard/settings`

- Profile photo (Cloudinary).
- Name, organization, phone, bio, address.
- Public profile link.
- **Optional MFA:** generate a secret, add it to Google Authenticator (or similar), enter a 6-digit code to turn MFA on. Next login will ask for that code.

### 6.2 Seller dashboard

**Sidebar:** Overview · Listings · New listing · Sales · Bank · Payouts · KYC · Account

Sellers **cannot** use cart or bid. They list, ship, and claim payouts.

#### Overview — `/dashboard`

Shortcuts to Listings, Sales & shipping, Payouts.

#### Listings — `/dashboard/listings`

All of this seller’s auctions (draft, live, ended).

- **View** on the public site.
- **Edit** if the lot is still a draft, or live but **has not started yet**.
- **Close & award high bidder** if the lot is live, has already started, and has at least one bid — ends now and treats the highest bid as the winner (even if reserve was not met).
- **+ New Listing**.

#### New listing — `/dashboard/listings/new`

Fields:

- Title, category, condition, description.
- Up to **4 images**.
- Starting bid (USD), minimum increment.
- Optional **reserve** (hidden target; if not met at close, there is no winner unless the seller closes early as above).
- Optional **Buy Now**.
- Start and end date/time.
- **Anti-snipe** checkbox (last 5 minutes + bid → +5 minutes).

Buttons: **Save draft** or **Publish**.

**Publish rules (all must be true):**

1. KYC status is **Verified**.
2. A **bank account** is saved.
3. An **admin has verified** that bank account.

If bank is missing, publishing is blocked. The demo seller already has a verified bank.

#### Edit listing — `/dashboard/listings/[id]/edit`

Same fields, only when editing is still allowed.

#### Sales — `/dashboard/sales`

Orders for this seller’s sold lots. Shows sale price and **you receive** (95%).

| Status | Seller action |
|---|---|
| Paid — In Escrow | **Confirm payment** (optional, for reviews) and/or **Mark shipped** |
| Receipt Confirmed | **Claim payout** |
| Payout Requested | Wait for admin |
| Payout completed | Recorded as paid out |
| After payment confirmed | Can **Review** the buyer |

#### Bank — `/dashboard/bank`

Account holder name, account number, bank name, routing/branch.

- Required before publish.
- Admin must click Verify (Part 7).
- Editing details **resets verification** — admin must verify again.
- Payouts are **not** an automatic bank wire. Ops send money manually, then mark paid in admin.

#### Payouts — `/dashboard/payouts`

List of this seller’s payout requests: amount, date, status (`REQUESTED`, `APPROVED`, `PAID`, `REJECTED`).

#### KYC and Account

Same idea as the buyer pages. Sellers also need KYC verified before publishing.

---

## Part 7 — Admin dashboard (staff / owner)

Open `/admin` after logging in as Admin or Super Admin. Non-admins are sent home.

**Admin sidebar:** Overview · Users · Bank verify · Payouts  
**Super Admin extra:** Admins · Commission

### 7.1 Overview — `/admin`

Numbers:

- Commission from paid/escrow orders.
- Active users.
- Open flags.
- Live lots.

**Moderation queue:** reports from users who flagged a listing.

- **Dismiss** — close the report, keep the listing.
- **Pull listing** — take the auction down (flagged / pulled).

### 7.2 Users — `/admin/users`

Search by name or email. For each user:

- Role, active / suspended.
- Change **KYC**: Unverified, Pending, Verified, Rejected.
- **View documents** uploaded for KYC.
- **Suspend** or **Reinstate** (suspended users cannot use the platform normally).

This is how a real buyer or seller becomes allowed to bid or publish after they submit KYC.

### 7.3 Bank verify — `/admin/banks`

Every seller bank on file. **Verify** unlocks publishing for that seller.

### 7.4 Payouts — `/admin/payouts`

1. Seller claims after buyer confirms receipt.
2. Admin **Approve** or **Reject** (reject asks for a reason).
3. After Approve, ops send the bank transfer **outside** the software.
4. Admin clicks **Record bank transfer as paid**.

The software **does not** push money to the seller’s bank by itself.

### 7.5 Admins — `/admin/admins` (Super Admin only)

- List staff admin accounts.
- **Create admin** (name, email, temporary password).
- **Deactivate** an admin.

Admins cannot create other admins.

### 7.6 Commission — `/admin/commission-report` (Super Admin only)

- GMV (sale totals), platform commission total, order count.
- Line list of paid / in-escrow orders with fee per order.

---

## Part 8 — Complete screen map

### Public website (frontend)

| Screen | URL | Who |
|---|---|---|
| Home | `/` | Everyone |
| Auctions | `/auctions` | Everyone |
| Lot details | `/auctions/...` | Everyone (actions need login) |
| About | `/about` | Everyone |
| Contact | `/contact` | Everyone |
| Register | `/register` | Guests |
| Verify email | `/verify-email` | New users |
| Login | `/login` | Guests |
| MFA step | `/login/mfa` | Users with MFA on |
| Forgot password | `/forgot-password` | Guests |
| Public profile | `/users/[id]` | Everyone |
| Cart | `/cart` | Buyer, logged in |
| Checkout | `/checkout/[orderId]` | Buyer |
| Checkout success | `/checkout/[orderId]/success` | Buyer |
| Notifications | `/notifications` | Logged in |

### Buyer dashboard

| Screen | URL |
|---|---|
| Overview | `/dashboard` |
| My Bids | `/dashboard/bids` |
| Watchlist | `/dashboard/watchlist` |
| Orders | `/dashboard/orders` |
| KYC | `/dashboard/kyc` |
| Account | `/dashboard/settings` |

### Seller dashboard

| Screen | URL |
|---|---|
| Overview | `/dashboard` |
| Listings | `/dashboard/listings` |
| New listing | `/dashboard/listings/new` |
| Edit listing | `/dashboard/listings/[id]/edit` |
| Sales | `/dashboard/sales` |
| Bank | `/dashboard/bank` |
| Payouts | `/dashboard/payouts` |
| KYC | `/dashboard/kyc` |
| Account | `/dashboard/settings` |

### Admin dashboard

| Screen | URL | Who |
|---|---|---|
| Overview + flags | `/admin` | Admin & Super Admin |
| Users & KYC | `/admin/users` | Admin & Super Admin |
| Bank verify | `/admin/banks` | Admin & Super Admin |
| Payouts | `/admin/payouts` | Admin & Super Admin |
| Manage admins | `/admin/admins` | Super Admin only |
| Commission | `/admin/commission-report` | Super Admin only |

---

## Part 9 — How the business actually works

### 9.1 Auction lifecycle

```
Draft  →  Live  →  Ended
              ↘ Flagged / Cancelled (moderation)
```

- **Draft:** saved, not on the public live list until published.
- **Live:** bidding and Buy Now (if set).
- **Ended:** clock ran out, seller closed early, or Buy Now.
- **Winner:** highest bid **if reserve is met** (or if seller closed early and awarded the high bidder). If reserve is not met at natural end, there is **no sale**.
- Winner’s lot is placed in their **cart**; they get a notification to pay.

### 9.2 Money lifecycle (escrow)

```
Checkout created
    → AWAITING_PAYMENT
    → buyer pays (Stripe or SSLCommerz)
    → PAID_ESCROW          (platform holds funds)
    → seller marks SHIPPED
    → buyer confirms RECEIVED
    → seller CLAIMS payout (95%)
    → admin APPROVES
    → admin records PAID   (after real bank transfer)
```

Commission **5%** is calculated at checkout and never paid to the seller.

### 9.3 What buyers can do (summary)

Browse, register, verify email, optional MFA, submit KYC, watch lots, bid (live + proxy), Buy Now, get outbid notices, win → cart → pay, confirm receipt, review seller, see orders and profile.

### 9.4 What sellers can do (summary)

Register, verify email, KYC, add bank, wait for admin bank verify, create draft/publish listings, upload images, optional reserve / Buy Now / anti-snipe, edit before start, close early and award, mark shipped, confirm payment, review buyer, claim payout, see payout status.

### 9.5 Notifications (examples)

Auction won, auction ended (sold or no sale), outbid, payment related, shipped / received, payout approved, KYC updates, listing flagged.

### 9.6 Reviews

After a deal reaches the right stage, buyer rates seller and seller rates buyer. Ratings show on the public profile.

### 9.7 Real-time bidding

While the engine (`npm run dev:api`) is running, bid amounts, countdowns, extensions, and “auction ended” update instantly for people on that lot page and on the market ticker.

### 9.8 Theme

Light and dark mode from the sun/moon control. Preference is kept on that browser.

---

## Part 10 — Fill in services (when you are ready for real tests)

All of these live in `.env` (and matching `NEXT_PUBLIC_*` lines in `apps/web/.env.local`). Restart both terminals after changing `.env`.

### 10.1 Email (Gmail example)

Used for: signup verification codes, resend, forgot-password codes.

1. Use a Gmail account with **2-Step Verification**.
2. Create an [App Password](https://myaccount.google.com/apppasswords).
3. Set:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=you@gmail.com
SMTP_PASS=the_app_password
SMTP_FROM=e-AMS <you@gmail.com>
```

Without this, new public signups cannot finish email verify.

### 10.2 Cloudinary (images)

Used for: listing photos, KYC files, avatars.

1. Sign up at [cloudinary.com](https://cloudinary.com).
2. Copy Cloud name, API Key, API Secret.
3. Set `CLOUDINARY_*` and `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`.

### 10.3 Stripe (card / USD)

1. [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) → test keys `sk_test_...` and `pk_test_...`.
2. Put them in `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
3. For local webhook testing, install [Stripe CLI](https://stripe.com/docs/stripe-cli) and run:

```powershell
stripe listen --forward-to localhost:4000/api/payments/webhook/stripe
```

Paste the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.

Until webhooks work, a card payment may succeed at Stripe but the order might stay “Awaiting Payment.”

### 10.4 SSLCommerz (BDT / local)

Sandbox defaults in `.env.example`:

```
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASSWORD=qwerty
SSLCOMMERZ_IS_LIVE=false
USD_TO_BDT_RATE=130
```

SSLCommerz must be able to call your API. On a laptop, that often means a public tunnel (for example ngrok) and setting `API_URL` to that public address. On a real server with a domain, point `API_URL` at that domain.

### 10.5 Going live on a real domain (overview)

A developer or host will:

1. Put the project on a server (or two services: website + API).
2. Point `WEB_URL`, `API_URL`, and `NEXT_PUBLIC_API_URL` to **https** URLs.
3. Run `npm run db:migrate` against the production database (do not re-seed if you already have real users, unless you intend to).
4. Build the website (`npm run build` inside `apps/web`) and run production start commands instead of `dev`.
5. Keep `.env` only on the server, never in public chat.

Exact hosting (Vercel, a VPS, etc.) is a separate deploy choice. This file covers **running and using** the product.

---

## Part 11 — Common problems

| What you see | Likely cause | What to do |
|---|---|---|
| Site will not load at all | `npm run dev:web` is not running | Start window 2 |
| Home / auctions empty or errors | Engine is off | Start `npm run dev:api` |
| `DATABASE_URL` / Prisma errors | Wrong or missing database string | Fix `.env`, run migrate again |
| Cannot log in with demo users | Seed was not run | `npm run db:seed` |
| New signup never gets a code | SMTP not set | Part 10.1 |
| Cannot bid | Not a buyer, or KYC not Verified | Use buyer account; admin verifies KYC |
| Seller cannot publish | No bank, or bank not verified, or KYC not verified | Complete Bank + ask admin to Verify |
| Images fail | Cloudinary keys missing | Part 10.2 |
| Paid in Stripe but order still unpaid | Webhook not forwarded | Stripe CLI listen command |
| Admin pages bounce to Home | Logged in as buyer/seller | Use `admin@` or `superadmin@` |
| Port already in use | Another copy is running | Ctrl+C the old windows, or reboot |
| `node` not recognized | Node.js not installed / terminal not restarted | Part 2.1 |

---

## Part 12 — Honest notes (read once)

These are true for the product as delivered. They prevent surprise later.

1. **Payout “Pay” is a record, not an automatic wire.** Someone must transfer 95% to the seller’s bank, then click Record as paid.
2. **Refunds / disputes** exist as order statuses in the system; there is no full buyer “open a dispute” courtroom UI yet. Use Contact / ops process.
3. **Homepage stats** (for example transacted $48.2M) are **display figures** on the marketing home page, not live accounting. Live money figures are on the admin overview and Super Admin commission report.
4. **SSLCommerz amounts** are handled in BDT as configured; read the checkout screen notes when testing.
5. **Demo password** is only for local/demo. Change it before any public launch.
6. Keep `.env` private. Never copy secrets into WhatsApp, email, or Git.

---

## Quick start checklist (print this)

1. Install **Node.js 20+** and confirm `node -v` and `npm -v`.
2. Copy the project folder (Git or ZIP).
3. Open PowerShell **in the e-ams folder**.
4. Run `npm install`.
5. Copy `.env.example` → `.env` and into `apps\web\.env.local`.
6. Paste `DATABASE_URL` (Neon) and two JWT secrets.
7. Run `npm run db:generate` then `npm run db:migrate` then `npm run db:seed`.
8. Window 1: `npm run dev:api` (wait for port 4000).
9. Window 2: `npm run dev:web` (wait for port 3000).
10. Browser: `http://localhost:3000`.
11. Try `buyer@eams.com` / `Password123!` for the public site + buyer dashboard.
12. Try `seller@eams.com` for listings and sales.
13. Try `admin@eams.com` and `superadmin@eams.com` for the admin dashboard.

That is the full product: **public website (frontend)** plus **dashboard (backend for your users and staff)**, both powered by the engine on port 4000.
