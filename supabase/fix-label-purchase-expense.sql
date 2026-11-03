-- One stray expense row (a QAR 640 "Label Purchase" cost from 1 May 2026)
-- didn't get picked up by add-expense-categories.sql's relabeling and was
-- still showing as "packaging". Puts it under its real category.
--
-- Paste into the Supabase SQL Editor and run. Safe to run more than once.

update expenses
set category = 'Label Purchase', cost_band = 'production'
where category = 'packaging'
  and source_ref like '%:label-purchase';
