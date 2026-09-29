-- ==============================================================================
-- DARS ERP / AMASYA ET - CLEAN ALL REMAINING PERMISSIVE POLICIES
-- Kalan 10 tablodaki çift SELECT değerlendirme yükünü kaldırır:
-- drivers, traffic_fines, module_documents, tenders, tender_documents,
-- real_estates, vega_cariler, vega_personel, vega_personel_hareketler, vega_cari_hareketler
-- ==============================================================================

-- 1. DRIVERS
DROP POLICY IF EXISTS "drivers_write_staff" ON public.drivers;
CREATE POLICY "drivers_write_staff" ON public.drivers
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "drivers_select_members" ON public.drivers;

-- 2. TRAFFIC FINES
DROP POLICY IF EXISTS "traffic_fines_write_staff" ON public.traffic_fines;
CREATE POLICY "traffic_fines_write_staff" ON public.traffic_fines
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "traffic_fines_select_members" ON public.traffic_fines;

-- 3. MODULE DOCUMENTS
DROP POLICY IF EXISTS "module_documents_write_staff" ON public.module_documents;
CREATE POLICY "module_documents_write_staff" ON public.module_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "module_documents_select_members" ON public.module_documents;

-- 4. TENDERS (İHALELER)
DROP POLICY IF EXISTS "tenders_write_staff" ON public.tenders;
CREATE POLICY "tenders_write_staff" ON public.tenders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tenders_select_members" ON public.tenders;

-- 5. TENDER DOCUMENTS
DROP POLICY IF EXISTS "tender_documents_write_staff" ON public.tender_documents;
CREATE POLICY "tender_documents_write_staff" ON public.tender_documents
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "tender_documents_select_members" ON public.tender_documents;

-- 6. REAL ESTATES (GAYRİMENKULLER)
DROP POLICY IF EXISTS "real_estates_write_staff" ON public.real_estates;
CREATE POLICY "real_estates_write_staff" ON public.real_estates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "real_estates_select_members" ON public.real_estates;

-- 7. VEGA CARİLER
DROP POLICY IF EXISTS "vega_cariler_all_staff" ON public.vega_cariler;
CREATE POLICY "vega_cariler_all_staff" ON public.vega_cariler
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "vega_cariler_select_members" ON public.vega_cariler;

-- 8. VEGA CARİ HAREKETLER
DROP POLICY IF EXISTS "vega_cari_hareketler_all_staff" ON public.vega_cari_hareketler;
CREATE POLICY "vega_cari_hareketler_all_staff" ON public.vega_cari_hareketler
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "vega_cari_hareketler_select_members" ON public.vega_cari_hareketler;

-- 9. VEGA PERSONEL
DROP POLICY IF EXISTS "vega_personel_all_staff" ON public.vega_personel;
CREATE POLICY "vega_personel_all_staff" ON public.vega_personel
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "vega_personel_select_members" ON public.vega_personel;

-- 10. VEGA PERSONEL HAREKETLER
DROP POLICY IF EXISTS "vega_personel_hareketler_all_staff" ON public.vega_personel_hareketler;
CREATE POLICY "vega_personel_hareketler_all_staff" ON public.vega_personel_hareketler
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "vega_personel_hareketler_select_members" ON public.vega_personel_hareketler;
