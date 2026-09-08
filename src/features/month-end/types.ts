export interface AssetItem {
  id: string;
  name: string;
  value: number;
  category?: string;
  plate?: string;
  note?: string;
}

export interface LiabilityItem {
  id: string;
  name: string;
  amount: number;
  category: string;
  dueDate?: string;
  bank?: string;
  note?: string;
}

export interface CheckOrOpenGood {
  id: string;
  dateStr?: string;
  recipient: string;
  bank: string;
  amount: number;
  type: 'check' | 'open_good';
}

export interface PLStatement {
  grossSales: number;
  returnsAndDiscounts: number;
  netSales: number;
  cogs: number; // Satılan Malın Maliyeti
  grossProfit: number;
  personnelExpenses: number;
  facilityAndUtilities: number; // Kira, elektrik, su, yakıt
  transportAndLogistics: number;
  otherOpex: number;
  totalOpex: number;
  ebitda: number; // Faaliyet Kârı (FAVÖK)
  financialAndInterest: number;
  depreciation: number;
  taxProvision: number;
  netProfit: number;
}

export interface MonthEndData {
  period: string; // e.g. 2026-08
  title: string;
  updatedAt: string;
  
  // Varlıklar (Assets)
  realEstates?: AssetItem[];
  vehicles: AssetItem[];
  stocks: AssetItem[];
  receivables: AssetItem[];
  bankAndLiquid: AssetItem[];
  otherAssets: AssetItem[];
  pastDeficits: AssetItem[];
  
  // Borçlar (Liabilities)
  givenChecks: CheckOrOpenGood[];
  loansAndPersonalDebts: LiabilityItem[];
  operationalDebts: LiabilityItem[];
  
  // Gelir Tablosu (P&L)
  plStatement: PLStatement;
  
  // Notlar & Yönetici Yorumları
  executiveNotes?: string;
}

export interface MonthEndSnapshot {
  id: string;
  period: string;
  snapshotName: string;
  createdAt: string;
  createdByName: string;
  note?: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  data: MonthEndData;
}
