begin;

create table if not exists public.real_estates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  city text not null,
  district text not null,
  neighborhood text,
  ada text,
  parsel text,
  property_type text not null default 'arsa',
  area_sqm numeric(12,2) not null default 0 check (area_sqm >= 0),
  share text not null default '1/1',
  purchase_date date,
  purchase_amount numeric(16,2) not null default 0 check (purchase_amount >= 0),
  current_value numeric(16,2) not null default 0 check (current_value >= 0),
  currency text not null default 'TRY' check (currency in ('TRY','USD','EUR')),
  status text not null default 'aktif' check (status in ('aktif','satildi','kirada','diger')),
  deed_no text,
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists real_estates_org_idx on public.real_estates (organization_id);

alter table public.real_estates enable row level security;

create policy "real_estates_select_members" on public.real_estates for select to authenticated
  using (public.is_org_member(organization_id));

create policy "real_estates_write_staff" on public.real_estates for all to authenticated
  using (public.has_org_role(organization_id,array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id,array['admin','muhasebe','finans']));

-- Add module documents constraint support for real_estates
alter table public.module_documents drop constraint if exists module_documents_module_check;
alter table public.module_documents add constraint module_documents_module_check
  check (module in ('bank_accounts','vehicles','traffic_fines','drivers','tenders','real_estates'));

commit;
