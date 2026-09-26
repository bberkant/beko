import { supabase } from '../../../lib/supabase';
import { WhatsAppChat, WhatsAppMessage, GatewaySession } from '../types';

export async function fetchWhatsAppChats(organizationId: string): Promise<WhatsAppChat[]> {
  const { data, error } = await supabase
    .from('whatsapp_chats')
    .select('*')
    .eq('organization_id', organizationId)
    .order('is_pinned', { ascending: false })
    .order('last_message_time', { ascending: false });

  if (error) {
    console.error('WhatsApp sohbetleri alınamadı:', error);
    return [];
  }

  return (data || []) as WhatsAppChat[];
}

export async function fetchWhatsAppMessages(chatId: string, organizationId: string): Promise<WhatsAppMessage[]> {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('*')
    .eq('chat_id', chatId)
    .eq('organization_id', organizationId)
    .order('timestamp', { ascending: true });

  if (error) {
    console.error('WhatsApp mesajları alınamadı:', error);
    return [];
  }

  return (data || []) as WhatsAppMessage[];
}

export async function sendWhatsAppMessage(payload: {
  chatId: string;
  organizationId: string;
  senderName: string;
  senderPhone?: string;
  body: string;
  messageType?: 'text' | 'image' | 'document' | 'audio' | 'video';
  mediaUrl?: string;
  mediaCaption?: string;
}): Promise<WhatsAppMessage | null> {
  const newMsg = {
    chat_id: payload.chatId,
    organization_id: payload.organizationId,
    message_id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    sender_name: payload.senderName || 'Berkant Saray',
    sender_phone: payload.senderPhone || '+90 532 999 0000',
    is_from_me: true,
    message_type: payload.messageType || 'text',
    body: payload.body,
    media_url: payload.mediaUrl,
    media_caption: payload.mediaCaption,
    status: 'pending',
    timestamp: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert([newMsg])
    .select()
    .single();

  if (error) {
    console.error('Mesaj kaydedilemedi:', error);
    return null;
  }

  // Update chat last message and time
  await supabase
    .from('whatsapp_chats')
    .update({
      last_message_text: payload.body || payload.mediaCaption || 'Görsel / Dosya',
      last_message_time: new Date().toISOString(),
      unread_count: 0
    })
    .eq('id', payload.chatId);

  return data as WhatsAppMessage;
}

export async function markChatAsRead(chatId: string, organizationId: string): Promise<void> {
  await supabase
    .from('whatsapp_chats')
    .update({ unread_count: 0 })
    .eq('id', chatId)
    .eq('organization_id', organizationId);
}

export async function getGatewaySession(organizationId: string): Promise<GatewaySession | null> {
  const { data, error } = await supabase
    .from('whatsapp_gateway_sessions')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Gateway oturum hatası:', error);
  }

  return data as GatewaySession | null;
}
