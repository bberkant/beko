-- Group Rules
INSERT INTO public.whatsapp_group_rules (organization_id, group_name, default_module, default_category, auto_ocr, is_active)
VALUES 
  ('13b8da90-27d1-440d-a8f4-eb50dadd6391', 'Sanayi & Araç Bakım Grubu', 'sanayi', 'arac_bakim', true, true),
  ('13b8da90-27d1-440d-a8f4-eb50dadd6391', 'Şoförler & Lojistik Grubu', 'yakit', 'sevkiyat', true, true),
  ('13b8da90-27d1-440d-a8f4-eb50dadd6391', 'Mezbaha & Kesimhane Grubu', 'kesim', 'kesim', true, true),
  ('13b8da90-27d1-440d-a8f4-eb50dadd6391', 'Şubeler & Günlük Satış', 'kasa', 'sube', true, true),
  ('13b8da90-27d1-440d-a8f4-eb50dadd6391', 'Finans & Tahsilat Grubu', 'cek', 'muhasebe', true, true)
ON CONFLICT (organization_id, group_name) DO NOTHING;

-- Incoming Media (Fişler / Faturalar)
INSERT INTO public.whatsapp_incoming_media 
(organization_id, group_name, sender_name, sender_phone, media_url, media_type, caption, suggested_module, extracted_data, status, created_at)
VALUES
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Sanayi & Araç Bakım Grubu',
  'Ali Usta (Sanayi)',
  '0533 456 78 90',
  'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=800&auto=format&fit=crop&q=60',
  'image',
  '05 AA 567 plakalı kamyonun ön fren balataları ve disk tornası yapıldı. Fatura ektedir.',
  'sanayi',
  '{plate: 05 AA 567, amount: 8200, supplier: Özdemir Torna & Fren Servisi, invoice_no: OZD20260000142, date: 2026-09-10, description: Ön fren balata değişimi ve disk tornası}'::jsonb,
  'pending',
  NOW() - INTERVAL '25 minutes'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Şoförler & Lojistik Grubu',
  'Ahmet Şoför (05 K 1234)',
  '0542 111 22 33',
  'https://images.unsplash.com/photo-1527018601619-a508a2be00cd?w=800&auto=format&fit=crop&q=60',
  'image',
  'Merzifon sevkiyatı dönüşü Amasya çıkışı Shell full depo mazot alındı.',
  'yakit',
  '{plate: 05 K 1234, amount: 3450, quantity: 78.5, unit_price: 43.95, station: Shell Amasya Giriş, driver_name: Ahmet Yılmaz, km: 248650, date: 2026-09-10}'::jsonb,
  'pending',
  NOW() - INTERVAL '1 hour'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Mezbaha & Kesimhane Grubu',
  'Murat Kantarcı',
  '0530 999 88 77',
  'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=60',
  'image',
  'Hasan Demir Besi Çiftliği 12 adet dana canlı kantar fişi ektedir.',
  'kesim',
  '{supplier: Hasan Demir, head_count: 12, carcass_weight: 3840, price_per_kg: 385, total_amount: 1478400, date: 2026-09-10, animal_type: Dana}'::jsonb,
  'pending',
  NOW() - INTERVAL '2 hours'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Finans & Tahsilat Grubu',
  'Serkan Tahsilat',
  '0535 222 33 44',
  'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=60',
  'image',
  'Öz Kasap Ahmet Beyden 150.000 TL Akbank takas çeki alındı.',
  'cek',
  '{bank_name: Akbank, amount: 150000, due_date: 2026-10-15, drawer: Öz Kasap - Ahmet Öz, check_no: 7849102, branch: Amasya Merkez}'::jsonb,
  'pending',
  NOW() - INTERVAL '4 hours'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Şubeler & Günlük Satış',
  'Can Müdür (İlkadım Şube)',
  '0544 777 66 55',
  'https://images.unsplash.com/photo-1556742049-0a67e557b63f?w=800&auto=format&fit=crop&q=60',
  'image',
  'İlkadım Şube dünkü gün sonu Z Raporu ve POS slipleri.',
  'kasa',
  '{branch: İlkadım Şube, cash_total: 42600, pos_total: 89200, total_amount: 131800, date: 2026-09-09, category: Günlük Şube Cirosu}'::jsonb,
  'processed',
  NOW() - INTERVAL '1 day'
);

-- Tasks (Grup Görevleri)
INSERT INTO public.whatsapp_tasks
(organization_id, group_name, title, description, original_message, sender_name, assigned_to, priority, category, status, due_date, created_at)
VALUES
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Mezbaha & Kesimhane Grubu',
  'Yarın Merzifon Şubeye 6 Karkas Et Sevk Edilecek',
  'Mezbaha soğuk hava deposundan 6 adet karkas saat 07:00 da araca yüklenecek.',
  'Yarın sabah erken saatte Merzifon şubeye 6 karkas et gidecek, aracı 07:00 da hazır edin.',
  'Hasan Bey (Yönetim)',
  'Ahmet Şoför (05 K 1234)',
  'high',
  'sevkiyat',
  'todo',
  CURRENT_DATE + INTERVAL '1 day',
  NOW() - INTERVAL '30 minutes'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Sanayi & Araç Bakım Grubu',
  '05 AA 567 Kamyonun Muayene Randevusu Alınacak',
  'TÜVTÜRK muayene süresi bitiyor, ön kontroller tamamlandıktan sonra randevu oluşturulacak.',
  '05 AA 567 nin muayene günü yaklaşıyor, frenler yapıldı yarın randevu alın.',
  'Ali Usta',
  'Lojistik Sorumlusu',
  'medium',
  'arac_bakim',
  'in_progress',
  CURRENT_DATE + INTERVAL '3 days',
  NOW() - INTERVAL '2 hours'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Şubeler & Günlük Satış',
  'Sucukhane Yeni Baharat ve Ambalaj Siparişi',
  'Sucuk üretim hattı için sarımsak, baharat karışımı ve vakum poşeti siparişi verilecek.',
  'Sucukhane için acil ambalaj ve baharat eksiği var, tedarikçiye sipariş geçilsin.',
  'Sucukhane Şefi',
  'Satınalma / Muhasebe',
  'urgent',
  'sube',
  'todo',
  CURRENT_DATE,
  NOW() - INTERVAL '1 hour'
),
(
  '13b8da90-27d1-440d-a8f4-eb50dadd6391',
  'Finans & Tahsilat Grubu',
  'Önder Aksoy Kasap ile Çek Mutabakatı',
  'Eylül ayı teslimatları ve alınan çeklerin hesap mutabakatı kapatılacak.',
  'Önder Aksoy Kasap ile hesapları bağlayalım, kalan bakiyeyi netleştirelim.',
  'Finans Müdürü',
  'Muhasebe',
  'medium',
  'muhasebe',
  'completed',
  CURRENT_DATE - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);
