begin;

update public.credit_cards
set current_debt = card_limit,
    updated_at = now()
where current_debt is distinct from card_limit;

commit;
