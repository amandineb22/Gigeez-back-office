# Atelier — Internal Business Dashboard

A private management dashboard for a small clothing brand: manual data entry
for sales, expenses, and inventory, with automatic KPIs, P&L, cash flow, and
growth tracking on top. Not a customer-facing storefront — built for the
owner and a couple of staff members only.

**Stack:** Next.js (App Router, TypeScript) · Supabase (Postgres + Auth) ·
Tailwind CSS · Recharts.

---

## 1. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project (the
   free tier is enough to start).
2. In **Project Settings → API**, copy:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → this is `SUPABASE_SERVICE_ROLE_KEY`
     (only used by the local seed script — never expose this in the app).

## 2. Run the schema

1. Open **SQL Editor** in your Supabase project.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql)
   and run it. This creates every table, the `v_sales` / `v_inventory`
   reporting views, the `adjust_variant_stock` helper function, and Row Level
   Security policies (any authenticated user gets full read/write; everyone
   else is denied).
3. In **Authentication → Providers**, make sure Email is enabled.
4. In **Authentication → Users**, manually invite/create the owner + staff
   accounts (email + password) that should have access. There's no public
   sign-up flow — this is an internal tool.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in the three values from step 1. `.env.local` is git-ignored.

## 4. Install dependencies and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` and sign in with one of the accounts you
created in Supabase Auth.

## 5. Seed sample data (optional, recommended for a first look)

The seed script uses the `service_role` key to insert realistic sample
products, variants, sales, expenses, purchase orders, suppliers, and goals so
the dashboard isn't empty on first run.

```bash
npm run seed
```

Safe to run once against a fresh project. Re-running will insert duplicate
sample rows (it doesn't check for existing data), so only run it once, or
clear the tables first if you want to reseed.

## 5b. Import the real Gigeez stock data

`data/imports/2026-09-13-stock-import.json` is a cleaned-up snapshot of the
"Gigeez Master data stock" spreadsheet (13 Sep 2026): every model becomes a
product, every unique length/size/style/color/material combination becomes a
variant/SKU, every physical piece still on hand becomes a stock unit (with
its bin/location — own warehouse or a consignment boutique), and every piece
already marked "sold" becomes a historical sale (shown with an "Unknown"
date/channel badge in the Sales page, since the sheet didn't record those).

```bash
npm run import-stock
```

Run this instead of (or in addition to) `npm run seed` — it's independent of
the sample data. It refuses to run twice against the same project (to avoid
duplicating hundreds of physical pieces); pass `--force` if you really want
to re-import.

A handful of variants (see the script's console output, or search the JSON
for `"price_estimated": true`) didn't have an exact price-tab match for
their length, so their price was estimated from that model's other lengths —
worth double-checking those SKUs in the Products page after import.

## 5d. Import the profit and loss spreadsheet

`data/imports/2026-financials.json` is a cleaned-up snapshot of the Gigeez
profit-and-loss workbook. It carries two things:

- **Monthly actuals** from the `P&L` sheet (Apr 2025 onward): units sold,
  revenue, and the sheet's own four cost bands — production, commercial,
  marketing and admin. These land in `financial_months`.
- **Yearly business-plan targets** from the `BP (Target)` sheet. Those are
  stated in euros in the workbook and converted to QAR on the way in, at the
  4.1245 rate the workbook itself uses. These land in `bp_targets`.
- **Earlier fiscal years** from the `HIST` tab (FY23–FY25), which predate the
  monthly sheet. These land in `historic_years` and carry no unit counts,
  because the tab never recorded any.

```bash
npm run import-financials
```

If the project already exists and you only need the two new tables, paste
[`supabase/add-financials-tables.sql`](supabase/add-financials-tables.sql)
into the SQL Editor instead of re-running the whole schema — it's the same
statements on their own, and safe to run more than once.

Both tables are keyed on their period, and the script upserts, so re-running
it after the workbook is updated refreshes the figures in place rather than
duplicating them. Regenerate the JSON snapshot from a newer workbook and run
it again.

This import deliberately does **not** touch `sales`, `expenses` or
`stock_units`. The spreadsheet and the piece-level tables describe the same
business but record it differently — the sheet is a monthly accounting view,
the tables are individual pieces and individual expense lines — so the
dashboard shows them as separate sections and never adds them together.

## 5c. Removing the sample data

If you ran `npm run seed` earlier and now want the placeholder products,
suppliers, and their fake sales/purchase orders gone (e.g. after importing
the real Gigeez data), run
[`supabase/cleanup-demo-data.sql`](supabase/cleanup-demo-data.sql) in the
Supabase SQL Editor, the same way you ran `schema.sql`. It only deletes rows
matching the seed script's exact sample product/supplier names, so your real
data is never touched, and it's safe to run more than once.

## 6. Deploy to Vercel

1. Push this repo to GitHub/GitLab/Bitbucket.
2. Import it into [Vercel](https://vercel.com/new).
3. Add the same three environment variables from `.env.local` in the
   Vercel project's **Settings → Environment Variables**.
4. Deploy. No build configuration changes needed — it's a standard Next.js
   App Router project.

## 7. Upgrading Supabase to Pro later

Nothing in this codebase is tied to the free tier — no hardcoded row limits,
storage assumptions, or free-tier-only features are used. When the business
outgrows the free tier's limits (database size, monthly active users,
pausing after inactivity, etc.), upgrade from **Project Settings → Billing**
in the Supabase dashboard. No code changes are required; the same
`NEXT_PUBLIC_SUPABASE_URL` / anon key continue to work.

---

## Rebranding

Everything brand-specific lives in one file: [`theme/config.ts`](theme/config.ts).

- **Colors**: edit the `colors.brand` / `colors.accent` scales (keep the
  50→900 steps; components reference specific steps like `brand-600`).
- **Fonts**: the font *names* are metadata in `theme/config.ts`; the actual
  font loading happens in [`app/layout.tsx`](app/layout.tsx) via
  `next/font/google`. Swap both together.
- **Logo**: drop a file into `/public` and update `theme.logo.mark` /
  `theme.logo.text`.

## Project structure

```
app/
  login/                  Sign-in page (Supabase Auth)
  (dashboard)/            Everything behind auth, shares the sidebar/topbar
    page.tsx              KPI dashboard home
    sales/ expenses/      Data entry: list + /new + /[id]/edit, each backed
    products/ suppliers/  by a server action in lib/actions/
    purchase-orders/
    inventory/            Stock levels, low-stock + dead-stock flags
    goals/                Targets + progress bars
    reports/              P&L, cash flow, runway, profit per product
    journal/              Monthly notes
  api/export/             CSV export route handlers (sales, expenses, P&L)
lib/
  calculations.ts         Every derived number (margins, KPIs, break-even,
                           runway, sell-through...) — the one file to audit
  supabase/               Browser/server/middleware Supabase clients + types
  data/                   Server-only data-fetching helpers per resource
  actions/                Server actions (mutations) per resource
  types.ts, utils.ts, csv.ts
components/
  ui/                     Generic building blocks (Button, Card, Table...)
  charts/                 Recharts wrappers, themed from theme/config.ts
  dashboard/              KPI cards, goal progress bars, product lists
  layout/                 Sidebar, top bar, global date-range filter
theme/config.ts           Brand colors, font names, logo — see Rebranding
supabase/schema.sql       Full schema, views, RLS policies
supabase/cleanup-demo-data.sql  Deletes the sample data from npm run seed
scripts/seed.ts           Sample data generator
scripts/import-stock.ts   One-time importer for the real Gigeez stock data
scripts/import-financials.ts  Upserting importer for the P&L spreadsheet
data/imports/             Cleaned JSON snapshots consumed by the importers
```

## Notes on the data model

- Money amounts are **stored** in QAR as `numeric(10,2)`. QAR is the base
  currency: product costs, sale prices, expenses and the imported financials
  all come from sheets denominated in riyal.
- The top bar has a **display-currency picker** (QAR / EUR / USD). It writes
  `?currency=` on the URL, next to the date range, and every page converts on
  render — server components via `parseCurrencyParam()`, client components via
  the `useCurrency()` hook. It is presentation only: switching currency never
  converts or rewrites a stored figure, and the CSV exports stay in QAR.
  The add-expense form also lets an amount be typed in EUR or USD — handy for
  an invoice that arrives that way — and converts it to QAR server-side before
  storing, so nothing but QAR ever reaches the database.
  Rates live in one place, `QAR_PER_UNIT` in `lib/currency.ts` — fixed rates
  rather than a live feed (the riyal is pegged to the dollar at 3.64, and
  4.1245 is the euro rate the Gigeez P&L workbook uses), so converted figures
  tie back to the spreadsheet exactly. Edit them there when the planning rate
  changes.
- **Fiscal years end 31 March**, so April 2025 to March 2026 is FY2026. That's
  the basis the `HIST` tab uses and the basis the business plan is built on —
  the plan's first year matches that year's actual revenue almost exactly,
  which is what ties the two together. Anything comparing actuals against plan
  goes through `buildYearComparisons()` in `lib/calculations.ts` and is
  labelled on screen with its months, so the basis is never left to be guessed.
  The dashboard's monthly financials section stays on calendar years, since it
  is labelled month by month and carries no plan comparison.
- `financial_months` / `bp_targets` / `historic_years` hold the spreadsheet figures and are kept
  separate from `sales` / `expenses` on purpose — see section 5d. The cost
  columns are cash paid in the month, not the cost of the pieces sold in it,
  which is why the dashboard calls that line "cash net" rather than profit.
- Revenue, COGS, and profit are **not** stored on the `sales` table directly —
  they're computed by the `v_sales` Postgres view (joining sales → variants →
  products) so they can never drift out of sync with the underlying data.
  Refund rows contribute negative revenue/profit automatically.
- Stock changes (a sale, a refund, receiving a purchase order) always go
  through the `adjust_variant_stock()` Postgres function — a single atomic
  `UPDATE` — rather than a read-then-write in the app, so two staff members
  editing stock at the same time can't race each other.
- "Inventory value over time" has no stored historical snapshots; it's
  reconstructed from the current value plus the sales/purchase-order events
  in the selected range (see the comment in `lib/calculations.ts`).
