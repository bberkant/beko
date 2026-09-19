-- Add document_type column to ebs_checks table
alter table public.ebs_checks add column if not exists document_type text default 'cek' check (document_type in ('cek', 'senet'));

-- Drop old unique constraint if it exists
alter table public.ebs_checks drop constraint if exists ebs_checks_local_id_unique;

-- Add new unique constraint including document_type
alter table public.ebs_checks add constraint ebs_checks_local_id_document_type_unique unique (organization_id, check_type, document_type, local_id);
