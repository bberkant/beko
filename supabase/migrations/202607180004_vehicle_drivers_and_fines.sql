begin;

create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null, phone text not null default '', email text not null default '', identity_number text not null default '',
  license_class text not null default 'B', license_number text not null default '', license_expiry_date date,
  assigned_vehicle_id uuid references public.vehicles(id) on delete set null,
  status text not null default 'aktif' check (status in ('aktif','izinli','pasif')),
  description text, created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.traffic_fines (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete set null,
  fine_date date not null, notification_date date, fine_number text not null default '', violation_type text not null,
  location text not null default '', amount numeric(16,2) not null check (amount > 0),
  payment_status text not null default 'odenmedi' check (payment_status in ('odenmedi','odendi','itiraz')),
  payment_date date, description text, document_path text,
  created_by uuid not null default auth.uid() references auth.users(id), created_at timestamptz not null default now()
);

create index if not exists drivers_org_idx on public.drivers(organization_id);
create index if not exists traffic_fines_org_idx on public.traffic_fines(organization_id, fine_date desc);
alter table public.drivers enable row level security;
alter table public.traffic_fines enable row level security;
create policy "drivers_select_members" on public.drivers for select using (public.is_org_member(organization_id));
create policy "drivers_write_staff" on public.drivers for all using (public.has_org_role(organization_id,array['admin','muhasebe'])) with check (public.has_org_role(organization_id,array['admin','muhasebe']));
create policy "traffic_fines_select_members" on public.traffic_fines for select using (public.is_org_member(organization_id));
create policy "traffic_fines_write_staff" on public.traffic_fines for all using (public.has_org_role(organization_id,array['admin','muhasebe'])) with check (public.has_org_role(organization_id,array['admin','muhasebe']));

commit;
