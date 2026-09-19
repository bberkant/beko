begin;

alter table public.main_cashbox_transactions 
  add column if not exists exclude_from_report boolean not null default false;

commit;
