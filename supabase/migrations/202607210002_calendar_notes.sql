begin;

create table if not exists public.calendar_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  date date not null,
  content text not null,
  completed boolean not null default false,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists calendar_notes_org_date_idx on public.calendar_notes (organization_id, date);

alter table public.calendar_notes enable row level security;

create policy "notes_select_members" on public.calendar_notes for select
  using (public.is_org_member(organization_id));

create policy "notes_insert_members" on public.calendar_notes for insert
  with check (public.is_org_member(organization_id));

create policy "notes_update_members" on public.calendar_notes for update
  using (public.is_org_member(organization_id))
  with check (public.is_org_member(organization_id));

create policy "notes_delete_members" on public.calendar_notes for delete
  using (public.is_org_member(organization_id));

commit;
