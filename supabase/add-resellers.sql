-- ============================================================================
-- Adds reseller tracking: a directory of consignment/wholesale partners with
-- the percentage Gigeez actually keeps per sale, plus the sales columns and
-- Sales-page fields that use it.
--
-- Paste this whole file into the Supabase SQL Editor and hit Run. It is the
-- new part of schema.sql on its own, so you don't have to re-run the whole
-- schema. Safe to run more than once: every statement is "if not exists", a
-- drop-then-create, or an upsert, and it adds nothing to and removes nothing
-- from your existing products, variants, stock, sales, expenses or goals.
-- ============================================================================

-- The master stock sheet's 'PARIS' bin was a stray label for pieces actually
-- held at Gigeez's own warehouse, not a real reseller. No-op once applied.
update stock_units set bin_location = 'WHSE' where bin_location = 'PARIS';

-- ----------------------------------------------------------------------------
-- resellers — boutiques/hotels/stores that sell Gigeez dresses on Gigeez's
-- behalf (consignment) or buy them outright (wholesale).
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
-- sales — link a sale to the reseller it went through, and an optional
-- retail-price reference figure.
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
alter table sales add column if not exists reseller_id uuid references resellers (id) on delete set null;
alter table sales add column if not exists retail_unit_price numeric(10, 2);

create index if not exists sales_reseller_id_idx on sales (reseller_id);

-- ----------------------------------------------------------------------------
-- Keep updated_at current, the same way every other table does.
-- ----------------------------------------------------------------------------
do $$
begin
  execute 'drop trigger if exists set_updated_at on resellers; create trigger set_updated_at before update on resellers for each row execute function set_updated_at();';
end $$;

-- ----------------------------------------------------------------------------
-- Row level security, matching the other tables: signed-in users only.
-- ----------------------------------------------------------------------------
alter table resellers enable row level security;

drop policy if exists "authenticated full access" on resellers;
create policy "authenticated full access" on resellers for all to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- v_sales — add the reseller join and retail_unit_price. Dropped first (not
-- just "or replace"): the column list changes relative to the previous
-- version, which Postgres only allows for a brand new view.
-- ----------------------------------------------------------------------------
drop view if exists v_sales cascade;

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
  -- entered — see the comment on sales.reseller_id above), so this needs no
  -- special-casing for consignment vs. direct sales.
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
