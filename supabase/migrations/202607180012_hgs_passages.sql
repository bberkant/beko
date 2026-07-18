begin;

create table if not exists public.hgs_passages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null,
  passage_date timestamptz not null,
  entry_point text not null default '',
  exit_point text not null default '',
  amount numeric(14,2) not null default 0 check (amount >= 0),
  hgs_account text not null default '',
  payment_status text not null default 'bekliyor' check (payment_status in ('bekliyor','odendi','itiraz')),
  description text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hgs_passages_vehicle_same_org_fk foreign key (organization_id, vehicle_id)
    references public.vehicles(organization_id, id) on delete cascade
);

create index if not exists hgs_passages_org_date_idx on public.hgs_passages (organization_id, passage_date desc);
create index if not exists hgs_passages_vehicle_idx on public.hgs_passages (vehicle_id);
alter table public.hgs_passages enable row level security;

create policy "hgs_passages_select_members" on public.hgs_passages for select to authenticated
  using (public.is_org_member(organization_id));
create policy "hgs_passages_insert_staff" on public.hgs_passages for insert to authenticated
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "hgs_passages_update_staff" on public.hgs_passages for update to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
create policy "hgs_passages_delete_staff" on public.hgs_passages for delete to authenticated
  using (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

commit;
