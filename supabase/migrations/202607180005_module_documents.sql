begin;

create table if not exists public.module_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  module text not null check (module in ('bank_accounts','vehicles','traffic_fines','drivers')),
  file_name text not null,
  file_path text not null,
  note text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists module_documents_org_module_idx on public.module_documents(organization_id,module,created_at desc);
alter table public.module_documents enable row level security;
create policy "module_documents_select_members" on public.module_documents for select using (public.is_org_member(organization_id));
create policy "module_documents_write_staff" on public.module_documents for all using (public.has_org_role(organization_id,array['admin','muhasebe'])) with check (public.has_org_role(organization_id,array['admin','muhasebe']));

commit;
