import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = `
    CREATE OR REPLACE FUNCTION public.preserve_ebs_checks_customizations()
     RETURNS trigger
     LANGUAGE plpgsql
    AS $function$
        BEGIN
            -- If OLD record has a custom takas status (e.g. TAKASTA, İÇ TAKAS, TAKASTA OLMAYAN, etc.)
            -- and NEW record has empty/null/different ozel_alan from EBS sync, PRESERVE IT!
            IF OLD.ozel_alan IS NOT NULL AND OLD.ozel_alan != '' THEN
                IF (NEW.ozel_alan IS NULL OR NEW.ozel_alan = '' OR NEW.ozel_alan = 'ÇEK' OR NEW.ozel_alan = 'SENET' OR NOT (NEW.ozel_alan ILIKE '%takasta%')) THEN
                    IF OLD.ozel_alan ILIKE '%takasta%' OR OLD.ozel_alan ILIKE '%iç takas%' OR OLD.ozel_alan ILIKE '%takasta olmayan%' THEN
                        NEW.ozel_alan := OLD.ozel_alan;
                    END IF;
                END IF;
            END IF;

            -- If OLD record had debtor set to a specific bank or TAKSİT when marked as TAKASTA, preserve debtor if NEW is generic
            IF OLD.ozel_alan ILIKE '%takasta%' AND (OLD.debtor ILIKE '%ZİRAAT%' OR OLD.debtor ILIKE '%DENİZ%' OR OLD.debtor ILIKE '%GARANTİ%' OR OLD.debtor ILIKE '%AKBANK%' OR OLD.debtor ILIKE '%ALBARAKA%' OR OLD.debtor ILIKE '%İŞ%' OR OLD.debtor ILIKE '%TAKSİT%') THEN
                IF NEW.debtor IS NULL OR NEW.debtor = '' OR NEW.debtor = 'ÇEKLER' THEN
                    NEW.debtor := OLD.debtor;
                END IF;
            END IF;

            -- If NEW status is null or empty, preserve OLD status
            IF (NEW.status IS NULL OR NEW.status = '') AND OLD.status IS NOT NULL THEN
                NEW.status := OLD.status;
            END IF;

            RETURN NEW;
        END;
    $function$;

    -- Now update the 1M check to Portföyde / Teminata Verildi
    UPDATE public.ebs_checks 
    SET status = 'Portföyde' 
    WHERE id = '58e13090-63ab-4cf0-af58-4bcf74b160a4';

    -- Also update the 1.95M check to Ödendi
    UPDATE public.ebs_checks 
    SET status = 'Ödendi' 
    WHERE id = '92689778-78a1-4d48-a362-1db5d14d903b';
  `;
  const output = execSync(`npx supabase db query --linked --output-format json "${query.replace(/\n/g, ' ')}"`, { encoding: 'utf-8' });
  console.log('Success:', output);
} catch (error) {
  console.error('Error:', error.message);
}
