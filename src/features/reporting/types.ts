export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';
export type RiskLevel = 'dusuk' | 'orta' | 'yuksek' | 'kritik';
export type CariStatusIndicator = 'normal' | 'volume_drop' | 'limit_exceeded' | 'drop_and_exceeded';

export interface CariAgingRow {
  cariCode: string;
  cariName: string;
  companyCode?: string;
  city?: string;
  type: string;
  balance: number;

  // Financial & Capacity Engine Fields
  monthlyAvgKg: number;
  monthlyAvgAmount: number;
  safeLimit: number;
  originalSafeLimit?: number;
  riskAmount: number;
  overdueDays: number;
  weightedOverdueDays?: number;
  volumeDropRate: number;
  isVolumeShrunk: boolean;
  statusLabel: string;
  statusBadgeText?: string;

  // Interoperability / Aliases for UI & Specifications
  excessAmount?: number;
  volumeDropPercent?: number;
  hasVolumeDrop?: boolean;
  statusIndicator?: CariStatusIndicator;
  monthlyKgConsumption?: number;
  monthly60KgConsumption?: number;

  // Activity & Transaction summaries
  bucket: AgingBucket;
  riskLevel: RiskLevel;
  lastInvoiceDate?: string;
  lastInvoiceNo?: string;
  lastInvoiceAmount?: number;
  lastInvoiceProductName?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  lastPaymentType?: string;
  daysSinceLastActivity: number;
  phone?: string;
}

export interface CashFlowItem {
  id: string;
  date: string;
  type: 'inflow' | 'outflow';
  category: 'check_in' | 'check_out' | 'credit_card' | 'bank' | 'cashbox';
  description: string;
  amount: number;
  bank?: string;
  party?: string;
}

export interface SlaughterEfficiencyRow {
  producer: string;
  slaughterCount: number;
  totalLiveWeight: number;
  totalCarcassWeight: number;
  avgYieldPercent: number;
  totalAmount: number;
  avgCostPerKg: number;
  lastDate?: string;
}

export interface ExpenseCategoryRow {
  category: string;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
  source: string;
}
