begin;

alter table public.credit_cards
  drop constraint if exists credit_cards_last4_check;

alter table public.credit_cards
  add constraint credit_cards_last4_check
  check (last4 ~ '^[0-9]{4}$');

commit;
