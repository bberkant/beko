export type CardStatus = 'aktif' | 'pasif' | 'bloke' | 'yenileme-bekliyor';
export type StatementStatus = 'yuklendi' | 'bekleniyor' | 'isleniyor' | 'hata' | 'bu-ay-eksik';
export type AIAnalysisStatus = 'analiz-bekliyor' | 'isleniyor' | 'tamamlandi' | 'manuel-kontrol' | 'hata';
export type PaymentStatus = 'odenmedi' | 'kismi-odendi' | 'odendi' | 'gecikti';
export type CardType = 'business' | 'corporate' | 'ticari' | 'sanal-kart' | 'ek-kart';
export type Currency = 'TRY' | 'USD' | 'EUR';
export type PaymentType = 'tam-odeme' | 'asgari-odeme' | 'kismi-odeme' | 'duzeltme';
export type TransactionReviewStatus = 'normal' | 'incelenecek' | 'aciklama-bekliyor' | 'onaylandi';
export type SpendingCategory =
  | 'yakit' | 'market' | 'seyahat' | 'konaklama' | 'malzeme' | 'bakim' | 'diger' | 'yemek' | 'fatura' | 'telefon' | 'odeme';

export interface CreditCard {
  id: string;
  bank: string;
  bankShort: string;
  cardName: string;
  cardType: CardType;
  last4: string;
  holder: string;
  department: string;
  limit: number;
  currentDebt: number;
  currency: Currency;
  statementDay: number;
  dueDay: number;
  minPaymentRate: number;
  startDate: string;
  expiryMonth: number;
  expiryYear: number;
  status: CardStatus;
  statementStatus: StatementStatus;
  description?: string;
}

export interface Statement {
  id: string;
  cardId: string;
  period: string;
  statementDate: string;
  dueDate: string;
  totalDebt: number;
  minPayment: number;
  transactionCount: number;
  hasFile: boolean;
  fileName?: string;
  filePath?: string;
  aiStatus: AIAnalysisStatus;
  paymentStatus: PaymentStatus;
  note?: string;
}

export interface Transaction {
  id: string;
  cardId: string;
  statementId: string;
  date: string;
  merchant: string;
  description: string;
  category: SpendingCategory;
  amount: number;
  installments: number;
  spender: string;
  reviewStatus: TransactionReviewStatus;
  unusual?: boolean;
}

export interface Payment {
  id: string;
  cardId: string;
  statementId?: string;
  date: string;
  amount: number;
  type: PaymentType;
  bankAccount: string;
  description?: string;
  hasReceipt: boolean;
  recordedBy: string;
}

export interface MonthlyPoint { label: string; value: number; }
export interface CategoryShare { category: SpendingCategory; amount: number; count: number; changePct: number; }
export interface SupplierRow { name: string; total: number; count: number; changePct: number; }
export interface AIInsight { id: string; text: string; tone: 'info' | 'warning' | 'critical'; }
export interface UpcomingDate { id: string; label: string; date: string; type: string; }
export interface ActivityLog { id: string; user: string; action: string; target: string; time: string; }
