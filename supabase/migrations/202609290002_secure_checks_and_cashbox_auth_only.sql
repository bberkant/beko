-- ==============================================================================
-- DARS ERP / AMASYA ET - ÇEKLER, KASA VE BANKA HESAPLARI GÜVENLİĞİ
-- Bu betik Çekler, Banka Hesapları ve Kasa tablolarını anonim (dış) dünyaya kapatır.
-- Sadece giriş yapmış (authenticated) şirket personeline ve ofis sync servisine izin verir.
-- ==============================================================================

-- 1. ÇEKLER VE SENETLER (ebs_checks)
ALTER TABLE public.ebs_checks ENABLE ROW LEVEL SECURITY;
-- Eski açık / anonim politikaları temizle
DROP POLICY IF EXISTS "ebs_checks_select_all" ON public.ebs_checks;
DROP POLICY IF EXISTS "ebs_checks_allow_all" ON public.ebs_checks;
DROP POLICY IF EXISTS "ebs_checks_select_members" ON public.ebs_checks;
DROP POLICY IF EXISTS "ebs_checks_all_staff" ON public.ebs_checks;
DROP POLICY IF EXISTS "ebs_checks_auth_access" ON public.ebs_checks;

-- Yalnızca oturum açmış kullanıcılara ve ofis sync servisine tam yetki ver:
CREATE POLICY "ebs_checks_auth_access" ON public.ebs_checks
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 2. BANKA HESAPLARI (bank_accounts)
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_accounts_select_all" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select_members" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_write_staff" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_auth_access" ON public.bank_accounts;

CREATE POLICY "bank_accounts_auth_access" ON public.bank_accounts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. KASA GİRİŞ-ÇIKIŞ RAPORLARI (cashbox_giris_cikis_reports)
ALTER TABLE public.cashbox_giris_cikis_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cashbox_giris_cikis_select_all" ON public.cashbox_giris_cikis_reports;
DROP POLICY IF EXISTS "cashbox_giris_cikis_write_all" ON public.cashbox_giris_cikis_reports;
DROP POLICY IF EXISTS "cashbox_giris_cikis_auth_access" ON public.cashbox_giris_cikis_reports;

CREATE POLICY "cashbox_giris_cikis_auth_access" ON public.cashbox_giris_cikis_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 4. ANA KASA GÜNLÜK RAPORLARI (cashbox_ana_kasa_reports)
ALTER TABLE public.cashbox_ana_kasa_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cashbox_ana_kasa_select_all" ON public.cashbox_ana_kasa_reports;
DROP POLICY IF EXISTS "cashbox_ana_kasa_write_all" ON public.cashbox_ana_kasa_reports;
DROP POLICY IF EXISTS "cashbox_ana_kasa_auth_access" ON public.cashbox_ana_kasa_reports;

CREATE POLICY "cashbox_ana_kasa_auth_access" ON public.cashbox_ana_kasa_reports
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
