-- ==============================================================================
-- DARS ERP / AMASYA ET - GÜVENLİK SIKILAŞTIRMA (RLS HARDENING)
-- Bu betik dışarıdan anonim erişime açık olan 8 kritik tabloyu güvene alır.
-- Sisteme giriş yapmış (authenticated) 9-10 şirket kullanıcısının erişimini KESMEZ.
-- ==============================================================================

-- 1. FİNDEKS ÇEK İSTİHBARATLARI & AYARLARI
ALTER TABLE public.findeks_check_inquiries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "findeks_inquiries_auth_access" ON public.findeks_check_inquiries;
CREATE POLICY "findeks_inquiries_auth_access" ON public.findeks_check_inquiries
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organization_id) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_org_member(organization_id) OR auth.role() = 'authenticated');

ALTER TABLE public.findeks_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "findeks_settings_auth_access" ON public.findeks_settings;
CREATE POLICY "findeks_settings_auth_access" ON public.findeks_settings
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organization_id) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_org_member(organization_id) OR auth.role() = 'authenticated');

-- 2. WHATSAPP MESAJLAŞMA & OTURUMLAR
ALTER TABLE public.whatsapp_chats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_chats_auth_access" ON public.whatsapp_chats;
CREATE POLICY "whatsapp_chats_auth_access" ON public.whatsapp_chats
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organization_id) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_org_member(organization_id) OR auth.role() = 'authenticated');

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_messages_auth_access" ON public.whatsapp_messages;
CREATE POLICY "whatsapp_messages_auth_access" ON public.whatsapp_messages
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organization_id) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_org_member(organization_id) OR auth.role() = 'authenticated');

ALTER TABLE public.whatsapp_gateway_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "whatsapp_sessions_auth_access" ON public.whatsapp_gateway_sessions;
CREATE POLICY "whatsapp_sessions_auth_access" ON public.whatsapp_gateway_sessions
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organization_id) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_org_member(organization_id) OR auth.role() = 'authenticated');

-- 3. POS RAPORLARI
ALTER TABLE public.pos_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pos_reports_auth_access" ON public.pos_reports;
CREATE POLICY "pos_reports_auth_access" ON public.pos_reports
  FOR ALL
  TO authenticated
  USING (public.is_org_member(organization_id) OR auth.role() = 'authenticated')
  WITH CHECK (public.is_org_member(organization_id) OR auth.role() = 'authenticated');

-- 4. ŞİRKET FATURALARI & FATURA KALEMLERİ
ALTER TABLE public.company_bills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_bills_all" ON public.company_bills;
DROP POLICY IF EXISTS "company_bills_auth_access" ON public.company_bills;
CREATE POLICY "company_bills_auth_access" ON public.company_bills
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.company_bill_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_bill_invoices_all" ON public.company_bill_invoices;
DROP POLICY IF EXISTS "company_bill_invoices_auth_access" ON public.company_bill_invoices;
CREATE POLICY "company_bill_invoices_auth_access" ON public.company_bill_invoices
  FOR ALL
  TO authenticated
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
