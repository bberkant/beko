begin;

create table if not exists public.vega_cari_hareketler (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cari_code text not null,
  date timestamptz not null,
  invoice_no text not null default '',
  izahat text not null default '',
  description text,
  quantity numeric(14,4) not null default 0,
  unit_price numeric(14,4) not null default 0,
  line_tutar numeric(14,2) not null default 0,
  product_name text,
  unit_name text,
  borc numeric(14,2) not null default 0,
  alacak numeric(14,2) not null default 0,
  vade timestamptz,
  type text,
  amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vega_cari_hareketler_org_cari_idx on public.vega_cari_hareketler (organization_id, cari_code);
alter table public.vega_cari_hareketler enable row level security;

create policy "vega_cari_hareketler_select_members" on public.vega_cari_hareketler
  for select to authenticated
  using (public.is_org_member(organization_id));

create policy "vega_cari_hareketler_all_staff" on public.vega_cari_hareketler
  for all to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

commit;
