-- ============================================================================
-- Adds the two tables behind the "2026 financials" dashboard section and the
-- business plan targets on the Goals page.
--
-- Paste this whole file into the Supabase SQL Editor and hit Run. It is the
-- new part of schema.sql on its own, so you don't have to re-run the whole
-- schema. Safe to run more than once: every statement is "if not exists" or a
-- drop-then-create, and it adds nothing to and removes nothing from your
-- existing products, variants, stock, sales, expenses or goals.
--
-- Afterwards, load the spreadsheet figures with:  npm run import-financials
-- ============================================================================

-- ----------------------------------------------------------------------------
-- financial_months — monthly actuals from the Gigeez P&L spreadsheet
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
-- bp_targets — yearly business-plan targets from the BP (Target) sheet
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
-- Keep updated_at current, the same way every other table does.
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  for t in select unnest(array['financial_months', 'bp_targets'])
  loop
    execute format(
      'drop trigger if exists set_updated_at on %I; create trigger set_updated_at before update on %I for each row execute function set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- Row level security, matching the other tables: signed-in users only.
-- ----------------------------------------------------------------------------
alter table financial_months enable row level security;
alter table bp_targets enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['financial_months', 'bp_targets'])
  loop
    execute format('drop policy if exists "authenticated full access" on %I;', t);
    execute format(
      'create policy "authenticated full access" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
