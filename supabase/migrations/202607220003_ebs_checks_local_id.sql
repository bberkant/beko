alter table public.ebs_checks add column if not exists local_id integer;
alter table public.ebs_checks add constraint ebs_checks_local_id_unique unique (organization_id, check_type, local_id);
