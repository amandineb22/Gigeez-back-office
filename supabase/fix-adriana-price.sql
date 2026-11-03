-- ============================================================================
-- ADRIANA had no retail price anywhere in the master stock sheet (its Prices
-- tab rows were all QAR 0). Confirmed: QAR 1400, and the model is
-- discontinued. Fixes the 3 affected SKUs and the one historical sale among
-- them that had imported at QAR 0 for lack of a real price.
--
-- Paste into the Supabase SQL Editor and run. Safe to run more than once.
-- ============================================================================

update variants
set retail_price = 1400
where sku in ('ADRNSSF4VI', 'ADRXSAY9VI', 'ADRXSSF4VI');

update sales
set unit_price = 1400
where unit_price = 0
  and variant_id in (
    select id from variants where sku in ('ADRNSSF4VI', 'ADRXSAY9VI', 'ADRXSSF4VI')
  );

update products
set notes = 'Discontinued.'
where name = 'ADRIANA';
