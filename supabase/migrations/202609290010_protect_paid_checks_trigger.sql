-- Trigger function to preserve custom user edits and prevent EBS Sync from resetting 'Ödendi' or 'İptal' status
CREATE OR REPLACE FUNCTION public.preserve_ebs_checks_customizations()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- 1. KESİN KORUMA: Kullanıcı web arayüzünden evrakı 'Ödendi' veya 'İptal' yaptıysa,
    -- dışarıdan (EBS senkronizasyonu / Firebird vb.) gelen hiçbir güncelleme bu durumu 'Tahsilde' veya başka bir duruma geri çeviremez!
    IF OLD.status IN ('Ödendi', 'İptal') AND (NEW.status IS NULL OR NEW.status NOT IN ('Ödendi', 'İptal')) THEN
        NEW.status := OLD.status;
    END IF;

    -- 2. Özel Takas alanı koruması (TAKASTA, İÇ TAKAS, TAKASTA OLMAYAN, SİLİNDİ vb.)
    IF OLD.ozel_alan IS NOT NULL AND OLD.ozel_alan != '' THEN
        IF (NEW.ozel_alan IS NULL OR NEW.ozel_alan = '' OR NEW.ozel_alan = 'ÇEK' OR NEW.ozel_alan = 'SENET' OR NOT (NEW.ozel_alan ILIKE '%takasta%')) THEN
            IF OLD.ozel_alan ILIKE '%takasta%' OR OLD.ozel_alan ILIKE '%iç takas%' OR OLD.ozel_alan ILIKE '%takasta olmayan%' OR OLD.ozel_alan ILIKE '%silindi%' THEN
                NEW.ozel_alan := OLD.ozel_alan;
            END IF;
        END IF;
    END IF;

    -- 3. Takastaki banka veya TAKSİT sütunu koruması
    IF OLD.ozel_alan ILIKE '%takasta%' AND (OLD.debtor ILIKE '%ZİRAAT%' OR OLD.debtor ILIKE '%DENİZ%' OR OLD.debtor ILIKE '%GARANTİ%' OR OLD.debtor ILIKE '%AKBANK%' OR OLD.debtor ILIKE '%ALBARAKA%' OR OLD.debtor ILIKE '%İŞ%' OR OLD.debtor ILIKE '%TAKSİT%') THEN
        IF NEW.debtor IS NULL OR NEW.debtor = '' OR NEW.debtor = 'ÇEKLER' THEN
            NEW.debtor := OLD.debtor;
        END IF;
    END IF;

    -- 4. Yeni status boş geldiyse eski durumu koru
    IF (NEW.status IS NULL OR NEW.status = '') AND OLD.status IS NOT NULL THEN
        NEW.status := OLD.status;
    END IF;

    RETURN NEW;
END;
$function$;

-- Geçmiş 5 aya ait Niğde SGK taksitlerinin durumunu kesin olarak 'Ödendi' yap
UPDATE public.ebs_checks
SET status = 'Ödendi', updated_at = now()
WHERE creditor ILIKE '%NİĞDE SGK%' AND due_date <= '2026-09-29';
