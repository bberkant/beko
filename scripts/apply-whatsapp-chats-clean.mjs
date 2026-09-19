import { execSync } from 'child_process';
import fs from 'fs';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';
const npxPath = 'C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npx-cli.js';

const sqlList = [
  `CREATE TABLE IF NOT EXISTS public.whatsapp_chats (
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_whatsapp_chat_org_jid UNIQUE (organization_id, chat_jid)
  );`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_org ON public.whatsapp_chats(organization_id);`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_time ON public.whatsapp_chats(organization_id, last_message_time DESC);`,
  `CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES public.whatsapp_chats(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    message_id TEXT,
    sender_name TEXT NOT NULL,
    sender_phone TEXT,
    is_from_me BOOLEAN DEFAULT false,
    message_type TEXT NOT NULL DEFAULT 'text',
    body TEXT,
    media_url TEXT,
    media_caption TEXT,
    status TEXT NOT NULL DEFAULT 'read',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_chat ON public.whatsapp_messages(chat_id, timestamp ASC);`,
  `CREATE INDEX IF NOT EXISTS idx_whatsapp_msg_org ON public.whatsapp_messages(organization_id);`,
  `ALTER TABLE public.whatsapp_chats DISABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.whatsapp_messages DISABLE ROW LEVEL SECURITY;`,
  `INSERT INTO public.whatsapp_chats (id, organization_id, chat_jid, name, phone_number, is_group, unread_count, last_message_text, last_message_time, is_pinned) VALUES 
  ('c1000000-0000-0000-0000-000000000001', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '120363028392810001@g.us', 'Sanayi ve Arac Bakim', NULL, true, 2, '55 BEK 08 dorse fren balatalari degisti, faturasini ekte gonderdim.', NOW() - INTERVAL '5 minutes', true),
  ('c1000000-0000-0000-0000-000000000002', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '120363028392810002@g.us', 'Soforler ve Lojistik Grubu', NULL, true, 0, '55 BEK 44 Samsun-Ankara seferi tamamlandi. 320 lt yakit alindi.', NOW() - INTERVAL '25 minutes', true),
  ('c1000000-0000-0000-0000-000000000003', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '120363028392810003@g.us', 'Mezbaha ve Kesimhane Grubu', NULL, true, 1, 'Bugun 18 adet buyukbas kesimi tamamlandi. Karkas kilo raporu hazir.', NOW() - INTERVAL '1 hour', true),
  ('c1000000-0000-0000-0000-000000000004', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '120363028392810004@g.us', 'Subeler ve Gunluk Satis Raporu', NULL, true, 0, 'Merkez sube gun sonu Z raporu ve POS dokumu alindi.', NOW() - INTERVAL '2 hours', false),
  ('c1000000-0000-0000-0000-000000000005', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '120363028392810005@g.us', 'Finans ve Cek Istihbarat', NULL, true, 0, 'Yildiz Et firmasindan gelen 485.000 TL cekin Findeks sorgusu yapildi.', NOW() - INTERVAL '3 hours', false),
  ('c1000000-0000-0000-0000-000000000006', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '905321000001@s.whatsapp.net', 'Ahmet Usta (Ozkan Oto Sanayi)', '+90 532 100 0001', false, 0, 'Berkant Bey, yarin sabah tirin periyodik bakimini teslim edebiliriz.', NOW() - INTERVAL '4 hours', false),
  ('c1000000-0000-0000-0000-000000000007', '13b8da90-27d1-440d-a8f4-eb50dadd6391', '905332000002@s.whatsapp.net', 'Mehmet Sofor (55 BEK 01)', '+90 533 200 0002', false, 0, 'Havza kantardan ciktim abi, 1 saate fabrikadayim.', NOW() - INTERVAL '6 hours', false)
  ON CONFLICT (organization_id, chat_jid) DO NOTHING;`,
  `INSERT INTO public.whatsapp_messages (chat_id, organization_id, message_id, sender_name, sender_phone, is_from_me, message_type, body, media_url, media_caption, status, timestamp) VALUES
  ('c1000000-0000-0000-0000-000000000001', '13b8da90-27d1-440d-a8f4-eb50dadd6391', 'wmsg_01', 'Ali Sofor', '+90 535 000 0001', false, 'text', 'Selamlar, 55 BEK 08 dorse fren balatalari otme yapiyordu, Ozkan Sanayi servisine cektim araci.', NULL, NULL, 'read', NOW() - INTERVAL '45 minutes'),
  ('c1000000-0000-0000-0000-000000000001', '13b8da90-27d1-440d-a8f4-eb50dadd6391', 'wmsg_02', 'Berkant Saray', '+90 532 999 0000', true, 'text', 'Tamamdir Ali, fatura ve parcalari kontrol edip faturasini buraya atin muhasebeye isleyelim.', NULL, NULL, 'read', NOW() - INTERVAL '30 minutes'),
  ('c1000000-0000-0000-0000-000000000001', '13b8da90-27d1-440d-a8f4-eb50dadd6391', 'wmsg_03', 'Ozkan Usta', '+90 532 111 2233', false, 'image', 'Fatura ve islem fisi gorseli', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop', '55 BEK 08 On ve arka fren balatalari takimi degisti. Tutar: 14.850 TL', 'read', NOW() - INTERVAL '5 minutes'),
  ('c1000000-0000-0000-0000-000000000002', '13b8da90-27d1-440d-a8f4-eb50dadd6391', 'wmsg_04', 'Hasan Sofor', '+90 533 444 5566', false, 'text', 'Iyi aksamlar, 55 BEK 44 araca Shell Istasyonundan 320 litre mazot aldim, km: 342.100', NULL, NULL, 'read', NOW() - INTERVAL '25 minutes'),
  ('c1000000-0000-0000-0000-000000000002', '13b8da90-27d1-440d-a8f4-eb50dadd6391', 'wmsg_05', 'Berkant Saray', '+90 532 999 0000', true, 'text', 'Eline saglik Hasan, sisteme yakit fisi olarak kaydedildi.', NULL, NULL, 'read', NOW() - INTERVAL '20 minutes'),
  ('c1000000-0000-0000-0000-000000000003', '13b8da90-27d1-440d-a8f4-eb50dadd6391', 'wmsg_06', 'Mezbaha Muduru Kenan', '+90 536 777 8899', false, 'text', 'Bugunku 18 adet buyukbas kesim listesi ve karkas kilo dokumu hazir. Toplam karkas: 5.640 kg.', NULL, NULL, 'read', NOW() - INTERVAL '1 hour');`
];

for (const sql of sqlList) {
  try {
    const clean = sql.replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    const cmd = `node "${npxPath}" supabase db query --linked "${clean.replace(/"/g, '\\"')}"`;
    const out = execSync(cmd, { encoding: 'utf-8' });
    console.log('Success:', clean.substring(0, 45) + '...', out.trim());
  } catch (err) {
    console.error('Error:', err.stdout || err.message);
  }
}
