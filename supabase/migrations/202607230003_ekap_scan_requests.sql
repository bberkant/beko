begin;

create table if not exists public.ekap_scan_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error_message text,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ekap_scan_requests_org_status_idx
  on public.ekap_scan_requests (organization_id, status);

alter table public.ekap_scan_requests enable row level security;

create policy "ekap_scan_requests_select_members" on public.ekap_scan_requests for select to authenticated
  using (public.is_org_member(organization_id));
create policy "ekap_scan_requests_insert_staff" on public.ekap_scan_requests for insert to authenticated
  with check (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']));
create policy "ekap_scan_requests_update_staff" on public.ekap_scan_requests for update to authenticated
  using (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']))
  with check (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']));
create policy "ekap_scan_requests_delete_staff" on public.ekap_scan_requests for delete to authenticated
  using (public.has_org_role(organization_id, array['admin', 'muhasebe', 'finans']));

commit;
