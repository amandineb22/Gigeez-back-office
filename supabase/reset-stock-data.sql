-- ============================================================================
-- Wipes the current product/stock/sales catalog so it can be rebuilt from a
-- newer master stock sheet, without leaving two overlapping snapshots mixed
-- together in the same tables.
--
-- This deletes real data: every product, SKU (variant), physical stock unit,
-- purchase order, and sale currently in the database. It does NOT touch
-- resellers, suppliers, expenses, goals, the imported P&L figures
-- (financial_months/bp_targets/historic_years), or the journal — only the
-- piece-level catalog that `npm run import-stock` rebuilds.
--
-- Run this in the Supabase SQL Editor, THEN run:
--   npm run import-stock
-- which will load the fresh snapshot (data/imports/2026-10-14-stock-import.json,
-- now the default) into the now-empty tables.
-- ============================================================================

begin;

-- sales and purchase_orders reference variants with "on delete restrict", so
-- they have to go first.
delete from sales;
delete from purchase_orders;
delete from stock_units;
delete from variants;
delete from products;

commit;
