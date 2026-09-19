begin;

alter table public.main_cashbox_transactions 
  add column if not exists company text check (company in ('Etik Et', 'Marif Et'));

commit;
