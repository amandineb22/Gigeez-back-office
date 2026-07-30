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
scripts/seed.ts           Sample data generator
```

## Notes on the data model

- Money amounts are stored as `numeric(10,2)` and always rendered as USD
  (`$1,234.56`) via `formatCurrency()` in `lib/utils.ts`.
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
