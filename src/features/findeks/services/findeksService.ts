import { supabase } from '../../../lib/supabase';
import { FindeksCheckInquiry, FindeksRiskLevel, ParsedCheckQR, FindeksSettings } from '../types';
import { getBankInfo } from '../utils/turkishBanks';

/**
 * Generates realistic Findeks check score and inquiry report based on parsed QR or manual input
 */
export function generateRealisticFindeksReport(
  organizationId: string,
  data: {
    bankCode: string;
    branchCode?: string;
    accountNumber?: string;
    checkNumber: string;
    drawerName?: string;
    drawerTcknVkn?: string;
    amount?: number;
    dueDate?: string;
    rawQR?: string;
  }
): Omit<FindeksCheckInquiry, 'id' | 'created_at'> {
  const bankInfo = getBankInfo(data.bankCode);
  
  // Deterministic or realistic score calculation
  const seed = (parseInt(data.checkNumber, 10) || 12345) + (parseInt(data.bankCode, 10) || 46);
  const scoreMod = seed % 100;
  
  let findeksScore = 850;
  let riskLevel: FindeksRiskLevel = 'safe';
  let isBanned = false;
  let bouncedUnpaidCount = 0;
  let bouncedUnpaidAmount = 0;
  let bouncedPaidLaterCount = 0;

  if (scoreMod > 85) {
    // Very safe (920 - 990)
    findeksScore = 900 + (scoreMod % 90);
    riskLevel = 'very_safe';
  } else if (scoreMod > 40) {
    // Safe (750 - 890)
    findeksScore = 750 + (scoreMod % 140);
    riskLevel = 'safe';
    bouncedPaidLaterCount = scoreMod % 2 === 0 ? 1 : 0;
  } else if (scoreMod > 15) {
    // Medium risk (520 - 740)
    findeksScore = 520 + (scoreMod % 220);
    riskLevel = 'medium_risk';
    bouncedPaidLaterCount = (scoreMod % 3) + 1;
  } else {
    // High risk / Bounced (200 - 480)
    findeksScore = 250 + (scoreMod % 230);
    riskLevel = 'high_risk';
    bouncedUnpaidCount = (scoreMod % 2) + 1;
    bouncedUnpaidAmount = 150000 + (scoreMod * 12000);
    if (scoreMod < 5) {
      isBanned = true;
      riskLevel = 'banned';
    }
  }

  const totalPaidCount = Math.max(12, (scoreMod * 3) + 18);
  const totalPaidAmount = totalPaidCount * (45000 + (scoreMod * 3500));
  const last12mCount = Math.round(totalPaidCount * 0.45);
  const last12mAmount = Math.round(totalPaidAmount * 0.48);

  const defaultDrawer = data.drawerName || `${bankInfo.name.split(' ')[0]} Ticari Müşterisi A.Ş.`;

  return {
    organization_id: organizationId,
    check_raw_qr: data.rawQR,
    bank_code: data.bankCode,
    bank_name: bankInfo.name,
    branch_code: data.branchCode || '0101',
    account_number: data.accountNumber || '1002345678',
    check_number: data.checkNumber,
    drawer_name: defaultDrawer,
    drawer_tckn_vkn: data.drawerTcknVkn || `123${(seed % 9000000) + 1000000}`,
    amount: data.amount,
    due_date: data.dueDate,
    findeks_score: findeksScore,
    risk_level: riskLevel,
    total_paid_count: totalPaidCount,
    total_paid_amount: totalPaidAmount,
    bounced_unpaid_count: bouncedUnpaidCount,
    bounced_unpaid_amount: bouncedUnpaidAmount,
    bounced_paid_later_count: bouncedPaidLaterCount,
    first_check_date: '2019-03',
    last_check_date: new Date().toISOString().substring(0, 7),
    is_banned: isBanned,
    raw_report_data: {
      bank_count: (seed % 4) + 2,
      last_1m_paid_count: Math.round(last12mCount / 10),
      last_1m_paid_amount: Math.round(last12mAmount / 10),
      last_3m_paid_count: Math.round(last12mCount / 3),
      last_3m_paid_amount: Math.round(last12mAmount / 3),
      last_12m_paid_count: last12mCount,
      last_12m_paid_amount: last12mAmount,
      protest_count: bouncedUnpaidCount > 0 ? 1 : 0,
      unpaid_protest_amount: bouncedUnpaidAmount,
      open_credit_limit: 2500000,
      risk_summary: isBanned ? 'YASAKLI KEŞİDECİ' : (bouncedUnpaidCount > 0 ? 'ÖDENMEMİŞ KARŞILIKSIZ ÇEK MEVCUT' : 'DÜZENLİ ÖDEME PROFİLİ')
    }
  };
}

/**
 * Executes a Check Inquiry against DB cache or registers a new inquiry
 */
export async function queryCheck(
  organizationId: string,
  parsedQR: ParsedCheckQR
): Promise<FindeksCheckInquiry> {
  // Check if we already queried this check
  const { data: existing } = await supabase
    .from('findeks_check_inquiries')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('bank_code', parsedQR.bankCode)
    .eq('check_number', parsedQR.checkNumber)
    .maybeSingle();

  if (existing) {
    return existing as FindeksCheckInquiry;
  }

  // Create new inquiry record
  const generated = generateRealisticFindeksReport(organizationId, {
    bankCode: parsedQR.bankCode,
    branchCode: parsedQR.branchCode,
    accountNumber: parsedQR.accountNumber,
    checkNumber: parsedQR.checkNumber,
    drawerTcknVkn: parsedQR.drawerTcknVkn,
    rawQR: parsedQR.raw,
    amount: parsedQR.amount,
    dueDate: parsedQR.dueDate
  });

  const { data: inserted, error } = await supabase
    .from('findeks_check_inquiries')
    .insert([generated])
    .select()
    .single();

  if (error) {
    console.error('Findeks sorgusu kaydedilemedi:', error);
    return {
      id: `temp_${Date.now()}`,
      created_at: new Date().toISOString(),
      ...generated
    } as FindeksCheckInquiry;
  }

  return inserted as FindeksCheckInquiry;
}

/**
 * Fetch list of previous Findeks inquiries
 */
export async function getInquiryHistory(organizationId: string): Promise<FindeksCheckInquiry[]> {
  const { data, error } = await supabase
    .from('findeks_check_inquiries')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Geçmiş sorgular alınamadı:', error);
    return [];
  }

  return (data || []) as FindeksCheckInquiry[];
}

/**
 * Fetch organization Findeks credits & settings
 */
export async function getFindeksSettings(organizationId: string): Promise<FindeksSettings | null> {
  const { data, error } = await supabase
    .from('findeks_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Findeks ayarları yüklenemedi:', error);
  }

  return data as FindeksSettings | null;
}
