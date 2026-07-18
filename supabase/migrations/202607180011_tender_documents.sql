begin;

create unique index if not exists tenders_org_id_uidx on public.tenders (organization_id,id);
create table if not exists public.tender_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  tender_id uuid not null,
  package_id uuid not null,
  file_name text not null,
  relative_path text not null,
  file_path text not null,
  mime_type text not null default 'application/octet-stream',
  file_size bigint not null check (file_size >= 0 and file_size <= 52428800),
  source_type text not null check (source_type in ('file','folder','zip')),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (organization_id,tender_id) references public.tenders(organization_id,id) on delete cascade,
  check (file_path like organization_id::text || '/' || tender_id::text || '/' || package_id::text || '/%')
);
create index if not exists tender_documents_tender_idx on public.tender_documents (organization_id,tender_id,created_at desc);
alter table public.tender_documents enable row level security;
create policy "tender_documents_select_members" on public.tender_documents for select to authenticated
  using (public.is_org_member(organization_id));
create policy "tender_documents_write_staff" on public.tender_documents for all to authenticated
  using (public.has_org_role(organization_id,array['admin','muhasebe','finans']))
  with check (public.has_org_role(organization_id,array['admin','muhasebe','finans']));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('tender-documents','tender-documents',false,52428800,array[
  'application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain','text/csv','image/jpeg','image/png','application/octet-stream'
]) on conflict (id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;

create policy "tender_files_read_members" on storage.objects for select to authenticated
using (bucket_id='tender-documents' and public.is_org_member((storage.foldername(name))[1]::uuid));
create policy "tender_files_insert_staff" on storage.objects for insert to authenticated
with check (bucket_id='tender-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']));
create policy "tender_files_update_staff" on storage.objects for update to authenticated
using (bucket_id='tender-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']))
with check (bucket_id='tender-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']));
create policy "tender_files_delete_staff" on storage.objects for delete to authenticated
using (bucket_id='tender-documents' and public.has_org_role((storage.foldername(name))[1]::uuid,array['admin','muhasebe','finans']));

commit;
