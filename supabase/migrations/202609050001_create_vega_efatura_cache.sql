-- Create vega_efatura_cache table to persist e-fatura records from Vega Arctos
create table if not exists public.vega_efatura_cache (
  company text primary key,
  invoices jsonb not null default '[]'::jsonb,
  record_count integer not null default 0,
  updated_at timestamptz not null default now(),
  updated_by text
);

alter table public.vega_efatura_cache enable row level security;

drop policy if exists "vega_efatura_cache_select_policy" on public.vega_efatura_cache;
create policy "vega_efatura_cache_select_policy" on public.vega_efatura_cache
  for select
  using (true);

drop policy if exists "vega_efatura_cache_insert_policy" on public.vega_efatura_cache;
create policy "vega_efatura_cache_insert_policy" on public.vega_efatura_cache
  for insert
  with check (true);

drop policy if exists "vega_efatura_cache_update_policy" on public.vega_efatura_cache;
create policy "vega_efatura_cache_update_policy" on public.vega_efatura_cache
  for update
  using (true)
  with check (true);
