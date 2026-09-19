update public.kesim_listesi
set payment_date = to_char(to_timestamp((payment_date::double precision - 25569) * 86400), 'DD.MM.YYYY')
where payment_date ~ '^[0-9]+$';
