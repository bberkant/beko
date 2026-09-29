-- ==============================================================================
-- DARS ERP / AMASYA ET - PERFORMANCE & RLS INITPLAN OPTIMIZATION
-- Supabase Performance Advisor: "Auth RLS Initialization Plan" uyarılarını çözer.
-- auth.uid() ve auth.role() fonksiyonlarını (SELECT auth.uid()) biçiminde InitPlan
-- olarak önbellekleyerek her satırda tekrar tekrar çalışmasını engeller,
-- Disk IOPS ve CPU tüketimini minimuma indirir.
-- ==============================================================================

-- 1. PROFILES (Kullanıcı Profilleri)
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;

CREATE POLICY "profiles_select_self" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_update_self" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- 2. ACTIVITY LOGS (Aktivite Günlükleri)
DROP POLICY IF EXISTS "activity_logs_admin_select" ON public.activity_logs;

CREATE POLICY "activity_logs_admin_select" ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = activity_logs.organization_id
        AND organization_members.user_id = (SELECT auth.uid())
        AND organization_members.role IN ('admin', 'super_admin')
    )
  );

-- 3. SANAYİ GİDERLERİ
DROP POLICY IF EXISTS "Users can manage sanayi_giderleri of their org" ON public.sanayi_giderleri;

CREATE POLICY "Users can manage sanayi_giderleri of their org" ON public.sanayi_giderleri
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
    )
    OR (SELECT auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
    )
    OR (SELECT auth.uid()) IS NOT NULL
  );

-- 4. ARAÇ YAKIT GİRİŞLERİ (vehicle_fuel_entries)
DROP POLICY IF EXISTS "Users can manage vehicle_fuel_entries of their org" ON public.vehicle_fuel_entries;

CREATE POLICY "Users can manage vehicle_fuel_entries of their org" ON public.vehicle_fuel_entries
  FOR ALL
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
    )
    OR (SELECT auth.uid()) IS NOT NULL
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = (SELECT auth.uid())
    )
    OR (SELECT auth.uid()) IS NOT NULL
  );

-- 5. FİNDEKS ÇEK İSTİHBARATLARI & AYARLARI
DROP POLICY IF EXISTS "findeks_inquiries_auth_access" ON public.findeks_check_inquiries;
CREATE POLICY "findeks_inquiries_auth_access" ON public.findeks_check_inquiries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "findeks_settings_auth_access" ON public.findeks_settings;
CREATE POLICY "findeks_settings_auth_access" ON public.findeks_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. WHATSAPP TABLOLARI
DROP POLICY IF EXISTS "whatsapp_chats_auth_access" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_auth_access" ON public.whatsapp_chats
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_messages_auth_access" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_auth_access" ON public.whatsapp_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_sessions_auth_access" ON public.whatsapp_gateway_sessions;
CREATE POLICY "whatsapp_sessions_auth_access" ON public.whatsapp_gateway_sessions
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. POS RAPORLARI
DROP POLICY IF EXISTS "pos_reports_auth_access" ON public.pos_reports;
CREATE POLICY "pos_reports_auth_access" ON public.pos_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. ŞİRKET FATURALARI (company_bills & company_bill_invoices)
DROP POLICY IF EXISTS "company_bills_auth_access" ON public.company_bills;
CREATE POLICY "company_bills_auth_access" ON public.company_bills
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "company_bill_invoices_auth_access" ON public.company_bill_invoices;
CREATE POLICY "company_bill_invoices_auth_access" ON public.company_bill_invoices
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
