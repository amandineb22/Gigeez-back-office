-- Removes the sample/demo data created by `npm run seed` — placeholder
-- products, suppliers, expenses, and the fake sales/purchase orders tied to
-- them, used only to populate the dashboard before the real Gigeez stock
-- sheet was imported. Safe to run more than once (later runs are a no-op).
--
-- Run this in the Supabase SQL Editor for your project, the same way you
-- ran schema.sql.

begin;

-- 1. Demo sales and purchase orders reference the demo products' variants,
--    and must be deleted first: `sales.variant_id` and
--    `purchase_orders.variant_id` are `on delete restrict`, so Postgres
--    would otherwise refuse to delete the products/variants below.
delete from sales
where variant_id in (
  select v.id
  from variants v
  join products p on p.id = v.product_id
  where p.name in (
    'Linen Wrap Dress',
    'Organic Cotton Tee',
    'Tailored Wool Trousers',
    'Quilted Field Jacket',
    'Woven Leather Belt'
  )
);

delete from purchase_orders
where variant_id in (
  select v.id
  from variants v
  join products p on p.id = v.product_id
  where p.name in (
    'Linen Wrap Dress',
    'Organic Cotton Tee',
    'Tailored Wool Trousers',
    'Quilted Field Jacket',
    'Woven Leather Belt'
  )
);

-- 2. Demo products — deleting these cascades to their SKUs (variants)
--    automatically.
delete from products
where name in (
  'Linen Wrap Dress',
  'Organic Cotton Tee',
  'Tailored Wool Trousers',
  'Quilted Field Jacket',
  'Woven Leather Belt'
);

-- 3. Demo suppliers created by the seed script. There is no real supplier
--    data yet, so this leaves the Suppliers page empty and ready for you
--    to add your real suppliers.
delete from suppliers
where name in (
  'Northfield Textiles Co.',
  'Cascade Garment Works',
  'Amistad Leather Goods'
);

-- 4. Demo expenses created by the seed script — recurring rent/salaries/
--    software/utilities/marketing/shipping/packaging/materials/
--    manufacturing lines against these exact fake vendors, repeated every
--    month it ran. Restricted to source_ref is null so a real expense
--    imported from the P&L sheet is never touched even on an unlikely
--    vendor-name coincidence.
delete from expenses
where source_ref is null
  and vendor in (
    'Studio Lease LLC',
    'Payroll',
    'Various SaaS',
    'City Utilities',
    'Meta Ads',
    'Regional Post',
    'EcoPack Supply',
    'Northfield Textiles Co.',
    'Cascade Garment Works'
  );

commit;
