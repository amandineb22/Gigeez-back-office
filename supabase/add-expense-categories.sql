-- ============================================================================
-- Replaces the old fixed 11-value expense category list with one that
-- matches your profit and loss sheet exactly — 34 specific line items,
-- grouped under the sheet's own 4 bands (Production/Commercial/Marketing/
-- Admin) — stored in their own table so new categories can be added later
-- without a schema change, while the "Add expense" form still only offers
-- picking from (or adding to) a governed list rather than free typing.
--
-- Paste this whole file into the Supabase SQL Editor and hit Run. Safe to
-- run more than once: table/column creation is "if not exists", the
-- category seed is an upsert, and the relabeling only touches rows already
-- imported from the P&L sheet (identified by their source_ref), matched by
-- exact slug so it never touches a hand-entered expense.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- expense_categories — the governed, extensible list. "band" mirrors the
-- P&L sheet's own grouping and is what the dashboard's expense breakdown
-- chart groups by, so it stays readable even as specific categories grow.
-- ----------------------------------------------------------------------------
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  band text not null check (band in ('production', 'commercial', 'marketing', 'admin')),
  created_at timestamptz not null default now()
);

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
  ('Events / Shows – Exhibition', 'marketing'),
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
-- expenses — category stays free text (no more fixed 11-value check, since
-- the list above is the source of truth now and can grow), plus a cost_band
-- column so the dashboard's pie chart can group by band without a join.
-- ----------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'expenses_category_check') then
    alter table expenses drop constraint expenses_category_check;
  end if;
end $$;

alter table expenses add column if not exists cost_band text
  check (cost_band is null or cost_band in ('production', 'commercial', 'marketing', 'admin'));

-- ----------------------------------------------------------------------------
-- Relabel expenses already imported from the P&L sheet to the exact category
-- above, matched by the slug already saved in their source_ref
-- (e.g. 'pnl:2025-09-01:textile-saree-purchase'). Hand-entered expenses have
-- no source_ref and are never touched.
-- ----------------------------------------------------------------------------
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
  ('events-shows-exhibition', 'Events / Shows – Exhibition', 'marketing'),
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

-- ----------------------------------------------------------------------------
-- Row level security, matching every other table: signed-in users only.
-- ----------------------------------------------------------------------------
alter table expense_categories enable row level security;

drop policy if exists "authenticated full access" on expense_categories;
create policy "authenticated full access" on expense_categories for all to authenticated using (true) with check (true);
