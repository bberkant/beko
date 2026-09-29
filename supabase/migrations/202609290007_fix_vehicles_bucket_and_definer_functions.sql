-- ==============================================================================
-- DARS ERP / AMASYA ET - FINAL SECURITY & FUNCTION ACCESS HARDENING
-- 1. vehicles ve vehicle_expenses tablolarındaki çift kuralı kaldırır.
-- 2. kasa-excel-yedekleri storage bucket'ını güvenliğe alır (anonim listeleme kapatılır).
-- 3. SECURITY DEFINER fonksiyonlarının anonim erişimini kapatıp authenticated'a kilitler.
-- ==============================================================================

-- 1. VEHICLES & VEHICLE EXPENSES (Çift kural temizliği)
DROP POLICY IF EXISTS "vehicles_select_members" ON public.vehicles;
DROP POLICY IF EXISTS "vehicles_write_staff" ON public.vehicles;
CREATE POLICY "vehicles_write_staff" ON public.vehicles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicle_expenses_select_members" ON public.vehicle_expenses;
DROP POLICY IF EXISTS "vehicle_expenses_write_staff" ON public.vehicle_expenses;
CREATE POLICY "vehicle_expenses_write_staff" ON public.vehicle_expenses
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 2. KASA EXCEL YEDEKLERİ BUCKET GÜVENLİĞİ (Dışarıya açık listeleme kapatılıyor)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'kasa-excel-yedekleri';

DROP POLICY IF EXISTS "kasa_excel_bucket_select" ON storage.objects;
CREATE POLICY "kasa_excel_bucket_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'kasa-excel-yedekleri');

DROP POLICY IF EXISTS "kasa_excel_bucket_insert" ON storage.objects;
CREATE POLICY "kasa_excel_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'kasa-excel-yedekleri');

DROP POLICY IF EXISTS "kasa_excel_bucket_update" ON storage.objects;
CREATE POLICY "kasa_excel_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'kasa-excel-yedekleri');


-- 3. SECURITY DEFINER FONKSİYONLARININ ANONİM ERİŞİMİNİ KAPATMA
REVOKE EXECUTE ON FUNCTION public.calculate_kesim_fields() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.calculate_kesim_fields() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_super_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_activity_changes() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.log_activity_changes() TO authenticated;
