-- ============================================================================
-- Promotes "Events / Shows – Exhibition" from a Marketing sub-category to
-- its own main category/band, "Events", alongside Production, Commercial,
-- Marketing and Admin.
--
-- Note: the dashboard's "2026 financials" section totals straight from the
-- P&L sheet's own 4 cost columns, and the sheet itself still counts Events
-- spend inside its Marketing total — that figure is unaffected by this.
-- This only changes the Expenses page's category/band for individual lines.
--
-- Paste into the Supabase SQL Editor and run. Safe to run more than once.
-- ============================================================================

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'expense_categories_band_check') then
    alter table expense_categories drop constraint expense_categories_band_check;
  end if;
  alter table expense_categories add constraint expense_categories_band_check
    check (band in ('production', 'commercial', 'marketing', 'events', 'admin'));

  if exists (select 1 from pg_constraint where conname = 'expenses_cost_band_check') then
    alter table expenses drop constraint expenses_cost_band_check;
  end if;
  alter table expenses add constraint expenses_cost_band_check
    check (cost_band is null or cost_band in ('production', 'commercial', 'marketing', 'events', 'admin'));
end $$;

update expense_categories
set band = 'events'
where name = 'Events / Shows – Exhibition';

update expenses
set cost_band = 'events'
where category = 'Events / Shows – Exhibition';
