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
