alter table public.ebs_checks
  add column if not exists kesideci text,
  add column if not exists keside_yeri text,
  add column if not exists tahsildar_banka text,
  add column if not exists ciro_edilen text;
