begin;

-- Create vega_personel table
create table if not exists public.vega_personel (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  name text not null,
  company_code text,
  company_tracking_code text,
  tax_office text,
  tax_no text,
  type text not null default 'Personel',
  city text,
  last_transaction_date timestamptz,
  balance numeric(14,2) not null default 0,
  is_manual boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vega_personel_org_code_key unique (organization_id, code)
);

create index if not exists vega_personel_org_code_idx on public.vega_personel (organization_id, code);
alter table public.vega_personel enable row level security;

create policy "vega_personel_select_members" on public.vega_personel
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "vega_personel_all_staff" on public.vega_personel
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

-- Create vega_personel_hareketler table
create table if not exists public.vega_personel_hareketler (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  personel_code text not null,
  date timestamptz not null default now(),
  invoice_no text not null default '',
  izahat text not null default '',
  description text not null default '',
  borc numeric(14,2) not null default 0,
  alacak numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists vega_personel_hareketler_org_code_idx on public.vega_personel_hareketler (organization_id, personel_code);
alter table public.vega_personel_hareketler enable row level security;

create policy "vega_personel_hareketler_select_members" on public.vega_personel_hareketler
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "vega_personel_hareketler_all_staff" on public.vega_personel_hareketler
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

commit;
