export type BillCategory = 'elektrik' | 'su' | 'dogalgaz' | 'internet_telefon' | 'kira' | 'diger';
export type BillCompany = 'ETİK' | 'MARİF' | 'GENEL';
export type BillStatus = 'odenecek' | 'odendi' | 'gecikmede';
export type InvoiceStatus = 'odenecek' | 'odendi' | 'kismi' | 'gecikmede';

export interface CompanyBill {
  id: string;
  name: string;
  subscriberNo: string;
  category: BillCategory;
  company?: BillCompany;
  autoPayment: boolean;
  autoPaymentBank?: string;
  currentAmount: number;
  dueDate: string; // YYYY-MM-DD
  billStatus: BillStatus;
  lastPaidAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillInvoice {
  id: string;
  billId: string;
  period: string; // e.g. "2026-08" or "Ağustos 2026"
  invoiceNo?: string;
  invoiceDate?: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  status: InvoiceStatus;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BillFormInput {
  name: string;
  subscriberNo: string;
  category: BillCategory;
  company?: BillCompany;
  autoPayment: boolean;
  autoPaymentBank?: string;
  currentAmount: number;
  dueDate: string;
  billStatus: BillStatus;
  notes?: string;
}

export interface InvoiceFormInput {
  billId: string;
  period: string;
  invoiceNo?: string;
  invoiceDate?: string;
  dueDate: string;
  amount: number;
  paidAmount?: number;
  status: InvoiceStatus;
  paidAt?: string;
  paymentMethod?: string;
  notes?: string;
}
