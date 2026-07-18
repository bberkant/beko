begin;

create table if not exists public.ekap_candidates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  ikn text not null,
  title text not null,
  institution text not null,
  city text,
  deadline_at timestamptz not null,
  procurement_type text not null default 'mal',
  scope text not null default '4734',
  matched_keyword text not null,
  source_url text not null default 'https://ekapv2.kik.gov.tr/ekap/search',
  status text not null default 'bekliyor' check (status in ('bekliyor','onaylandi','reddedildi')),
  discovered_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (organization_id, ikn)
);

create index if not exists ekap_candidates_org_status_deadline_idx
  on public.ekap_candidates (organization_id, status, deadline_at);

alter table public.ekap_candidates enable row level security;

create policy "ekap_candidates_select_members" on public.ekap_candidates for select to authenticated
  using (public.is_org_member(organization_id));
create policy "ekap_candidates_insert_staff" on public.ekap_candidates for insert to authenticated
  with check (public.has_org_role(organization_id,array['admin','muhasebe','finans']));
create policy "ekap_candidates_update_staff" on public.ekap_candidates for update to authenticated
  using (public.has_org_role(organization_id,array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id,array['admin','muhasebe','finans']));
create policy "ekap_candidates_delete_staff" on public.ekap_candidates for delete to authenticated
  using (public.has_org_role(organization_id,array['admin','muhasebe','finans']));

commit;
