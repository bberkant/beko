-- Insert the analyzed tapu senedi data directly into the database
DO $$
DECLARE
  org_id uuid;
  user_id uuid;
BEGIN
  -- Get first organization and user
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  SELECT id INTO user_id FROM auth.users LIMIT 1;

  IF org_id IS NOT NULL AND user_id IS NOT NULL THEN
    INSERT INTO public.real_estates (
      organization_id,
      city,
      district,
      neighborhood,
      ada,
      parsel,
      property_type,
      area_sqm,
      share,
      purchase_date,
      purchase_amount,
      current_value,
      currency,
      status,
      deed_no,
      description,
      created_by
    ) VALUES (
      org_id,
      'AMASYA',
      'MERZİFON',
      'BAĞLARBAŞI',
      '711',
      '120',
      'Mesken',
      368.00,
      '1/4',
      '2022-11-18',
      80688.98,
      80688.98,
      'TRY',
      'aktif',
      'Cilt: 5 / Sahife: 462',
      'Arif Üyük''ten satın alınan 1/4 hisseli 2 nolu bağımsız bölüm mesken tapusu. Yevmiye No: 18822. Eklenti: E2 Depo.',
      user_id
    );
  END IF;
END $$;
