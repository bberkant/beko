CREATE OR REPLACE FUNCTION public.preserve_ebs_checks_customizations()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF OLD.ozel_alan IS NOT NULL AND OLD.ozel_alan != '' THEN
        IF (NEW.ozel_alan IS NULL OR NEW.ozel_alan = '' OR NEW.ozel_alan = 'ÇEK' OR NEW.ozel_alan = 'SENET' OR NOT (NEW.ozel_alan ILIKE '%takasta%')) THEN
            IF OLD.ozel_alan ILIKE '%takasta%' OR OLD.ozel_alan ILIKE '%iç takas%' OR OLD.ozel_alan ILIKE '%takasta olmayan%' THEN
                NEW.ozel_alan := OLD.ozel_alan;
            END IF;
        END IF;
    END IF;

    IF OLD.ozel_alan ILIKE '%takasta%' AND (OLD.debtor ILIKE '%ZİRAAT%' OR OLD.debtor ILIKE '%DENİZ%' OR OLD.debtor ILIKE '%GARANTİ%' OR OLD.debtor ILIKE '%AKBANK%' OR OLD.debtor ILIKE '%ALBARAKA%' OR OLD.debtor ILIKE '%İŞ%' OR OLD.debtor ILIKE '%TAKSİT%') THEN
        IF NEW.debtor IS NULL OR NEW.debtor = '' OR NEW.debtor = 'ÇEKLER' THEN
            NEW.debtor := OLD.debtor;
        END IF;
    END IF;

    IF (NEW.status IS NULL OR NEW.status = '') AND OLD.status IS NOT NULL THEN
        NEW.status := OLD.status;
    END IF;

    RETURN NEW;
END;
$function$;

UPDATE public.ebs_checks 
SET status = 'Portföyde', updated_at = now()
WHERE id = '58e13090-63ab-4cf0-af58-4bcf74b160a4';

UPDATE public.ebs_checks 
SET status = 'Ödendi', updated_at = now()
WHERE id = '92689778-78a1-4d48-a362-1db5d14d903b';
