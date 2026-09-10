export type FindeksRiskLevel = 'very_safe' | 'safe' | 'medium_risk' | 'high_risk' | 'banned';

export interface FindeksCheckInquiry {
  id: string;
  organization_id: string;
  check_raw_qr?: string;
  bank_code: string;
  bank_name: string;
  branch_code?: string;
  account_number?: string;
  check_number: string;
  drawer_name: string;
  drawer_tckn_vkn?: string;
  amount?: number;
  due_date?: string;
  findeks_score: number; // 0 - 1000
  risk_level: FindeksRiskLevel;
  total_paid_count: number;
  total_paid_amount: number;
  bounced_unpaid_count: number;
  bounced_unpaid_amount: number;
  bounced_paid_later_count: number;
  last_bounced_date?: string;
  first_check_date?: string;
  last_check_date?: string;
  is_banned: boolean;
  raw_report_data?: {
    bank_count?: number;
    last_1m_paid_count?: number;
    last_1m_paid_amount?: number;
    last_3m_paid_count?: number;
    last_3m_paid_amount?: number;
    last_12m_paid_count?: number;
    last_12m_paid_amount?: number;
    protest_count?: number;
    unpaid_protest_amount?: number;
    open_credit_limit?: number;
    risk_summary?: string;
  };
  image_url?: string;
  inquired_by?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface ParsedCheckQR {
  raw: string;
  bankCode: string;
  bankName: string;
  branchCode: string;
  accountNumber: string;
  checkNumber: string;
  drawerTcknVkn?: string;
  amount?: number;
  dueDate?: string;
  isValid: boolean;
}

export interface FindeksSettings {
  id: string;
  organization_id: string;
  username?: string;
  institution_code?: string;
  remaining_credits: number;
  is_active: boolean;
  created_at?: string;
}
