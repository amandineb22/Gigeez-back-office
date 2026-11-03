-- ============================================================================
-- Attaches a real reseller to historical "sold" pieces from the master stock
-- sheet, for the cases where the sheet's BIN column still names the actual
-- location instead of just "sold" (e.g. a piece sold through Zoe Boutique's
-- Porto Cervo location keeps BIN = 'PORTO C' rather than being overwritten).
--
-- Scope: 54 of the 242 historical sales — one SKU per row below, each of
-- which had exactly one sold copy and one consistent reseller bin, so there
-- is no ambiguity about which sale it refers to. 8 SKUs were left out
-- entirely because they had multiple sold copies at different bins and the
-- live data has no way to tell which specific sale row is which; those stay
-- "Direct". unit_price is corrected from the full retail price (what was
-- originally imported) to what Gigeez actually nets through that reseller,
-- and retail_unit_price is set to the original retail figure for reference.
--
-- Restricted to sale_date is null (only ever true for these historical
-- imports) and reseller_id is null (never touches a sale you've already
-- edited by hand). Safe to run more than once.
--
-- Paste into the Supabase SQL Editor and run.
-- ============================================================================

update sales s
set reseller_id = r.id,
    retail_unit_price = v.retail_sku_price,
    unit_price = v.net_price
from (values
  ('ANJXLAY9VI', 'Zoe Boutique', 666.72, 1800.0),
  ('ANJXLBF6VI', 'Zoe Boutique', 666.72, 1800.0),
  ('ANJXLBF8VI', 'Zoe Boutique', 666.72, 1800.0),
  ('ANJXLEC3VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1800.0, 1800.0),
  ('ANJXLEC7VI', 'Salam Studio & Stores', 1080.0, 1800.0),
  ('ANJXLSF1VI', 'Four Seasons Residences Doha', 599.94, 1800.0),
  ('ANJXLSF4VI', 'Zoe Boutique', 666.72, 1800.0),
  ('ANJXSAY7VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1800.0, 1800.0),
  ('ANJXSBF3VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1800.0, 1800.0),
  ('ANJXSEC8VI', 'Four Seasons West Bay', 900.0, 1800.0),
  ('ANJXSSF7VI', 'Bulgari Resort Dubai', 599.94, 1800.0),
  ('AVAUUEC4VI', 'Zoe Boutique', 166.68, 450.0),
  ('DARXLSF1VI', 'Bulgari Resort Dubai', 599.94, 1800.0),
  ('DARXSGC3VI', 'Four Seasons West Bay', 900.0, 1800.0),
  ('DARXUBF9VI', 'Bulgari Resort Dubai', 599.94, 1800.0),
  ('GRAXLSF4VI', 'Zoe Boutique', 666.72, 1800.0),
  ('GRAXSBF1VI', 'Erreuno', 1800.0, 1800.0),
  ('GRAXSSF1VI', 'Zoe Boutique', 666.72, 1800.0),
  ('HELDLSF3VI', 'Zoe Boutique', 444.48, 1200.0),
  ('HELXLSF3VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1650.0, 1650.0),
  ('HIRDLSF4VI', 'Salam Studio & Stores', 720.0, 1200.0),
  ('HIRDSSF3VI', 'Four Seasons West Bay', 600.0, 1200.0),
  ('HIRNSEC5CH', 'Salam Studio & Stores', 540.0, 900.0),
  ('HIRNSSF4CH', 'Zoe Boutique', 333.36, 900.0),
  ('HIRXLBF3VI', 'Zoe Boutique', 611.16, 1650.0),
  ('HIRXSEC3VI', 'Four Seasons Residences Doha', 549.95, 1650.0),
  ('HIRXSSF4VI', 'Four Seasons Residences Doha', 549.95, 1650.0),
  ('JACUUAY1VI', 'Zoe Boutique', 185.2, 500.0),
  ('KESXUSF3VI', 'Four Seasons West Bay', 975.0, 1950.0),
  ('LAUNLBF5VI', 'Zoe Boutique', 333.36, 900.0),
  ('LAUNLEC7VI', 'Four Seasons West Bay', 450.0, 900.0),
  ('LAUNSAY6VI', 'Zoe Boutique', 333.36, 900.0),
  ('LAUXLBF9VI', 'Salam Studio & Stores', 990.0, 1650.0),
  ('LAUXSBF3SI', 'Zoe Boutique', 611.16, 1650.0),
  ('LAUXSGC7VI', 'Four Seasons Residences Doha', 549.95, 1650.0),
  ('LAUXSSF3SI', 'Zoe Boutique', 611.16, 1650.0),
  ('MURXLAY3VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1800.0, 1800.0),
  ('MURXLAY8VI', 'Four Seasons Residences Doha', 599.94, 1800.0),
  ('MURXSAY2VI', 'Bulgari Resort Dubai', 599.94, 1800.0),
  ('MURXSAY8VI', 'Zoe Boutique', 666.72, 1800.0),
  ('MURXSEC7VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1800.0, 1800.0),
  ('PALXLAY4CS', 'Zoe Boutique', 740.8, 2000.0),
  ('PALXLEC3VI', 'The Luxury Edition (Cheval Blanc Randheli)', 1800.0, 1800.0),
  ('ROMNLAY7CH', 'Zoe Boutique', 333.36, 900.0),
  ('ROMNSSF5CH', 'Zoe Boutique', 333.36, 900.0),
  ('ROMXLBF8VI', 'Zoe Boutique', 611.16, 1650.0),
  ('ROMXLEC4CS', 'Zoe Boutique', 666.72, 1800.0),
  ('ROMXLSF1VI', 'Bulgari Resort Dubai', 549.95, 1650.0),
  ('ROMXLSF3SI', 'Zoe Boutique', 611.16, 1650.0),
  ('ROMXLSF7VI', 'Salam Studio & Stores', 990.0, 1650.0),
  ('ROMXSAY7CS', 'Salam Studio & Stores', 1080.0, 1800.0),
  ('ROMXSBF3CS', 'Zoe Boutique', 666.72, 1800.0),
  ('ROMXSBF7CS', 'Four Seasons Residences Doha', 599.94, 1800.0),
  ('ROMXSEC5CS', 'Zoe Boutique', 666.72, 1800.0)
) as v(sku, reseller_name, net_price, retail_sku_price)
join variants vv on vv.sku = v.sku
join resellers r on r.name = v.reseller_name
where s.variant_id = vv.id
  and s.sale_date is null
  and s.reseller_id is null;
