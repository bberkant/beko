-- Migration: 202609260001_tender_guarantee_letters.sql
-- Create tender_guarantee_letters table and seed 29 rows from Excel

CREATE TABLE IF NOT EXISTS public.tender_guarantee_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    issue_date DATE,
    institution_name TEXT NOT NULL,
    letter_type TEXT NOT NULL CHECK (letter_type IN ('KESİN', 'GEÇİCİ', 'AVANS')),
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    bank_name TEXT NOT NULL,
    phone_number TEXT,
    end_date DATE,
    company_name TEXT,
    status TEXT NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'iade_edildi', 'hukumsuz', 'kapandi')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_org ON public.tender_guarantee_letters(organization_id);
CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_end_date ON public.tender_guarantee_letters(end_date);
CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_status ON public.tender_guarantee_letters(status);
CREATE INDEX IF NOT EXISTS idx_tender_guarantee_letters_type ON public.tender_guarantee_letters(letter_type);

-- RLS configuration
ALTER TABLE public.tender_guarantee_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tender_guarantee_letters_select ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_select ON public.tender_guarantee_letters
  FOR SELECT USING (true);

DROP POLICY IF EXISTS tender_guarantee_letters_insert ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_insert ON public.tender_guarantee_letters
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS tender_guarantee_letters_update ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_update ON public.tender_guarantee_letters
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS tender_guarantee_letters_delete ON public.tender_guarantee_letters;
CREATE POLICY tender_guarantee_letters_delete ON public.tender_guarantee_letters
  FOR DELETE USING (true);

-- Seed 29 real guarantee letters
INSERT INTO public.tender_guarantee_letters (
    id, organization_id, issue_date, institution_name, letter_type, amount, bank_name, phone_number, end_date, company_name, status, notes
) VALUES
  ('00000000-0000-4000-a000-000000000001', '13b8da90-27d1-440d-a8f4-eb50dadd6391', NULL, 'ABALIOĞLU', 'KESİN', 500000, 'Albaraka Türk', NULL, NULL, 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000002', '13b8da90-27d1-440d-a8f4-eb50dadd6391', NULL, 'ABALIOĞLU', 'KESİN', 700000, 'Albaraka Türk', NULL, NULL, 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000003', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2025-12-04', 'AMASYA ÜNİVERSİTESİ (2026)', 'KESİN', 909762, 'Kuveyt Türk (Merzifon)', NULL, '2027-02-16', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000004', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2025-12-26', 'AMASYA ÖĞRETMENEVİ (2026)', 'KESİN', 164970, 'Kuveyt Türk (Merzifon)', '3582 181 84 51', '2026-07-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000005', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2025-12-29', 'HACETTEPE ERİŞKİN HASTANESİ (2026)', 'KESİN', 3447360, 'Kuveyt Türk (Merzifon)', '0312 305 11 05', '2027-02-05', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000006', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-02-04', 'MERZİFON İRFANLI LİSESİ', 'KESİN', 68820, 'Kuveyt Türk (Merzifon)', '0358 513 99 00', '2027-02-03', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000007', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-03-18', 'AMASYA ŞEHİT AHMET ÖZSOY İMAM HATİP LİSESİ', 'KESİN', 143880, 'Kuveyt Türk (Merzifon)', '0538 218 45 14', '2026-01-30', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000008', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-06-10', 'HİTİT ÜNİVERSİTESİ', 'KESİN', 459450, 'Kuveyt Türk (Merzifon)', '0364 219 21 20', '2027-03-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000009', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-06-10', 'AMASYA POLİSEVİ', 'KESİN', 359610, 'Kuveyt Türk (Merzifon)', '0358 218 10 73', '2027-02-01', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000010', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-06-04', 'ÇORUM L TİPİ CEZAEVİ', 'KESİN', 615951, 'Kuveyt Türk (Merzifon)', '0364 254 97 80', '2027-02-01', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000011', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-07-02', 'ÇORUM GÖĞÜS HASTALIKLARI HASYANESİ', 'KESİN', 305276, 'Kuveyt Türk (Merzifon)', '0364 225 58 68', '2027-03-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000012', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-07-10', 'ERZURUM İL SAĞLIK', 'KESİN', 4800000, 'Kuveyt Türk (Merzifon)', '0442 234 39 25', '2027-01-29', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000013', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-12', 'ERZURUM ATATÜRK ÜNİVERSİTESİ', 'KESİN', 2412240, 'Kuveyt Türk (Merzifon)', '04423447684-6724', '2027-06-30', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000014', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-13', 'HACETTEPE ÜNİVERSİTESİ MEMUR', 'KESİN', 701394, 'Kuveyt Türk (Merzifon)', '0312 305 17 79', '2027-02-26', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000015', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-20', 'MERZİFON KIZ İMAM HATİP LİSESİ', 'KESİN', 107925, 'Kuveyt Türk (Merzifon)', '0358 514 05 54', '2027-09-30', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000016', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-25', 'ONDOKUZ MAYIS TIP YENİ İHALE', 'KESİN', 2531700, 'Kuveyt Türk (Merzifon)', '0362 312 19 19', '2027-12-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000017', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-25', 'HACETTEPE ÜNİVERSİTESİ ÖĞRENCİ', 'KESİN', 1321680, 'Kuveyt Türk (Merzifon)', '0312 305 10 73', '2027-03-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000018', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-04', 'MAMAK BELEDİYESİ', 'KESİN', 357120, 'Kuveyt Türk (Merzifon)', '0312 550 70 77', '2026-12-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000019', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-04', 'ÇORUM HİTİT TURİZM LİSESİ', 'KESİN', 236487, 'Kuveyt Türk (Merzifon)', '0364 226 50 99', '2027-03-31', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000020', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-15', 'ANADOLU ÜNİVERSİTESİ', 'KESİN', 2256000, 'Kuveyt Türk (Merzifon)', '0222 320 68 58', '2027-03-22', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000021', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-17', 'VEZİRKÖPRÜ ŞAHİNKAYA LİSESİ', 'KESİN', 492480, 'Kuveyt Türk (Merzifon)', '0362 646 44 62', '2027-03-30', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000022', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-22', 'ONDOKUZMAYIS ÜNİVERSİTESİ', 'KESİN', 1197351, 'Kuveyt Türk (Merzifon)', '0362 457 60 67', '2027-07-30', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000023', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-04', 'MERZİFON İMAM HATİP LİSESİ', 'GEÇİCİ', 93375, 'Kuveyt Türk (Merzifon)', '0358 513 13 13', '2027-07-30', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000024', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-17', 'AMASYA GÜZEL SANATLAR LİSESİ (3. SIRA)', 'GEÇİCİ', 60000, 'Kuveyt Türk (Merzifon)', '0358 218 05 67', '2026-11-17', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000025', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-08-25', 'ONDOKUZMAYIS ÜNİVERSİTESİ (1 .SIRA)', 'GEÇİCİ', 750000, 'Denizbank (Merzifon)', '0362 457 60 67', '2026-12-23', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000026', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-04', 'MERZİFON İMAM HATİP LİSESİ (1. SIRA)', 'GEÇİCİ', 50000, 'Kuveyt Türk (Merzifon)', '0358 513 13 13', '2027-07-19', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000027', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-07', 'AMASYA TURİZM LİSESİ-TAVUK', 'GEÇİCİ', 70000, 'Kuveyt Türk (Merzifon)', '0358 242 01 01', '2026-02-22', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000028', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-16', 'AMASYA TURİZM LİSESİ-ET-YENİ OTEL (1. SIRA)', 'GEÇİCİ', 85000, 'Kuveyt Türk (Merzifon)', '0358 242 01 01', '2027-08-20', 'MARİF / ETİK ET', 'aktif', ''),
  ('00000000-0000-4000-a000-000000000029', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '2026-09-25', 'AMASYA TURİZM LİSESİ-ET-YENİ -OKUL', 'GEÇİCİ', 110000, 'Kuveyt Türk (Merzifon)', '0358 242 01 01', '2027-02-24', 'MARİF / ETİK ET', 'aktif', '')
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  issue_date = EXCLUDED.issue_date,
  institution_name = EXCLUDED.institution_name,
  letter_type = EXCLUDED.letter_type,
  amount = EXCLUDED.amount,
  bank_name = EXCLUDED.bank_name,
  phone_number = EXCLUDED.phone_number,
  end_date = EXCLUDED.end_date,
  company_name = EXCLUDED.company_name,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  updated_at = NOW();
