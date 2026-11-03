-- ============================================================================
-- Atelier Dashboard — Supabase schema
-- Paste this whole file into the Supabase SQL editor (Project -> SQL Editor)
-- and run it once against a fresh project. Safe to re-run: uses IF NOT EXISTS
-- / DROP ... IF EXISTS guards where it matters.
--
-- Access model: every authenticated user has equal read/write access to all
-- business data (owner + staff, no role hierarchy). RLS is enabled on every
-- table purely to enforce "must be logged in" — anonymous/public access is
-- always denied.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. products
-- ----------------------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  base_cost numeric(10, 2) not null default 0 check (base_cost >= 0), -- COGS per unit
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. variants (SKUs) — size/color combination of a product
--
-- length/style/material: raw stock-sheet codes (e.g. length X/D/N/U, style
-- SF/AY/EC/BF/GC/UU, material VI/CH/CS/SI). Displayed as-is in the UI — no
-- confirmed legend exists for them, unlike color.
--
-- base_cost/retail_price/wholesale_price here override the product-level
-- defaults for this specific variant (useful because COGS/price commonly
-- vary by length for the same model). Null means "use the product's
-- base_cost" — see coalesce() in the views below.
-- ----------------------------------------------------------------------------
create table if not exists variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  sku text not null unique,
  size text not null,
  color text not null,
  length text,
  style text,
  material text,
  base_cost numeric(10, 2) check (base_cost is null or base_cost >= 0),
  retail_price numeric(10, 2) check (retail_price is null or retail_price >= 0),
  wholesale_price numeric(10, 2) check (wholesale_price is null or wholesale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reorder_point integer not null default 0 check (reorder_point >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color, length, style, material)
);

create index if not exists variants_product_id_idx on variants (product_id);

-- Backfill for databases created before these columns existed.
alter table variants add column if not exists length text;
alter table variants add column if not exists style text;
alter table variants add column if not exists material text;
alter table variants add column if not exists base_cost numeric(10, 2);
alter table variants add column if not exists retail_price numeric(10, 2);
alter table variants add column if not exists wholesale_price numeric(10, 2);

-- Widen the old (product_id, size, color) uniqueness to include the new
-- attribute columns, so the same size/color can exist in different
-- lengths/styles/materials (which the stock sheet needs).
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'variants_product_id_size_color_key'
  ) then
    alter table variants drop constraint variants_product_id_size_color_key;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'variants_product_id_size_color_length_style_material_key'
  ) then
    alter table variants
      add constraint variants_product_id_size_color_length_style_material_key
      unique (product_id, size, color, length, style, material);
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- 2b. stock_units — one row per physical piece of a variant, so identical
-- SKUs that live in different places (own warehouse vs. a consignment
-- boutique) can be told apart. bin_location is the raw stock-sheet bin name
-- (e.g. 'WHSE', 'PORTO V', 'PARIS'). A unit moves to status 'sold' (and gets
-- linked from a sales row via stock_unit_id) once it sells; it is never
-- deleted, so sold pieces stay traceable to where they came from.
-- ----------------------------------------------------------------------------
create table if not exists stock_units (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references variants (id) on delete cascade,
  bin_location text not null default 'WHSE',
  status text not null default 'in_stock' check (status in ('in_stock', 'sold')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stock_units_variant_id_idx on stock_units (variant_id);
create index if not exists stock_units_status_idx on stock_units (status);

-- The master stock sheet's 'PARIS' bin was a stray label for pieces actually
-- held at Gigeez's own warehouse, not a real reseller. No-op once applied.
update stock_units set bin_location = 'WHSE' where bin_location = 'PARIS';

-- ----------------------------------------------------------------------------
-- 3. suppliers
-- ----------------------------------------------------------------------------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  lead_time_days integer check (lead_time_days >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 3b. resellers — boutiques/hotels/stores that sell Gigeez dresses on
-- Gigeez's behalf (consignment) or buy them outright (wholesale).
--
-- gigeez_share_pct is the percentage of the retail/invoice price Gigeez
-- actually keeps after the reseller's cut — derived from each reseller's
-- real invoices, not the generic estimate in the stock sheet. For wholesale
-- resellers it's 100: the invoiced price *is* what Gigeez charges, there's
-- no further split. bin_locations lists the stock-sheet bin name(s) this
-- reseller corresponds to (a consignment piece sitting at their shop), for
-- reference only — nothing reads it automatically yet.
-- ----------------------------------------------------------------------------
create table if not exists resellers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('consignment', 'wholesale')),
  currency text not null check (currency in ('QAR', 'EUR', 'USD')),
  gigeez_share_pct numeric(5, 2) not null check (gigeez_share_pct > 0 and gigeez_share_pct <= 100),
  bin_locations text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seeded from the actual reseller invoices (not the stock sheet's generic
-- estimate). Safe to re-run: updates the same row by name rather than
-- duplicating it, so correcting a rate later just means editing these values
-- and re-running the file.
insert into resellers (name, type, currency, gigeez_share_pct, bin_locations, notes) values
  ('Zoe Boutique', 'consignment', 'EUR', 37.04, array['PIETRASANTA', 'PORTO V', 'PORTO C'],
    'Italian boutique chain (Pietrasanta, Porto Rotondo, Porto Cervo). Gigeez receives retail ÷ 2.7 per their invoices.'),
  ('Strings Attached', 'consignment', 'EUR', 37.04, array[]::text[],
    'Hotel Dei Cavalieri, Rome. Gigeez receives retail ÷ 2.7 per their invoices.'),
  ('Four Seasons Residences Doha', 'consignment', 'QAR', 33.33, array['4 SEASONS QA'],
    'Gigeez receives retail ÷ 3 per their invoices.'),
  ('Four Seasons West Bay', 'consignment', 'QAR', 50.00, array['4 SEASONS WB'],
    'Gigeez receives retail ÷ 2 per their invoices.'),
  ('Bulgari Resort Dubai', 'consignment', 'QAR', 33.33, array['BULGARY H'],
    'Jumeira Bay Hotel LLC. Gigeez receives retail ÷ 3 per their invoices.'),
  ('Cabanon Bleu', 'consignment', 'EUR', 33.33, array[]::text[],
    'Saint Cyprien, Corsica. Gigeez receives roughly retail ÷ 3 per their invoices.'),
  ('Salam Studio & Stores', 'consignment', 'QAR', 60.00, array['ALYA', 'MOAJ'],
    'Doha department store (ALYA and MOAJ concept locations at The Gate Mall). Payout is negotiated per item and varies — 60% reflects their most recent invoice; enter the real amount per sale when it differs.'),
  ('Pronto', 'consignment', 'QAR', 70.00, array['PRONTO'],
    'Reseller website — takes 30% of retail, Gigeez keeps 70%.'),
  ('The Luxury Edition (Cheval Blanc Randheli)', 'wholesale', 'USD', 100.00, array['TLE Cheval blanc'],
    'Wholesale buyer for their Cheval Blanc Randheli (Maldives) boutique. Buys outright at a fixed USD unit price.'),
  ('Erreuno', 'wholesale', 'QAR', 100.00, array['ERREUNO'],
    'Wholesale buyer. Currency and exact terms are a placeholder pending their invoice — update once received.')
on conflict (name) do update set
  type = excluded.type,
  currency = excluded.currency,
  gigeez_share_pct = excluded.gigeez_share_pct,
  bin_locations = excluded.bin_locations,
  notes = excluded.notes;

-- ----------------------------------------------------------------------------
-- 4. sales — one row per sale line
--
-- sale_date is nullable: imported historical sales that only had a "sold"
-- flag (no recorded date) are stored as null and shown as "Unknown" in the
-- UI rather than guessing a date. Same idea for channel = 'unknown'.
-- stock_unit_id optionally pins a sale to the exact physical piece sold
-- (from stock_units), so a sold dress keeps its full history (bin it came
-- from, attributes) even after it leaves inventory.
--
-- reseller_id is null for a direct sale (Gigeez keeps 100% of unit_price).
-- When set, unit_price is still what Gigeez actually receives per unit — the
-- reseller's cut is never stored or summed, only the net amount — so every
-- revenue/profit calculation downstream needs no special-casing for
-- consignment vs. direct sales. retail_unit_price is an optional reference
-- figure (what the end customer paid) for audit against the reseller's
-- invoice; it never feeds into revenue/profit. Both are stored in QAR like
-- every other money column — convert at entry time from the reseller's
-- native currency (see lib/currency.ts).
-- ----------------------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date,
  variant_id uuid not null references variants (id) on delete restrict,
  stock_unit_id uuid references stock_units (id) on delete set null,
  reseller_id uuid references resellers (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  retail_unit_price numeric(10, 2) check (retail_unit_price is null or retail_unit_price >= 0),
  channel text not null check (channel in ('online', 'in-store', 'wholesale', 'pop-up', 'unknown')),
  payment_method text not null default 'other',
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  is_refund boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill for databases created before these changes existed. Must run
-- before the index/constraint statements below, since on an existing table
-- "create table if not exists" is a no-op and those columns/constraints
-- wouldn't exist yet otherwise.
alter table sales alter column sale_date drop not null;
alter table sales add column if not exists stock_unit_id uuid references stock_units (id) on delete set null;
alter table sales add column if not exists reseller_id uuid references resellers (id) on delete set null;
alter table sales add column if not exists retail_unit_price numeric(10, 2);
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'sales_channel_check') then
    alter table sales drop constraint sales_channel_check;
  end if;
  alter table sales add constraint sales_channel_check
    check (channel in ('online', 'in-store', 'wholesale', 'pop-up', 'unknown'));
end $$;

create index if not exists sales_variant_id_idx on sales (variant_id);
create index if not exists sales_stock_unit_id_idx on sales (stock_unit_id);
create index if not exists sales_reseller_id_idx on sales (reseller_id);
create index if not exists sales_sale_date_idx on sales (sale_date);
create index if not exists sales_channel_idx on sales (channel);

-- ----------------------------------------------------------------------------
-- 4b. expense_categories — the governed, extensible category list, matching
-- the profit and loss sheet's own line items and grouped under its 4 bands
-- (Production/Commercial/Marketing/Admin). expenses.category stores the name
-- as plain text rather than a foreign key, so an old database can still read
-- any expense row even before this table exists; the "Add expense" form
-- reads from this table and can add to it, but never writes free text.
-- ----------------------------------------------------------------------------
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  band text not null check (band in ('production', 'commercial', 'marketing', 'events', 'admin')),
  created_at timestamptz not null default now()
);

-- Dropped and recreated unconditionally: "create table if not exists" above
-- is a no-op on a database that already has this table, so the allowed band
-- list (e.g. adding 'events') would otherwise never widen on an existing one.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'expense_categories_band_check') then
    alter table expense_categories drop constraint expense_categories_band_check;
  end if;
  alter table expense_categories add constraint expense_categories_band_check
    check (band in ('production', 'commercial', 'marketing', 'events', 'admin'));
end $$;

insert into expense_categories (name, band) values
  ('Textile Saree Purchase', 'production'),
  ('Textile Silk For Slip Dress Purchase', 'production'),
  ('Jewelry Purchase', 'production'),
  ('Material Shipping Cost (DHL)', 'production'),
  ('Tailor Cost', 'production'),
  ('Tailor / Samples Making Cost', 'production'),
  ('Tags Purchase', 'production'),
  ('Label Purchase', 'production'),
  ('Travel – India', 'production'),
  ('Material – Charm', 'production'),
  ('Material – Pearls', 'production'),
  ('Consumables – Al Rawnaq', 'production'),
  ('Technical Support (Zentinel/Fievr/Vibes)', 'production'),
  ('Printing – AST Print', 'production'),
  ('Advance Payment From Customer', 'production'),
  ('Retailer – Discount', 'commercial'),
  ('Retailer – Commission Sales', 'commercial'),
  ('Shipping Cost', 'commercial'),
  ('Gift Dresses Cost', 'commercial'),
  ('Traveling – Plane Cost', 'commercial'),
  ('Traveling – Uber Cost', 'commercial'),
  ('Social Media – Intern', 'marketing'),
  ('Social Media – Instagram Pub', 'marketing'),
  ('Website Maintenance', 'marketing'),
  ('Website Hosting (Shopify)', 'marketing'),
  ('Events / Shows – Exhibition', 'events'),
  ('Communication – Photo Shoot', 'marketing'),
  ('Communication – Look Book', 'marketing'),
  ('Marketing – Promotional Bags', 'marketing'),
  ('Bank Expenses', 'admin'),
  ('Government Fees', 'admin'),
  ('Charity Foundation', 'admin'),
  ('Mega – Image Stock', 'admin'),
  ('Salary', 'admin'),
  ('Accounting For Taxes', 'admin')
on conflict (name) do update set band = excluded.band;

-- ----------------------------------------------------------------------------
-- 5. expenses — one row per expense line
--
-- category is free text rather than a fixed check constraint, so the list in
-- expense_categories above can grow without a schema change; cost_band
-- mirrors the category's band at the time it was chosen, so the dashboard's
-- expense breakdown can group by band without a join.
-- ----------------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null,
  cost_band text check (cost_band is null or cost_band in ('production', 'commercial', 'marketing', 'events', 'admin')),
  -- No "amount >= 0" check: the profit and loss sheet nets credits against a
  -- month's costs (a customer advance, a supplier refund), and those lines have
  -- to import as negative amounts for a month's expenses to add up to the same
  -- total the sheet shows. The add-expense form still refuses a negative, so
  -- only the importer can create one.
  amount numeric(10, 2) not null,
  cost_type text not null check (cost_type in ('fixed', 'variable')),
  vendor text,
  notes text,
  -- Set only on rows imported from the profit and loss spreadsheet, e.g.
  -- "pnl:2026-01-01:tailor-cost". Unique so a re-import updates the same row
  -- rather than adding a second copy; null for anything entered by hand, and
  -- Postgres allows any number of nulls in a unique index.
  source_ref text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill for databases created before source_ref/cost_band existed.
alter table expenses add column if not exists source_ref text;
alter table expenses add column if not exists cost_band text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'expenses_source_ref_key') then
    alter table expenses add constraint expenses_source_ref_key unique (source_ref);
  end if;
end $$;

-- Dropped and recreated unconditionally (not "if not exists"): the allowed
-- band list has grown over time (e.g. adding 'events'), and a database that
-- already has this constraint from an earlier version needs it replaced, not
-- left as-is.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'expenses_cost_band_check') then
    alter table expenses drop constraint expenses_cost_band_check;
  end if;
  alter table expenses add constraint expenses_cost_band_check
    check (cost_band is null or cost_band in ('production', 'commercial', 'marketing', 'events', 'admin'));
end $$;

-- Drop the old fixed 11-value category check: expense_categories above is
-- now the source of truth, and it can grow without a migration.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'expenses_category_check') then
    alter table expenses drop constraint expenses_category_check;
  end if;
end $$;

-- Relabel expenses already imported from the P&L sheet to the exact category
-- above, matched by the slug already saved in their source_ref
-- (e.g. 'pnl:2025-09-01:textile-saree-purchase'). Hand-entered expenses have
-- no source_ref and are never touched. No-op on a fresh database.
update expenses e
set category = v.name, cost_band = v.band
from (values
  ('textile-saree-purchase', 'Textile Saree Purchase', 'production'),
  ('textile-silk-for-slip-dress-purchase', 'Textile Silk For Slip Dress Purchase', 'production'),
  ('jewelry-purchase', 'Jewelry Purchase', 'production'),
  ('material-shipping-cost-dhl', 'Material Shipping Cost (DHL)', 'production'),
  ('tailor-cost', 'Tailor Cost', 'production'),
  ('tailor-samples-making-cost', 'Tailor / Samples Making Cost', 'production'),
  ('material-charm', 'Material – Charm', 'production'),
  ('material-pearls', 'Material – Pearls', 'production'),
  ('consumables-al-rawnaq', 'Consumables – Al Rawnaq', 'production'),
  ('technical-support-zentinel-fievr-vibes', 'Technical Support (Zentinel/Fievr/Vibes)', 'production'),
  ('printing-ast-print', 'Printing – AST Print', 'production'),
  ('advance-payment-from-customer', 'Advance Payment From Customer', 'production'),
  ('retailer-comission-sales', 'Retailer – Commission Sales', 'commercial'),
  ('shipping-cost', 'Shipping Cost', 'commercial'),
  ('gift-dresses-cost', 'Gift Dresses Cost', 'commercial'),
  ('traveling-plane-cost', 'Traveling – Plane Cost', 'commercial'),
  ('traveling-ubercost', 'Traveling – Uber Cost', 'commercial'),
  ('social-media-intern', 'Social Media – Intern', 'marketing'),
  ('social-media-instagram-pub', 'Social Media – Instagram Pub', 'marketing'),
  ('website-maintenance', 'Website Maintenance', 'marketing'),
  ('website-hosting-shopify', 'Website Hosting (Shopify)', 'marketing'),
  ('events-shows-exhibition', 'Events / Shows – Exhibition', 'events'),
  ('communication-photo-shoot', 'Communication – Photo Shoot', 'marketing'),
  ('communication-look-book', 'Communication – Look Book', 'marketing'),
  ('marketing-promotional-bags', 'Marketing – Promotional Bags', 'marketing'),
  ('government-fees', 'Government Fees', 'admin'),
  ('charity-foundation', 'Charity Foundation', 'admin'),
  ('mega-image-stock', 'Mega – Image Stock', 'admin'),
  ('salary', 'Salary', 'admin'),
  ('accounting-for-taxes', 'Accounting For Taxes', 'admin')
) as v(slug, name, band)
where e.source_ref like '%:' || v.slug;

create index if not exists expenses_expense_date_idx on expenses (expense_date);
create index if not exists expenses_category_idx on expenses (category);

-- ----------------------------------------------------------------------------
-- 6. purchase_orders / incoming stock
-- ----------------------------------------------------------------------------
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers (id) on delete set null,
  variant_id uuid not null references variants (id) on delete restrict,
  quantity_ordered integer not null check (quantity_ordered > 0),
  unit_cost numeric(10, 2) not null check (unit_cost >= 0),
  expected_date date,
  received boolean not null default false,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchase_orders_variant_id_idx on purchase_orders (variant_id);
create index if not exists purchase_orders_supplier_id_idx on purchase_orders (supplier_id);

-- ----------------------------------------------------------------------------
-- 7. goals
-- ----------------------------------------------------------------------------
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  metric_type text not null check (metric_type in ('revenue', 'profit', 'orders', 'aov')),
  target_amount numeric(12, 2) not null check (target_amount >= 0),
  period_type text not null check (period_type in ('monthly', 'quarterly', 'yearly')),
  period_start date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_period_start_idx on goals (period_start);

-- ----------------------------------------------------------------------------
-- 8. monthly_notes — journal for context on the numbers
-- ----------------------------------------------------------------------------
create table if not exists monthly_notes (
  id uuid primary key default gen_random_uuid(),
  note_month date not null unique, -- always the 1st of the month
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 9. financial_months — monthly actuals from the Gigeez P&L spreadsheet
--
-- This is the accountant's view of the business and is deliberately kept
-- separate from `sales` and `expenses`, which track individual pieces and
-- individual expense lines. The two overlap in what they describe but not in
-- how they are recorded, so they are never summed together: the dashboard
-- shows the spreadsheet figures in their own section.
--
-- All amounts are in QAR, the app's base currency. The cost columns are the
-- spreadsheet's own cost bands, and hold cash paid in the month rather than
-- the cost of the goods sold that month.
-- ----------------------------------------------------------------------------
create table if not exists financial_months (
  id uuid primary key default gen_random_uuid(),
  month date not null unique, -- always the 1st of the month
  units integer not null default 0 check (units >= 0),
  revenue numeric(12, 2) not null default 0 check (revenue >= 0),
  cost_production numeric(12, 2) not null default 0,
  cost_commercial numeric(12, 2) not null default 0,
  cost_marketing numeric(12, 2) not null default 0,
  cost_admin numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_months_month_idx on financial_months (month);

-- ----------------------------------------------------------------------------
-- 10. bp_targets — yearly business-plan targets from the BP (Target) sheet
--
-- Stated in euros in the spreadsheet and stored here in QAR like everything
-- else, so the currency picker can render them alongside actuals.
-- ----------------------------------------------------------------------------
create table if not exists bp_targets (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique check (year between 2000 and 2100),
  units integer not null default 0 check (units >= 0),
  revenue numeric(12, 2) not null default 0 check (revenue >= 0),
  expenses numeric(12, 2) not null default 0 check (expenses >= 0),
  ebitda numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bp_targets_year_idx on bp_targets (year);

-- ----------------------------------------------------------------------------
-- 11. historic_years — the HIST tab: fiscal years ending 31 March
--
-- Predates the monthly P&L sheet, which only starts in April 2025, so these
-- are the only figures available for the earlier years. No unit counts: the
-- HIST tab never recorded them. Amounts in QAR.
-- ----------------------------------------------------------------------------
create table if not exists historic_years (
  id uuid primary key default gen_random_uuid(),
  fiscal_year integer not null unique check (fiscal_year between 2000 and 2100),
  revenue numeric(12, 2) not null default 0,
  cogs numeric(12, 2) not null default 0,
  gross_profit numeric(12, 2) not null default 0,
  ebitda numeric(12, 2) not null default 0,
  inventories numeric(12, 2) not null default 0,
  net_cash numeric(12, 2) not null default 0,
  net_equity numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists historic_years_fiscal_year_idx on historic_years (fiscal_year);

-- ----------------------------------------------------------------------------
-- Stock adjustment helper — called from the app whenever a sale, refund, or
-- received purchase order needs to move a variant's stock_quantity. Doing
-- this as a single atomic UPDATE avoids a read-then-write race between two
-- staff members editing stock at the same time. Never lets stock go negative.
-- ----------------------------------------------------------------------------
create or replace function adjust_variant_stock(p_variant_id uuid, p_delta integer)
returns void
language plpgsql
security invoker
as $$
begin
  update variants
  set stock_quantity = greatest(stock_quantity + p_delta, 0)
  where id = p_variant_id;
end;
$$;

grant execute on function adjust_variant_stock(uuid, integer) to authenticated;

-- ----------------------------------------------------------------------------
-- updated_at trigger — keep it generic and attach to every table
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'variants', 'stock_units', 'suppliers', 'resellers', 'sales', 'expenses',
      'purchase_orders', 'goals', 'monthly_notes', 'financial_months', 'bp_targets',
      'historic_years'
    ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Views — auto-calculated revenue/profit/inventory value, joined for reporting.
-- security_invoker makes the view respect the querying user's RLS instead of
-- the view owner's, which matters once RLS is enabled below (Postgres 15+,
-- which Supabase runs on).
-- ----------------------------------------------------------------------------
-- Dropped first (not just "or replace"): the column list below reorders/adds
-- columns relative to earlier versions of this view, which Postgres only
-- allows for a brand new view, not an in-place replace.
drop view if exists v_sales cascade;
drop view if exists v_inventory cascade;
drop view if exists v_stock_units cascade;

create or replace view v_sales
with (security_invoker = true) as
select
  s.id,
  s.sale_date,
  s.variant_id,
  s.stock_unit_id,
  s.reseller_id,
  r.name as reseller_name,
  r.type as reseller_type,
  v.sku,
  v.size,
  v.color,
  v.length,
  v.style,
  v.material,
  v.product_id,
  p.name as product_name,
  p.category,
  su.bin_location as sold_from,
  s.quantity,
  s.unit_price,
  s.retail_unit_price,
  s.channel,
  s.payment_method,
  s.discount,
  s.is_refund,
  s.notes,
  coalesce(v.base_cost, p.base_cost) as base_cost,
  -- Revenue: refunds count as negative revenue so aggregates net out
  -- naturally. unit_price is already what Gigeez actually receives per unit
  -- (the reseller's cut, if any, was already taken out before this was
  -- entered — see the comment on sales.reseller_id in the table above), so
  -- this needs no special-casing for consignment vs. direct sales.
  case when s.is_refund then -1 else 1 end
    * (s.unit_price * s.quantity - s.discount) as revenue,
  -- COGS for this line.
  case when s.is_refund then -1 else 1 end * (coalesce(v.base_cost, p.base_cost) * s.quantity) as cogs,
  -- Profit = revenue - COGS.
  case when s.is_refund then -1 else 1 end
    * ((s.unit_price * s.quantity - s.discount) - (coalesce(v.base_cost, p.base_cost) * s.quantity)) as profit,
  s.created_at
from sales s
join variants v on v.id = s.variant_id
join products p on p.id = v.product_id
left join stock_units su on su.id = s.stock_unit_id
left join resellers r on r.id = s.reseller_id;

create or replace view v_inventory
with (security_invoker = true) as
select
  v.id as variant_id,
  v.sku,
  v.size,
  v.color,
  v.length,
  v.style,
  v.material,
  v.retail_price,
  v.wholesale_price,
  v.stock_quantity,
  v.reorder_point,
  v.product_id,
  p.name as product_name,
  p.category,
  coalesce(v.base_cost, p.base_cost) as base_cost,
  (v.stock_quantity * coalesce(v.base_cost, p.base_cost)) as inventory_value,
  (v.stock_quantity <= v.reorder_point) as low_stock
from variants v
join products p on p.id = v.product_id;

-- One row per physical piece currently in stock, with its bin location —
-- the detailed "where is each dress" view for the Stock page.
create or replace view v_stock_units
with (security_invoker = true) as
select
  su.id as stock_unit_id,
  su.bin_location,
  su.status,
  su.notes,
  su.created_at,
  v.id as variant_id,
  v.sku,
  v.size,
  v.color,
  v.length,
  v.style,
  v.material,
  v.retail_price,
  v.wholesale_price,
  coalesce(v.base_cost, p.base_cost) as base_cost,
  v.product_id,
  p.name as product_name,
  p.category
from stock_units su
join variants v on v.id = su.variant_id
join products p on p.id = v.product_id;

-- ----------------------------------------------------------------------------
-- Row Level Security — enable on every base table; one policy per table that
-- allows any authenticated user full read/write. No anon access anywhere.
-- ----------------------------------------------------------------------------
alter table products enable row level security;
alter table variants enable row level security;
alter table stock_units enable row level security;
alter table suppliers enable row level security;
alter table resellers enable row level security;
alter table sales enable row level security;
alter table expenses enable row level security;
alter table expense_categories enable row level security;
alter table purchase_orders enable row level security;
alter table goals enable row level security;
alter table monthly_notes enable row level security;
alter table financial_months enable row level security;
alter table bp_targets enable row level security;
alter table historic_years enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'variants', 'stock_units', 'suppliers', 'resellers', 'sales', 'expenses',
      'expense_categories', 'purchase_orders', 'goals', 'monthly_notes', 'financial_months',
      'bp_targets', 'historic_years'
    ])
  loop
    execute format('drop policy if exists "authenticated full access" on %I;', t);
    execute format(
      'create policy "authenticated full access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
