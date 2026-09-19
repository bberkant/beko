-- Insert all analyzed tapu documents into public.real_estates table
DO $$
DECLARE
  org_id uuid;
  user_id uuid;
BEGIN
  -- Get first organization and user
  SELECT id INTO org_id FROM public.organizations LIMIT 1;
  SELECT id INTO user_id FROM auth.users LIMIT 1;

  IF org_id IS NOT NULL AND user_id IS NOT NULL THEN
    -- Record 1: Amasya Merzifon Ada 711 Parsel 120 Mesken 1
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERZİFON', 'BAĞLARBAŞI', '711', '120', 'Mesken', 368.00, '1/4', '2022-11-18', 80688.98, 80688.98, 'TRY', 'aktif', 'Cilt: 5 / Sayfa: 461', '1 nolu bağımsız bölüm mesken tapusu. Yevmiye: 18822. Eklenti: E1 Depo.', user_id);

    -- Record 2: Amasya Merzifon Ada 711 Parsel 120 Mesken 4
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERZİFON', 'BAĞLARBAŞI', '711', '120', 'Mesken', 368.00, '1/4', '2022-11-18', 80688.98, 80688.98, 'TRY', 'aktif', 'Cilt: 5 / Sayfa: 464', '4 nolu bağımsız bölüm mesken tapusu. Yevmiye: 18822. Eklenti: E4 Depo.', user_id);

    -- Record 3: Samsun Canik Ada 87 Parsel 6 Mesken 4
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'SAMSUN', 'CANİK', 'TEKNEPINAR', '87', '6', 'Mesken', 286.14, '10/70', '2021-04-07', 93500.00, 93500.00, 'TRY', 'aktif', 'Cilt: 4 / Sayfa: 374', '1. Kat 4 nolu bağımsız bölüm mesken tapusu. Yevmiye: 4136. Eklenti: 3 Nolu Odunluk.', user_id);

    -- Record 4: Samsun Canik Ada 87 Parsel 6 Mesken 2
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'SAMSUN', 'CANİK', 'TEKNEPINAR', '87', '6', 'Mesken', 286.14, '10/70', '2021-03-29', 81000.00, 81000.00, 'TRY', 'aktif', 'Cilt: 4 / Sayfa: 372', 'Zemin Kat 2 nolu bağımsız bölüm mesken tapusu. Yevmiye: 3734. Eklenti: 1 Nolu Odunluk.', user_id);

    -- Record 5: Samsun Atakum Ada 11884 Parsel 11 Mesken 1
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'SAMSUN', 'ATAKUM', 'BALAÇ', '11884', '11', 'Mesken', 822.00, '90/1644', '2024-07-22', 585000.00, 585000.00, 'TRY', 'aktif', 'Cilt: 122 / Sayfa: 12058', '2. Bodrum 1 nolu bağımsız bölüm mesken tapusu. Yevmiye: 27363.', user_id);

    -- Record 6: Kırıkkale Yahşihan Ada 651 Parsel 62 Mesken 35
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'KIRIKKALE', 'YAHŞİHAN', 'YEŞİLVADİ', '651', '62', 'Mesken', 3045.00, '5079/304500', '2023-10-17', 65000.00, 65000.00, 'TRY', 'aktif', 'Cilt: 1 / Sayfa: 35', '4. Kat 35 nolu bağımsız bölüm mesken tapusu. Yevmiye: 11917.', user_id);

    -- Record 7: Amasya Taşova Ada 194 Parsel 8 Mesken 10
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'TAŞOVA', 'SANAYİ', '194', '8', 'Mesken', 4883.90, '1/80', '2023-11-30', 118928.47, 118928.47, 'TRY', 'aktif', 'Cilt: 2 / Sayfa: 146', '2. Kat 10 nolu bağımsız bölüm mesken tapusu. Yevmiye: 16766.', user_id);

    -- Record 8: Amasya Merkez Ada 203 Parsel 24 Mesken 5
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'DERE', '203', '24', 'Mesken', 82.36, '9/60', '2010-01-20', 19170.00, 19170.00, 'TRY', 'aktif', 'Cilt: 4 / Sayfa: 379', '4. Kat 5 nolu bağımsız bölüm mesken tapusu. Yevmiye: 494. Eklenti: 2.', user_id);

    -- Record 9: Amasya Merkez Ada 1031 Parsel 8 Mesken 15
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', '', '1031', '8', 'Mesken', 675.00, '250/4510', '1994-08-05', 0.00, 0.00, 'TRY', 'aktif', 'Cilt: 1 / Sayfa: 153', '1. Kat 15 nolu bağımsız bölüm mesken tapusu (Şuayip Kaplan).', user_id);

    -- Record 10: Amasya Merkez Ada 967 Parsel 23 Mesken 20
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'ŞEYHCUİ', '967', '23', 'Mesken', 1396.77, '65/2220', '2024-02-28', 833000.00, 833000.00, 'TRY', 'aktif', 'Cilt: 114 / Sayfa: 11249', 'A Kısım 2. Normal Kat 20 nolu bağımsız bölüm mesken tapusu. Yevmiye: 8133.', user_id);

    -- Record 11: Amasya Merkez Ada 967 Parsel 23 Mesken 28
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'ŞEYHCUİ', '967', '23', 'Mesken', 1396.77, '90/2220', '2024-02-28', 850000.00, 850000.00, 'TRY', 'aktif', 'Cilt: 114 / Sayfa: 11257', 'A Kısım 4. Normal Kat 28 nolu bağımsız bölüm mesken tapusu. Yevmiye: 8133.', user_id);

    -- Record 12: Amasya Merkez Ada 967 Parsel 23 Mesken 29
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'ŞEYHCUİ', '967', '23', 'Mesken', 1396.77, '85/2220', '2024-02-28', 850000.00, 850000.00, 'TRY', 'aktif', 'Cilt: 114 / Sayfa: 11258', 'A Kısım 4. Normal Kat 29 nolu bağımsız bölüm mesken tapusu. Yevmiye: 8133.', user_id);

    -- Record 13: Amasya Merkez Ada 967 Parsel 23 Mesken 6
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'ŞEYHCUİ', '967', '23', 'Mesken', 1396.77, '75/2220', '2024-02-28', 812000.00, 812000.00, 'TRY', 'aktif', 'Cilt: 114 / Sayfa: 11235', 'A Kısım Zemin Kat 6 nolu bağımsız bölüm mesken tapusu. Yevmiye: 8133.', user_id);

    -- Record 14: Amasya Merkez Ada 967 Parsel 23 Mesken 8
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'ŞEYHCUİ', '967', '23', 'Mesken', 1396.77, '60/2220', '2024-02-28', 812000.00, 812000.00, 'TRY', 'aktif', 'Cilt: 114 / Sayfa: 11237', 'A Kısım Zemin Kat 8 nolu bağımsız bölüm mesken tapusu. Yevmiye: 8133.', user_id);

    -- Record 15: Amasya Suluova Ada 746 Parsel 1 Mesken 7
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'SULUOVA', 'BORSA', '746', '1', 'Mesken', 413.24, '5/40', '2026-06-09', 2550000.00, 2550000.00, 'TRY', 'aktif', 'Cilt: 12 / Sayfa: 1176', '3. Normal Kat 7 nolu bağımsız bölüm mesken tapusu. Yevmiye: 7316.', user_id);

    -- Record 16: Amasya Suluova Ada 746 Parsel 1 Mesken 3
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'SULUOVA', 'BORSA', '746', '1', 'Mesken', 413.24, '5/40', '2026-06-09', 2550000.00, 2550000.00, 'TRY', 'aktif', 'Cilt: 12 / Sayfa: 1172', '1. Normal Kat 3 nolu bağımsız bölüm mesken tapusu. Yevmiye: 7315.', user_id);

    -- Record 17: Amasya Suluova Ada 746 Parsel 1 Mesken 6
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'SULUOVA', 'BORSA', '746', '1', 'Mesken', 413.24, '6/40', '2026-06-16', 2050000.00, 2050000.00, 'TRY', 'aktif', 'Cilt: 12 / Sayfa: 1175', '2. Normal Kat 6 nolu bağımsız bölüm mesken tapusu. Yevmiye: 7746.', user_id);

    -- Record 18: Amasya Merkez Ada 134 Parsel 10 Bahçeli Ahşap Ev
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'BEYAZITPAŞA', '134', '10', 'Bahçeli Ahşap Ev', 279.27, '1/1', '2025-03-26', 7000.00, 7000.00, 'TRY', 'aktif', 'Cilt: 4 / Sayfa: 322', 'Beyazıtpaşa Mahallesinde bahçeli ahşap ev tapusu. Yevmiye: 11624.', user_id);

    -- Record 19: Amasya Merkez Ada 618 Parsel 5 Sebze Yeri
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERKEZ', 'AKBİLEK', '618', '5', 'Sebze Yeri', 3651.66, '1/1', '2022-11-18', 11000.00, 11000.00, 'TRY', 'aktif', 'Cilt: 1 / Sayfa: 21', 'Akbilek Mahallesinde sebze yeri tapusu. Yevmiye: 32940.', user_id);

    -- Record 20: Amasya Gümüşhacıköy Ada 121 Parsel 44 Tarla
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'GÜMÜŞHACIKÖY', 'KIRCA', '121', '44', 'Tarla', 3757.57, '1/1', '2024-05-20', 27000.00, 27000.00, 'TRY', 'aktif', 'Cilt: 6 / Sayfa: 508', 'Kırca Köyü Kafir Mezarı mevkiinde tarla tapusu. Yevmiye: 2786.', user_id);

    -- Record 21: Amasya Merzifon Ada 465 Parsel 2 Avlulu Kargir ve Ahşap Ahır
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERZİFON', 'KÜMBETHATUN', '465', '2', 'Avlulu Kargir ve Ahşap Ahır', 2450.00, '1/2', '2021-01-28', 332000.00, 332000.00, 'TRY', 'aktif', 'Cilt: 5 / Sayfa: 412', 'Kümbethatun Mahallesinde avlulu kargir ve ahşap ahır tapusu. Yevmiye: 1219.', user_id);

    -- Record 22: Amasya Merzifon Parsel 2 Tarla
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'AMASYA', 'MERZİFON', 'BAHÇECİK', '', '2', 'Tarla', 10900.00, '1/1', '2020-06-29', 20000.00, 20000.00, 'TRY', 'aktif', 'Cilt: 1 / Sayfa: 2', 'Bahçecik Köyü Köyüstü mevkiinde tarla tapusu. Yevmiye: 4729.', user_id);

    -- Record 23: Samsun Atakum Ada 171 Parsel 4 İki Katlı Kargir Ev ve Arsa
    INSERT INTO public.real_estates (organization_id, city, district, neighborhood, ada, parsel, property_type, area_sqm, share, purchase_date, purchase_amount, current_value, currency, status, deed_no, description, created_by)
    VALUES (org_id, 'SAMSUN', 'ATAKUM', 'TAFLAN', '171', '4', 'İki Katlı Kargir Ev ve Arsa', 1046.69, '1/1', '2026-07-02', 20000000.00, 20000000.00, 'TRY', 'aktif', 'Cilt: 31 / Sayfa: 3005', 'Taflan Mahallesinde iki katlı kargir ev ve arsa tapusu. Yevmiye: 34636.', user_id);

  END IF;
END $$;
