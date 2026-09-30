-- ==============================================================================
-- DARS ERP / AMASYA ET - SECURITY & POLICY CLEANUP
-- 1. "Function Search Path Mutable" uyarılarını çözer (search_path sabitlenir).
-- 2. "Multiple Permissive Policies" uyarılarını çözer (Çakışan politikalar ayrıştırılır).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- A. FONKSİYON ARAMA YOLU (SEARCH PATH) GÜVENLİĞİ
-- ------------------------------------------------------------------------------
ALTER FUNCTION public.calculate_kesim_fields() SET search_path = public, pg_temp;
ALTER FUNCTION public.log_activity_changes() SET search_path = public, pg_temp;
ALTER FUNCTION public.is_admin_or_super_admin(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_create_user(text, text, text, text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.admin_update_user(uuid, text, text, text) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.preserve_ebs_checks_customizations() SET search_path = public, pg_temp;


-- ------------------------------------------------------------------------------
-- B. ÇAKIŞAN İZİN POLİTİKALARI (MULTIPLE PERMISSIVE POLICIES) OPTİMİZASYONU
-- ------------------------------------------------------------------------------

-- 1. cashbox_gunluk_hesap_reports: Çift SELECT çakışmasını giderip tek kurala bağlama
DROP POLICY IF EXISTS "cashbox_gunluk_hesap_select_all" ON public.cashbox_gunluk_hesap_reports;
DROP POLICY IF EXISTS "cashbox_gunluk_hesap_write_all" ON public.cashbox_gunluk_hesap_reports;

CREATE POLICY "cashbox_gunluk_hesap_auth_access" ON public.cashbox_gunluk_hesap_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. main_cashbox_transactions: Yazma kuralını SELECT'ten ayırarak çift kuralı önleme
DROP POLICY IF EXISTS "main_cashbox_transactions_write_staff" ON public.main_cashbox_transactions;

CREATE POLICY "main_cashbox_transactions_insert_staff" ON public.main_cashbox_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

CREATE POLICY "main_cashbox_transactions_update_staff" ON public.main_cashbox_transactions
  FOR UPDATE
  TO authenticated
  USING (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  WITH CHECK (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

CREATE POLICY "main_cashbox_transactions_delete_staff" ON public.main_cashbox_transactions
  FOR DELETE
  TO authenticated
  USING (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

-- 3. organization_members: Yönetici kurallarını INSERT/UPDATE/DELETE olarak ayrıştırma
DROP POLICY IF EXISTS "members_manage_admin" ON public.organization_members;

CREATE POLICY "members_insert_admin" ON public.organization_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_org_role(organization_id, array['admin']));

CREATE POLICY "members_update_admin" ON public.organization_members
  FOR UPDATE
  TO authenticated
  USING (public.has_org_role(organization_id, array['admin']))
  WITH CHECK (public.has_org_role(organization_id, array['admin']));

CREATE POLICY "members_delete_admin" ON public.organization_members
  FOR DELETE
  TO authenticated
  USING (public.has_org_role(organization_id, array['admin']));

-- 4. bank_transactions: Yazma kurallarını ayrıştırma
DROP POLICY IF EXISTS "bank_transactions_write_staff" ON public.bank_transactions;

CREATE POLICY "bank_transactions_insert_staff" ON public.bank_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

CREATE POLICY "bank_transactions_update_staff" ON public.bank_transactions
  FOR UPDATE
  TO authenticated
  USING (public.has_org_role(organization_id, array['admin','muhasebe','finans']))
  WITH CHECK (public.has_org_role(organization_id, array['admin','muhasebe','finans']));

CREATE POLICY "bank_transactions_delete_staff" ON public.bank_transactions
  FOR DELETE
  TO authenticated
  USING (public.has_org_role(organization_id, array['admin','muhasebe','finans']));
