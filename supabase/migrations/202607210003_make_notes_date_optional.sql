begin;

alter table public.calendar_notes
  alter column date drop not null;

commit;
