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

// Sync all participating real WhatsApp groups into whatsapp_chats table
async function syncAllGroups(sock) {
  try {
    console.log('🔄 [GRUP SENKRONİZASYONU] WhatsApp grupları taranıyor...');
    const groups = await sock.groupFetchAllParticipating();
    const groupCount = Object.keys(groups).length;
    console.log(`📋 [GRUP BULUNDU] Toplam ${groupCount} adet WhatsApp grubu bulundu.`);

    for (const [jid, meta] of Object.entries(groups)) {
      const groupName = meta.subject || 'WhatsApp Grubu';
      
      const { error } = await supabase
        .from('whatsapp_chats')
        .upsert({
          organization_id: ORG_ID,
          chat_jid: jid,
          name: groupName,
          is_group: true,
          last_message_text: meta.desc || 'Grup senkronize edildi',
          last_message_time: new Date().toISOString(),
          participants: (meta.participants || []).map(p => ({ id: p.id, admin: p.admin }))
        }, { onConflict: 'organization_id,chat_jid' });

      if (error) {
        console.warn(`  ⚠️ Grup kaydedilemedi (${groupName}):`, error.message);
      } else {
        console.log(`  ✅ Grup Aktarıldı: ${groupName}`);
      }
    }
  } catch (err) {
    console.error('❌ Grup senkronizasyon hatası:', err.message);
  }
}

async function startGateway() {
  console.log('====================================================');
  console.log('  🚀 BEKO ERP - CANLI WHATSAPP GATEWAY SERVİSİ');
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

      // Eşleşme sağlandığı an kullanıcının gerçek gruplarını çek
      await syncAllGroups(sock);
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
      if (!msg.message) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast') continue;

      const isGroup = remoteJid.endsWith('@g.us');
      const isFromMe = Boolean(msg.key.fromMe);
      const senderPhone = isGroup 
        ? (msg.key.participant ? msg.key.participant.split('@')[0] : '') 
        : remoteJid.split('@')[0];
      const pushName = msg.pushName || senderPhone || (isFromMe ? 'Siz' : 'WhatsApp Kullanıcısı');

      let groupName = null;
      if (isGroup) {
        try {
          const groupMeta = await sock.groupMetadata(remoteJid);
          groupName = groupMeta.subject || 'WhatsApp Grubu';
        } catch {
          groupName = 'WhatsApp Grubu';
        }
      }

      const msgType = Object.keys(msg.message)[0];
      const isMedia = msgType === 'imageMessage' || msgType === 'documentMessage';
      const text = msg.message?.conversation || 
                   msg.message?.extendedTextMessage?.text || 
                   msg.message?.imageMessage?.caption || 
                   msg.message?.documentMessage?.caption || 
                   (isMedia ? (msgType === 'imageMessage' ? '📷 Görsel' : '📄 Belge') : '');

      console.log(`📥 [YENİ MESAJ] [${groupName || pushName}] ${pushName}: ${text}`);

      let mediaUrl = null;
      let ext = 'jpg';

      if (isMedia) {
        try {
          const buffer = await downloadMediaMessage(
            msg,
            'buffer',
            {},
            { logger: pino({ level: 'silent' }) }
          );

          ext = msgType === 'imageMessage' ? 'jpg' : 'pdf';
          const filename = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
          const storagePath = `whatsapp-media/${filename}`;

          const { error: uploadError } = await supabase
            .storage
            .from('operations-documents')
            .upload(storagePath, buffer, {
              contentType: ext === 'jpg' ? 'image/jpeg' : 'application/pdf',
              upsert: true
            });

          if (!uploadError) {
            mediaUrl = `${SUPABASE_URL}/storage/v1/object/public/operations-documents/${storagePath}`;
          }

          // Operational OCR extraction for incoming media
          const suggestedModule = guessModule(groupName || '', text);
          const plate = extractPlate(text);
          const amount = extractAmount(text);
          const quantity = extractLiters(text);

          const extractedData = {
            plate: plate || undefined,
            amount: amount || undefined,
            total_amount: amount || undefined,
            quantity: quantity || undefined,
            date: new Date().toISOString().split('T')[0],
            description: text || undefined,
            driver_name: pushName
          };

          await supabase
            .from('whatsapp_incoming_media')
            .insert({
              organization_id: ORG_ID,
              group_name: groupName || pushName,
              sender_name: pushName,
              sender_phone: senderPhone,
              media_url: mediaUrl || '',
              media_type: ext === 'jpg' ? 'image' : 'document',
              caption: text || null,
              suggested_module: suggestedModule,
              extracted_data: extractedData,
              status: 'pending'
            });
        } catch (mediaErr) {
          console.error('Media download/process error:', mediaErr);
        }
      }

      // 1. Ensure chat exists in whatsapp_chats
      const chatPayload = {
        organization_id: ORG_ID,
        chat_jid: remoteJid,
        name: isGroup ? (groupName || 'WhatsApp Grubu') : pushName,
        phone_number: isGroup ? null : senderPhone,
        is_group: isGroup,
        last_message_text: text || (isMedia ? 'Dosya' : 'Mesaj'),
        last_message_time: new Date().toISOString()
      };

      const { data: upsertedChat } = await supabase
        .from('whatsapp_chats')
        .upsert(chatPayload, { onConflict: 'organization_id,chat_jid' })
        .select('id')
        .single();

      // 2. Insert into whatsapp_messages
      if (upsertedChat?.id) {
        await supabase
          .from('whatsapp_messages')
          .insert({
            chat_id: upsertedChat.id,
            organization_id: ORG_ID,
            message_id: msg.key.id || `msg_${Date.now()}`,
            sender_name: isFromMe ? (sock.user?.name || 'Siz') : pushName,
            sender_phone: senderPhone,
            is_from_me: isFromMe,
            message_type: isMedia ? (ext === 'jpg' ? 'image' : 'document') : 'text',
            body: text,
            media_url: mediaUrl,
            status: 'delivered',
            timestamp: new Date((msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now())).toISOString()
          });
      }

      // 3. Operational tasks creation if applicable
      if (text && text.length > 5 && isGroup) {
        const isTaskCandidate = text.toLowerCase().includes('yap') || 
                                text.toLowerCase().includes('gönder') || 
                                text.toLowerCase().includes('kontrol') || 
                                text.toLowerCase().includes('teslim') || 
                                text.toLowerCase().includes('hazırla');

        if (isTaskCandidate) {
          try {
            await supabase
              .from('whatsapp_tasks')
              .insert({
                organization_id: ORG_ID,
                group_name: groupName,
                title: `${groupName} Talimatı`,
                description: text,
                original_message: text,
                sender_name: pushName,
                priority: text.toLowerCase().includes('acil') ? 'urgent' : 'medium',
                category: guessModule(groupName, text) === 'sanayi' ? 'arac_bakim' : 'sevkiyat',
                status: 'todo'
              });
          } catch {}
        }
      }
    }
  });

  // Outgoing messages sender from Web Panel to WhatsApp
  setInterval(async () => {
    try {
      if (!sock.user?.id) return;
      const { data: pendingMsgs } = await supabase
        .from('whatsapp_messages')
        .select('id, chat_id, body, media_url, message_type')
        .eq('organization_id', ORG_ID)
        .eq('is_from_me', true)
        .eq('status', 'pending')
        .limit(5);

      if (pendingMsgs && pendingMsgs.length > 0) {
        for (const pMsg of pendingMsgs) {
          const { data: chat } = await supabase
            .from('whatsapp_chats')
            .select('chat_jid')
            .eq('id', pMsg.chat_id)
            .single();

          if (chat?.chat_jid) {
            console.log(`📤 [MESAJ GÖNDERİLİYOR] ${chat.chat_jid}: ${pMsg.body}`);
            const sent = await sock.sendMessage(chat.chat_jid, { text: pMsg.body || '' });
            await supabase
              .from('whatsapp_messages')
              .update({ status: 'sent', message_id: sent?.key?.id })
              .eq('id', pMsg.id);
          }
        }
      }
    } catch (sendErr) {
      console.warn('Outgoing message error:', sendErr.message);
    }
  }, 2000);

  // Periodic Group Refresh every 5 minutes
  setInterval(async () => {
    if (sock.user?.id) {
      await syncAllGroups(sock);
    }
  }, 5 * 60 * 1000);

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
    } catch {}
  }, 15000);
}

startGateway().catch(console.error);
