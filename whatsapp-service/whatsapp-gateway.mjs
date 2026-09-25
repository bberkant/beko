import makeWASocket, { 
  useMultiFileAuthState, 
  DisconnectReason, 
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import qrcode from 'qrcode';
import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Supabase Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zubhjybqzcpplultpsgt.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_IzgkpcZTArogrYSlNxpWBA_DWi2JTpG';
const ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

const AUTH_DIR = path.join(process.cwd(), 'whatsapp_auth_session');

// Smart Extraction Helpers
function extractPlate(text) {
  if (!text) return null;
  const match = text.match(/(?:0[1-9]|[1-7][0-9]|8[01])\s*[A-Z]{1,3}\s*[0-9]{2,4}/i);
  return match ? match[0].toUpperCase().replace(/\s+/g, ' ').trim() : null;
}

function extractAmount(text) {
  if (!text) return null;
  const match = text.match(/(?:₺|TL)?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)\s*(?:₺|TL)?/i);
  if (!match) return null;
  let raw = match[1].replace(/\./g, '').replace(',', '.');
  const num = parseFloat(raw);
  return isNaN(num) ? null : num;
}

function extractLiters(text) {
  if (!text) return null;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(?:lt|litre)/i);
  if (!match) return null;
  const num = parseFloat(match[1].replace(',', '.'));
  return isNaN(num) ? null : num;
}

function guessModule(groupName, text) {
  const combined = `${groupName || ''} ${text || ''}`.toLowerCase();
  if (combined.includes('sanayi') || combined.includes('bakım') || combined.includes('tamir') || combined.includes('usta') || combined.includes('servis')) {
    return 'sanayi';
  }
  if (combined.includes('yakıt') || combined.includes('mazot') || combined.includes('benzin') || combined.includes('petrol') || combined.includes('şoför') || combined.includes('lojistik')) {
    return 'yakit';
  }
  if (combined.includes('kasa') || combined.includes('z-rapor') || combined.includes('hasılat') || combined.includes('şube')) {
    return 'kasa';
  }
  if (combined.includes('çek') || combined.includes('senet') || combined.includes('vade') || combined.includes('keşideci')) {
    return 'cek';
  }
  if (combined.includes('kesim') || combined.includes('kantar') || combined.includes('dana') || combined.includes('düve') || combined.includes('karkas') || combined.includes('mezbaha')) {
    return 'kesim';
  }
  return 'diger';
}

async function updateGatewayStatus(payload) {
  try {
    const { error } = await supabase
      .from('whatsapp_gateway_sessions')
      .upsert({
        organization_id: ORG_ID,
        ...payload,
        updated_at: new Date().toISOString()
      }, { onConflict: 'organization_id' });

    if (error) console.error('Supabase session update error:', error.message);
  } catch (err) {
    console.error('Session update exception:', err);
  }
}

async function startGateway() {
  console.log('====================================================');
  console.log('  🚀 MEZBAHA SERVER - CANLI WHATSAPP GATEWAY SERVİSİ');
  console.log('====================================================');

  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ 
    version: [2, 3000, 1043857760], 
    isLatest: true 
  }));
  console.log(`📡 WhatsApp Web Protokol Sürümü: ${version.join('.')} (En güncel: ${isLatest})`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.windows('Desktop'),
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });

  sock.ev.on('creds.update', saveCreds);

  // Connection Updates (QR & Status)
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📲 [YENİ CANLI QR KODU ÜRETİLDİ] Lütfen web panelinden okutun:\n');
      const terminalQr = await qrcode.toString(qr, { type: 'terminal', small: true });
      console.log(terminalQr);

      const dataUrl = await qrcode.toDataURL(qr, { margin: 2, scale: 8 });
      await updateGatewayStatus({
        status: 'qr_ready',
        qr_code: dataUrl,
        qr_raw: qr,
        last_heartbeat: new Date().toISOString(),
        error_message: null
      });
    }

    if (connection === 'open') {
      const phoneNumber = sock.user?.id ? sock.user.id.split(':')[0] : 'Bağlı Hat';
      const userName = sock.user?.name || 'Şirket WhatsApp Hattı';
      console.log(`\n✅ [BAĞLANTI BAŞARILI] WhatsApp Gateway Aktif!`);
      console.log(`📱 Cihaz: ${userName} (${phoneNumber})\n`);

      await updateGatewayStatus({
        status: 'connected',
        phone_number: phoneNumber,
        device_name: `${userName} (Mezbaha Server 7/24)`,
        qr_code: null,
        qr_raw: null,
        last_heartbeat: new Date().toISOString(),
        error_message: null
      });
    }

    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error instanceof Boom)?.output?.statusCode || lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      console.log(`❌ [BAĞLANTI KESİLDİ] Kod: ${statusCode}, Oturum Silindi mi: ${isLoggedOut}`);

      if (isLoggedOut) {
        console.log('⚠️ Oturum kapatıldı, auth dizini temizleniyor...');
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        await updateGatewayStatus({
          status: 'disconnected',
          qr_code: null,
          qr_raw: null,
          last_heartbeat: new Date().toISOString(),
          error_message: 'Oturum kapatıldı. Yeniden QR okutulmalı.'
        });
        setTimeout(startGateway, 3000);
      } else {
        console.log('🔄 Gateway yeniden bağlanıyor...');
        setTimeout(startGateway, 2000);
      }
    }
  });

  // Incoming Messages Ingestion
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      const isGroup = remoteJid?.endsWith('@g.us');
      const senderPhone = msg.key.participant ? msg.key.participant.split('@')[0] : remoteJid?.split('@')[0];
      const pushName = msg.pushName || senderPhone || 'WhatsApp Kullanıcısı';

      let groupName = 'WhatsApp Doğrudan Mesaj';
      if (isGroup) {
        try {
          const groupMeta = await sock.groupMetadata(remoteJid);
          groupName = groupMeta.subject || 'WhatsApp Grubu';
        } catch {
          groupName = 'Şirket WhatsApp Grubu';
        }
      }

      const msgType = Object.keys(msg.message)[0];
      const isMedia = msgType === 'imageMessage' || msgType === 'documentMessage';
      const caption = msg.message?.imageMessage?.caption || msg.message?.documentMessage?.caption || msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      console.log(`📥 [YENİ MESAJ] [${groupName}] ${pushName}: ${caption || `[${msgType}]`}`);

      if (isMedia) {
        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }) }
          );

          const ext = msgType === 'imageMessage' ? 'jpg' : 'pdf';
          const filename = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const storagePath = `whatsapp-media/${filename}`;

          const { error: uploadError } = await supabase
            .storage
            .from('operations-documents')
            .upload(storagePath, buffer, {
              contentType: ext === 'jpg' ? 'image/jpeg' : 'application/pdf',
              upsert: true
            });

          let mediaUrl = `${SUPABASE_URL}/storage/v1/object/public/operations-documents/${storagePath}`;
          if (uploadError) {
            console.warn('Storage upload error (fallback URL used):', uploadError.message);
          }

          const suggestedModule = guessModule(groupName, caption);
          const plate = extractPlate(caption);
          const amount = extractAmount(caption);
          const quantity = extractLiters(caption);

          const extractedData = {
            plate: plate || undefined,
            amount: amount || undefined,
            total_amount: amount || undefined,
            quantity: quantity || undefined,
            date: new Date().toISOString().split('T')[0],
            description: caption || undefined,
            driver_name: pushName
          };

          const { error: insertError } = await supabase
            .from('whatsapp_incoming_media')
            .insert({
              organization_id: ORG_ID,
              group_name: groupName,
              sender_name: pushName,
              sender_phone: senderPhone,
              media_url: mediaUrl,
              media_type: ext === 'jpg' ? 'image' : 'document',
              caption: caption || null,
              suggested_module: suggestedModule,
              extracted_data: extractedData,
              status: 'pending'
            });

          if (!insertError) {
            console.log(`  ✨ [BELGE HAVUZUNA EKLENDİ] Modül: ${suggestedModule}, Plaka: ${plate || '-'}, Tutar: ${amount || '-'}`);
          }
        } catch (mediaErr) {
          console.error('Media download/process error:', mediaErr);
        }
      } else if (caption && caption.length > 5) {
        const isTaskCandidate = caption.toLowerCase().includes('yap') || 
                                caption.toLowerCase().includes('gönder') || 
                                caption.toLowerCase().includes('kontrol') || 
                                caption.toLowerCase().includes('teslim') || 
                                caption.toLowerCase().includes('hazırla');

        if (isTaskCandidate || isGroup) {
          try {
            await supabase
              .from('whatsapp_tasks')
              .insert({
                organization_id: ORG_ID,
                group_name: groupName,
                title: `${groupName} Talimatı`,
                description: caption,
                original_message: caption,
                sender_name: pushName,
                priority: caption.toLowerCase().includes('acil') ? 'urgent' : 'medium',
                category: guessModule(groupName, caption) === 'sanayi' ? 'arac_bakim' : 'sevkiyat',
                status: 'todo'
              });
            console.log(`  📋 [GÖREV PANOSUNA EKLENDİ] ${caption.substring(0, 40)}...`);
          } catch (taskErr) {
            console.error('Task insert error:', taskErr);
          }
        }
      }
    }
  });

  // Heartbeat loop every 15s to keep last_heartbeat fresh
  setInterval(async () => {
    try {
      if (sock.user?.id) {
        await updateGatewayStatus({
          status: 'connected',
          last_heartbeat: new Date().toISOString()
        });
      } else {
        await updateGatewayStatus({
          last_heartbeat: new Date().toISOString()
        });
      }
    } catch {
      // Background heartbeat silent ignore
    }
  }, 15000);
}

startGateway().catch(console.error);
