export interface WhatsAppIncomingMedia {
  id: string;
  organization_id: string;
  group_name: string;
  sender_name: string;
  sender_phone?: string;
  media_url: string;
  media_type: 'image' | 'pdf' | 'audio' | 'document';
  caption?: string;
  suggested_module: 'sanayi' | 'yakit' | 'kasa' | 'cek' | 'kesim' | 'diger';
  extracted_data: {
    plate?: string;
    amount?: number;
    supplier?: string;
    invoice_no?: string;
    date?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    station?: string;
    driver_name?: string;
    km?: number;
    bank_name?: string;
    due_date?: string;
    drawer?: string;
    check_no?: string;
    branch?: string;
    cash_total?: number;
    pos_total?: number;
    total_amount?: number;
    category?: string;
    head_count?: number;
    carcass_weight?: number;
    price_per_kg?: number;
    animal_type?: string;
    items?: Array<{ name: string; qty: number; price: number }>;
  };
  status: 'pending' | 'processed' | 'ignored';
  processed_at?: string;
  processed_to_table?: string;
  processed_record_id?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface WhatsAppTask {
  id: string;
  organization_id: string;
  group_name: string;
  title: string;
  description?: string;
  original_message?: string;
  sender_name?: string;
  assigned_to?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'sevkiyat' | 'arac_bakim' | 'kesim' | 'sube' | 'muhasebe' | 'diger';
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  completed_at?: string;
  media_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface WhatsAppGroupRule {
  id: string;
  organization_id: string;
  group_name: string;
  default_module: 'sanayi' | 'yakit' | 'kasa' | 'cek' | 'kesim' | 'diger';
  default_category: string;
  auto_ocr: boolean;
  auto_task: boolean;
  is_active: boolean;
  created_at?: string;
}

export interface WhatsAppChat {
  id: string;
  organization_id: string;
  chat_jid: string;
  name: string;
  phone_number?: string;
  is_group: boolean;
  avatar_url?: string;
  unread_count: number;
  last_message_text?: string;
  last_message_time: string;
  is_pinned?: boolean;
  participants?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface WhatsAppMessage {
  id: string;
  chat_id: string;
  organization_id: string;
  message_id?: string;
  sender_name: string;
  sender_phone?: string;
  is_from_me: boolean;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  body?: string;
  media_url?: string;
  media_caption?: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
  created_at?: string;
}

export interface GatewaySession {
  id?: string;
  organization_id?: string;
  status: 'disconnected' | 'qr_ready' | 'connected' | 'error';
  qr_code?: string | null;
  qr_raw?: string | null;
  phone_number?: string | null;
  device_name?: string | null;
  battery_level?: number;
  is_charging?: boolean;
  last_heartbeat?: string | null;
  error_message?: string | null;
}
