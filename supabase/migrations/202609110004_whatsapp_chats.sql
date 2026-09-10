-- Migration for WhatsApp Web in-panel chats and messages
CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    chat_jid TEXT NOT NULL,
    name TEXT NOT NULL,
    phone_number TEXT,
    is_group BOOLEAN DEFAULT false,
    avatar_url TEXT,
    unread_count INTEGER DEFAULT 0,
    last_message_text TEXT,
    last_message_time TIMESTAMPTZ DEFAULT NOW(),
    is_pinned BOOLEAN DEFAULT false,
    participants JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_chat_org_jid UNIQUE (organization_id, chat_jid)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_org ON public.whatsapp_chats(organization_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_time ON public.whatsapp_chats(organization_id, last_message_time DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    message_id TEXT,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    is_from_me BOOLEAN DEFAULT false,
    message_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'image', 'document', 'audio', 'video'
    body TEXT,
    media_url TEXT,
    media_caption TEXT,
    status TEXT NOT NULL DEFAULT 'read', -- 'sent', 'delivered', 'read'
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_chat ON public.whatsapp_messages(chat_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_org ON public.whatsapp_messages(organization_id);

ALTER TABLE public.whatsapp_chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;

-- Seed realistic company chats
INSERT INTO public.whatsapp_chats (
    id,
    organization_id,
    chat_jid,
    name,
    phone_number,
    is_group,
    unread_count,
    last_message_text,
    last_message_time,
    is_pinned
) VALUES 
(
    'c1000000-0000-0000-0000-000000000001',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '120363028392810001@g.us',
    '🔧 Sanayi & Araç Bakım',
    NULL,
    true,
    2,
    '55 BEK 08 dorse fren balataları değişti, faturasını ekte gönderdim.',
    NOW() - INTERVAL '5 minutes',
    true
),
(
    'c1000000-0000-0000-0000-000000000002',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '120363028392810002@g.us',
    '⛽ Şoförler & Lojistik Grubu',
    NULL,
    true,
    0,
    '55 BEK 44 Samsun-Ankara seferi tamamlandı. 320 lt yakıt alındı.',
    NOW() - INTERVAL '25 minutes',
    true
),
(
    'c1000000-0000-0000-0000-000000000003',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '120363028392810003@g.us',
    '🥩 Mezbaha & Kesimhane Grubu',
    NULL,
    true,
    1,
    'Bugün 18 adet büyükbaş kesimi tamamlandı. Karkas kilo raporu hazır.',
    NOW() - INTERVAL '1 hour',
    true
),
(
    'c1000000-0000-0000-0000-000000000004',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '120363028392810004@g.us',
    '🏪 Şubeler & Günlük Satış Raporu',
    NULL,
    true,
    0,
    'Merkez şube gün sonu Z raporu ve POS dökümü alındı.',
    NOW() - INTERVAL '2 hours',
    false
),
(
    'c1000000-0000-0000-0000-000000000005',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '120363028392810005@g.us',
    '💰 Finans & Çek İstihbarat',
    NULL,
    true,
    0,
    'Yıldız Et firmasından gelen 485.000 TL çekin Findeks sorgusu yapıldı.',
    NOW() - INTERVAL '3 hours',
    false
),
(
    'c1000000-0000-0000-0000-000000000006',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '905321000001@s.whatsapp.net',
    'Ahmet Usta (Özkan Oto Sanayi)',
    '+90 532 100 0001',
    false,
    0,
    'Berkant Bey, yarın sabah tırın periyodik bakımını teslim edebiliriz.',
    NOW() - INTERVAL '4 hours',
    false
),
(
    'c1000000-0000-0000-0000-000000000007',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    '905332000002@s.whatsapp.net',
    'Mehmet Şoför (55 BEK 01)',
    '+90 533 200 0002',
    false,
    0,
    'Havza kantardan çıktım abi, 1 saate fabrikadayım.',
    NOW() - INTERVAL '6 hours',
    false
) ON CONFLICT (organization_id, chat_jid) DO NOTHING;

-- Seed realistic messages for Sanayi group
INSERT INTO public.whatsapp_messages (
    chat_id,
    organization_id,
    message_id,
    sender_name,
    sender_phone,
    is_from_me,
    message_type,
    body,
    media_url,
    media_caption,
    status,
    timestamp
) VALUES
(
    'c1000000-0000-0000-0000-000000000001',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'wmsg_01',
    'Ali Şoför',
    '+90 535 000 0001',
    false,
    'text',
    'Selamlar, 55 BEK 08 dorse fren balataları ötme yapıyordu, Özkan Sanayi servisine çektim aracı.',
    NULL,
    NULL,
    'read',
    NOW() - INTERVAL '45 minutes'
),
(
    'c1000000-0000-0000-0000-000000000001',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'wmsg_02',
    'Berkant Saray',
    '+90 532 999 0000',
    true,
    'text',
    'Tamamdır Ali, fatura ve parçaları kontrol edip faturasını buraya atın muhasebeye işleyelim.',
    NULL,
    NULL,
    'read',
    NOW() - INTERVAL '30 minutes'
),
(
    'c1000000-0000-0000-0000-000000000001',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'wmsg_03',
    'Özkan Usta',
    '+90 532 111 2233',
    false,
    'image',
    'Fatura ve işlem fişi görseli',
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop',
    '55 BEK 08 Ön ve arka fren balataları takımı değişti. Tutar: 14.850 TL',
    'read',
    NOW() - INTERVAL '5 minutes'
),
-- Seed messages for Şoförler & Lojistik
(
    'c1000000-0000-0000-0000-000000000002',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'wmsg_04',
    'Hasan Şoför',
    '+90 533 444 5566',
    false,
    'text',
    'İyi akşamlar, 55 BEK 44 araca Shell İstasyonundan 320 litre mazot aldım, km: 342.100',
    NULL,
    NULL,
    'read',
    NOW() - INTERVAL '25 minutes'
),
(
    'c1000000-0000-0000-0000-000000000002',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'wmsg_05',
    'Berkant Saray',
    '+90 532 999 0000',
    true,
    'text',
    'Eline sağlık Hasan, sisteme yakıt fişi olarak kaydedildi.',
    NULL,
    NULL,
    'read',
    NOW() - INTERVAL '20 minutes'
),
-- Seed messages for Mezbaha
(
    'c1000000-0000-0000-0000-000000000003',
    '13b8da90-27d1-440d-a8f4-eb50dadd6391',
    'wmsg_06',
    'Mezbaha Müdürü Kenan',
    '+90 536 777 8899',
    false,
    'text',
    'Bugünkü 18 adet büyükbaş kesim listesi ve karkas kilo dökümü hazır. Toplam karkas: 5.640 kg.',
    NULL,
    NULL,
    'read',
    NOW() - INTERVAL '1 hour'
);
