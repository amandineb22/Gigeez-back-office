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
-- 4. sales — one row per sale line
--
-- sale_date is nullable: imported historical sales that only had a "sold"
-- flag (no recorded date) are stored as null and shown as "Unknown" in the
-- UI rather than guessing a date. Same idea for channel = 'unknown'.
-- stock_unit_id optionally pins a sale to the exact physical piece sold
-- (from stock_units), so a sold dress keeps its full history (bin it came
-- from, attributes) even after it leaves inventory.
-- ----------------------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  sale_date date,
  variant_id uuid not null references variants (id) on delete restrict,
  stock_unit_id uuid references stock_units (id) on delete set null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  channel text not null check (channel in ('online', 'in-store', 'wholesale', 'pop-up', 'unknown')),
  payment_method text not null default 'other',
  discount numeric(10, 2) not null default 0 check (discount >= 0),
  is_refund boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_variant_id_idx on sales (variant_id);
create index if not exists sales_stock_unit_id_idx on sales (stock_unit_id);
create index if not exists sales_sale_date_idx on sales (sale_date);
create index if not exists sales_channel_idx on sales (channel);

-- Backfill for databases created before these changes existed.
alter table sales alter column sale_date drop not null;
alter table sales add column if not exists stock_unit_id uuid references stock_units (id) on delete set null;
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'sales_channel_check') then
    alter table sales drop constraint sales_channel_check;
  end if;
  alter table sales add constraint sales_channel_check
    check (channel in ('online', 'in-store', 'wholesale', 'pop-up', 'unknown'));
end $$;

-- ----------------------------------------------------------------------------
-- 5. expenses — one row per expense line
-- ----------------------------------------------------------------------------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null,
  category text not null check (
    category in (
      'materials', 'manufacturing', 'shipping', 'packaging', 'marketing',
      'rent', 'utilities', 'salaries', 'software', 'other'
    )
  ),
  amount numeric(10, 2) not null check (amount >= 0),
  cost_type text not null check (cost_type in ('fixed', 'variable')),
  vendor text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
      'products', 'variants', 'stock_units', 'suppliers', 'sales', 'expenses',
      'purchase_orders', 'goals', 'monthly_notes'
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
  s.channel,
  s.payment_method,
  s.discount,
  s.is_refund,
  s.notes,
  coalesce(v.base_cost, p.base_cost) as base_cost,
  -- Revenue: refunds count as negative revenue so aggregates net out naturally.
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
left join stock_units su on su.id = s.stock_unit_id;

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
alter table sales enable row level security;
alter table expenses enable row level security;
alter table purchase_orders enable row level security;
alter table goals enable row level security;
alter table monthly_notes enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'products', 'variants', 'stock_units', 'suppliers', 'sales', 'expenses',
      'purchase_orders', 'goals', 'monthly_notes'
    ])
  loop
    execute format('drop policy if exists "authenticated full access" on %I;', t);
    execute format(
      'create policy "authenticated full access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
