begin;

create table if not exists public.vega_cariler (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  company_code text,
  company_tracking_code text,
  tax_office text,
  tax_no text,
  type text not null,
  city text,
  last_transaction_date timestamptz,
  balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vega_cariler_org_code_key unique (organization_id, code)
);

create index if not exists vega_cariler_org_code_idx on public.vega_cariler (organization_id, code);
alter table public.vega_cariler enable row level security;

create policy "vega_cariler_select_members" on public.vega_cariler
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "vega_cariler_all_staff" on public.vega_cariler
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

commit;
