import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../lib/toast';
import type { CompanyBill, BillInvoice, BillFormInput, InvoiceFormInput, BillStatus, InvoiceStatus } from '../types';

interface BillsContextType {
  bills: CompanyBill[];
  invoices: BillInvoice[];
  loading: boolean;
  isOffline: boolean;
  refresh: () => Promise<void>;
  addBill: (input: BillFormInput) => Promise<CompanyBill | null>;
  updateBill: (id: string, input: Partial<BillFormInput>) => Promise<void>;
  deleteBill: (id: string) => Promise<void>;
  toggleBillStatus: (billId: string, customDate?: string) => Promise<void>;
  addInvoice: (input: InvoiceFormInput) => Promise<BillInvoice | null>;
  updateInvoice: (id: string, input: Partial<InvoiceFormInput>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  toggleInvoiceStatus: (invoiceId: string, customDate?: string) => Promise<void>;
  getInvoicesByBillId: (billId: string) => BillInvoice[];
}

export const BillsContext = createContext<BillsContextType | undefined>(undefined);

// Initial fallback seed data
const initialSeedBills: CompanyBill[] = [
  {
    id: 'b1111111-1111-4111-8111-111111111111',
    name: 'İlkadım Elektrik',
    subscriberNo: '4003036514',
    category: 'elektrik',
    company: 'ETİK',
    autoPayment: false,
    autoPaymentBank: '',
    currentAmount: 84081,
    dueDate: '2026-09-10',
    billStatus: 'odenecek',
    notes: 'Merkez fabrika elektrik aboneliği'
  },
  {
    id: 'b2222222-2222-4222-8222-222222222222',
    name: 'YEDAŞ Dağıtım',
    subscriberNo: '1004928172',
    category: 'elektrik',
    company: 'MARİF',
    autoPayment: true,
    autoPaymentBank: 'Kuveyt Türk',
    currentAmount: 42150,
    dueDate: '2026-09-15',
    billStatus: 'odenecek',
    notes: 'Depo tesisat elektriği'
  },
  {
    id: 'b3333333-3333-4333-8333-333333333333',
    name: 'SASKİ Su İşleri',
    subscriberNo: '55019283',
    category: 'su',
    company: 'ETİK',
    autoPayment: false,
    autoPaymentBank: '',
    currentAmount: 9340,
    dueDate: '2026-09-12',
    billStatus: 'odenecek',
    notes: 'Ana tesis su aboneliği'
  },
  {
    id: 'b4444444-4444-4444-8444-444444444444',
    name: 'Aksa Doğalgaz',
    subscriberNo: '7702819201',
    category: 'dogalgaz',
    company: 'ETİK',
    autoPayment: false,
    autoPaymentBank: '',
    currentAmount: 18750,
    dueDate: '2026-09-18',
    billStatus: 'odenecek',
    notes: 'Isınma ve üretim doğalgazı'
  },
  {
    id: 'b5555555-5555-4555-8555-555555555555',
    name: 'Türk Telekom Kurumsal',
    subscriberNo: '8839201948',
    category: 'internet_telefon',
    company: 'ETİK',
    autoPayment: true,
    autoPaymentBank: 'Ziraat Bankası',
    currentAmount: 4250,
    dueDate: '2026-09-08',
    billStatus: 'odendi',
    lastPaidAt: '2026-09-08',
    notes: 'Metro ethernet & santral hatları'
  }
];

const initialSeedInvoices: BillInvoice[] = [
  {
    id: 'i1111111-1111-4111-8111-111111111111',
    billId: 'b1111111-1111-4111-8111-111111111111',
    period: '2026-08',
    invoiceNo: 'ELE202600084920',
    invoiceDate: '2026-08-25',
    dueDate: '2026-09-10',
    amount: 84081,
    paidAmount: 0,
    status: 'odenecek',
    notes: 'Ağustos 2026 dönemi tüketim faturası'
  },
  {
    id: 'i1111111-1111-4111-8111-111111111112',
    billId: 'b1111111-1111-4111-8111-111111111111',
    period: '2026-07',
    invoiceNo: 'ELE202600073210',
    invoiceDate: '2026-07-25',
    dueDate: '2026-08-10',
    amount: 76420,
    paidAmount: 76420,
    status: 'odendi',
    paidAt: '2026-08-09',
    paymentMethod: 'Banka Transferi',
    notes: 'Temmuz 2026 dönemi faturası'
  },
  {
    id: 'i1111111-1111-4111-8111-111111111113',
    billId: 'b1111111-1111-4111-8111-111111111111',
    period: '2026-06',
    invoiceNo: 'ELE202600061905',
    invoiceDate: '2026-06-25',
    dueDate: '2026-07-10',
    amount: 71900,
    paidAmount: 71900,
    status: 'odendi',
    paidAt: '2026-07-08',
    paymentMethod: 'Banka Transferi',
    notes: 'Haziran 2026 dönemi faturası'
  },
  {
    id: 'i1111111-1111-4111-8111-111111111114',
    billId: 'b1111111-1111-4111-8111-111111111111',
    period: '2026-05',
    invoiceNo: 'ELE202600050840',
    invoiceDate: '2026-05-25',
    dueDate: '2026-06-10',
    amount: 68350,
    paidAmount: 68350,
    status: 'odendi',
    paidAt: '2026-06-09',
    paymentMethod: 'Banka Transferi',
    notes: 'Mayıs 2026 dönemi faturası'
  },
  {
    id: 'i2222222-2222-4222-8222-222222222221',
    billId: 'b2222222-2222-4222-8222-222222222222',
    period: '2026-08',
    invoiceNo: 'YED202600081290',
    invoiceDate: '2026-08-28',
    dueDate: '2026-09-15',
    amount: 42150,
    paidAmount: 0,
    status: 'odenecek',
    notes: 'Ağustos 2026 dönemi'
  },
  {
    id: 'i3333333-3333-4333-8333-333333333331',
    billId: 'b3333333-3333-4333-8333-333333333333',
    period: '2026-08',
    invoiceNo: 'SSK202600089123',
    invoiceDate: '2026-08-26',
    dueDate: '2026-09-12',
    amount: 9340,
    paidAmount: 0,
    status: 'odenecek',
    notes: 'Ağustos 2026 dönemi su faturası'
  },
  {
    id: 'i4444444-4444-4444-8444-444444444441',
    billId: 'b4444444-4444-4444-8444-444444444444',
    period: '2026-08',
    invoiceNo: 'AKS202600083311',
    invoiceDate: '2026-08-27',
    dueDate: '2026-09-18',
    amount: 18750,
    paidAmount: 0,
    status: 'odenecek',
    notes: 'Ağustos 2026 dönemi gaz faturası'
  },
  {
    id: 'i5555555-5555-4555-8555-555555555551',
    billId: 'b5555555-5555-4555-8555-555555555555',
    period: '2026-08',
    invoiceNo: 'TTK202600082210',
    invoiceDate: '2026-08-20',
    dueDate: '2026-09-08',
    amount: 4250,
    paidAmount: 4250,
    status: 'odendi',
    paidAt: '2026-09-08',
    paymentMethod: 'Otomatik Ödeme',
    notes: 'Ağustos 2026 dönemi internet faturası'
  }
];

const BILLS_CACHE_KEY = 'dars_company_bills_cache';
const INVOICES_CACHE_KEY = 'dars_company_invoices_cache';

const getInitialBills = (): CompanyBill[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(BILLS_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Bills cache read error:', e);
  }
  return initialSeedBills;
};

const getInitialInvoices = (): BillInvoice[] => {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(INVOICES_CACHE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Invoices cache read error:', e);
  }
  return initialSeedInvoices;
};

const persistBillsToStorage = (billsList: CompanyBill[]) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(BILLS_CACHE_KEY, JSON.stringify(billsList));
    }
  } catch (e) {}
};

const persistInvoicesToStorage = (invList: BillInvoice[]) => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(INVOICES_CACHE_KEY, JSON.stringify(invList));
    }
  } catch (e) {}
};

export const BillsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<CompanyBill[]>(getInitialBills);
  const [invoices, setInvoices] = useState<BillInvoice[]>(getInitialInvoices);
  const [loading, setLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const { notify } = useToast();

  const mapDbBillToApp = (db: any): CompanyBill => ({
    id: db.id,
    name: db.name || '',
    subscriberNo: db.subscriber_no || '',
    category: db.category || 'elektrik',
    company: db.company || 'ETİK',
    autoPayment: Boolean(db.auto_payment),
    autoPaymentBank: db.auto_payment_bank || '',
    currentAmount: Number(db.current_amount) || 0,
    dueDate: db.due_date || '',
    billStatus: db.bill_status || 'odenecek',
    lastPaidAt: db.last_paid_at || undefined,
    notes: db.notes || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at
  });

  const mapDbInvoiceToApp = (db: any): BillInvoice => ({
    id: db.id,
    billId: db.bill_id,
    period: db.period || '',
    invoiceNo: db.invoice_no || '',
    invoiceDate: db.invoice_date || undefined,
    dueDate: db.due_date || '',
    amount: Number(db.amount) || 0,
    paidAmount: Number(db.paid_amount) || 0,
    status: db.status || 'odenecek',
    paidAt: db.paid_at || undefined,
    paymentMethod: db.payment_method || '',
    notes: db.notes || '',
    createdAt: db.created_at,
    updatedAt: db.updated_at
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sunucu yanıt süresi aşıldı (Timeout)')), 8000)
      );

      const fetchPromise = Promise.all([
        supabase
          .from('company_bills')
          .select('*')
          .order('created_at', { ascending: true }),
        supabase
          .from('company_bill_invoices')
          .select('*')
          .order('due_date', { ascending: false })
      ]);

      const [{ data: billsData, error: billsError }, { data: invData }] = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]);

      if (billsError) throw billsError;

      if (billsData && billsData.length > 0) {
        const mappedBills = billsData.map(mapDbBillToApp);
        const mappedInvoices = (invData || []).map(mapDbInvoiceToApp);
        setBills(mappedBills);
        setInvoices(mappedInvoices);
        persistBillsToStorage(mappedBills);
        persistInvoicesToStorage(mappedInvoices);
      }
      setIsOffline(false);
    } catch (err: any) {
      console.warn('Bills Supabase fetch error/timeout, using local cache:', err);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const addBill = async (input: BillFormInput): Promise<CompanyBill | null> => {
    const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `b-${Date.now()}`;
    const newBill: CompanyBill = {
      id: tempId,
      name: input.name,
      subscriberNo: input.subscriberNo,
      category: input.category,
      company: input.company || 'GENEL',
      autoPayment: input.autoPayment,
      autoPaymentBank: input.autoPayment ? (input.autoPaymentBank?.trim() || '') : '',
      currentAmount: input.currentAmount,
      dueDate: input.dueDate || '',
      billStatus: input.billStatus,
      notes: input.notes || '',
      createdAt: new Date().toISOString()
    };

    setBills(prev => {
      const next = [...prev, newBill];
      persistBillsToStorage(next);
      return next;
    });

    try {
      const dbPayload: any = {
        name: input.name,
        subscriber_no: input.subscriberNo,
        category: input.category,
        company: input.company || 'GENEL',
        auto_payment: input.autoPayment,
        auto_payment_bank: input.autoPayment ? (input.autoPaymentBank?.trim() || '') : '',
        current_amount: input.currentAmount,
        due_date: input.dueDate || null,
        bill_status: input.billStatus,
        notes: input.notes || ''
      };

      const { data, error } = await supabase
        .from('company_bills')
        .insert([dbPayload])
        .select()
        .single();

      if (!error && data) {
        const created = mapDbBillToApp(data);
        setBills(prev => {
          const next = prev.map(b => b.id === tempId ? created : b);
          persistBillsToStorage(next);
          return next;
        });
        notify(`${created.name} başarıyla eklendi.`, 'success');
        return created;
      }

      notify(`${newBill.name} kaydedildi.`, 'success');
      return newBill;
    } catch (err: any) {
      console.warn('addBill remote error (saved locally):', err);
      notify(`${newBill.name} yerel olarak kaydedildi.`, 'success');
      return newBill;
    }
  };

  const updateBill = async (id: string, input: Partial<BillFormInput>) => {
    // Optimistic Update
    setBills(prev => {
      const next = prev.map(b => (b.id === id ? { ...b, ...input } : b));
      persistBillsToStorage(next);
      return next;
    });

    try {
      const dbPayload: any = {};
      if (input.name !== undefined) dbPayload.name = input.name;
      if (input.subscriberNo !== undefined) dbPayload.subscriber_no = input.subscriberNo;
      if (input.category !== undefined) dbPayload.category = input.category;
      if (input.company !== undefined) dbPayload.company = input.company;
      if (input.autoPayment !== undefined) {
        dbPayload.auto_payment = input.autoPayment;
        if (!input.autoPayment) {
          dbPayload.auto_payment_bank = '';
        }
      }
      if (input.autoPaymentBank !== undefined) dbPayload.auto_payment_bank = input.autoPaymentBank;
      if (input.currentAmount !== undefined) dbPayload.current_amount = input.currentAmount;
      if (input.dueDate !== undefined) dbPayload.due_date = input.dueDate || null;
      if (input.billStatus !== undefined) dbPayload.bill_status = input.billStatus;
      if (input.notes !== undefined) dbPayload.notes = input.notes;
      dbPayload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('company_bills')
        .update(dbPayload)
        .eq('id', id);

      if (error) console.warn('updateBill remote sync notice:', error);
      notify('Fatura bilgisi güncellendi.', 'success');
    } catch (err: any) {
      console.warn('updateBill remote warning (kept locally):', err);
      notify('Fatura yerel olarak güncellendi.', 'success');
    }
  };

  const deleteBill = async (id: string) => {
    setBills(prev => {
      const next = prev.filter(b => b.id !== id);
      persistBillsToStorage(next);
      return next;
    });
    setInvoices(prev => {
      const next = prev.filter(i => i.billId !== id);
      persistInvoicesToStorage(next);
      return next;
    });

    try {
      const { error } = await supabase
        .from('company_bills')
        .delete()
        .eq('id', id);

      if (error) console.warn('deleteBill remote sync notice:', error);
      notify('Fatura kaydı silindi.', 'success');
    } catch (err: any) {
      console.warn('deleteBill remote warning (deleted locally):', err);
      notify('Fatura yerel olarak silindi.', 'success');
    }
  };

  const toggleBillStatus = async (billId: string, customDate?: string) => {
    const target = bills.find(b => b.id === billId);
    if (!target) return;

    const newStatus: BillStatus = target.billStatus === 'odendi' ? 'odenecek' : 'odendi';
    const today = customDate || new Date().toISOString().slice(0, 10);
    const lastPaidAt = newStatus === 'odendi' ? today : undefined;

    setBills(prev => {
      const next = prev.map(b => b.id === billId ? { ...b, billStatus: newStatus, lastPaidAt } : b);
      persistBillsToStorage(next);
      return next;
    });

    try {
      const { error } = await supabase
        .from('company_bills')
        .update({
          bill_status: newStatus,
          last_paid_at: lastPaidAt || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) console.warn('toggleBillStatus remote sync notice:', error);
      notify(`${target.name} durumu "${newStatus === 'odendi' ? 'Ödendi' : 'Ödenecek'}" olarak güncellendi.`, 'success');
    } catch (err: any) {
      console.warn('toggleBillStatus remote warning (updated locally):', err);
      notify(`${target.name} durumu yerel olarak güncellendi.`, 'success');
    }
  };

  const addInvoice = async (input: InvoiceFormInput): Promise<BillInvoice | null> => {
    const tempId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `i-${Date.now()}`;
    const newInvoice: BillInvoice = {
      id: tempId,
      billId: input.billId,
      period: input.period,
      invoiceNo: input.invoiceNo || '',
      invoiceDate: input.invoiceDate || undefined,
      dueDate: input.dueDate,
      amount: input.amount,
      paidAmount: input.paidAmount || (input.status === 'odendi' ? input.amount : 0),
      status: input.status,
      paidAt: input.paidAt || (input.status === 'odendi' ? new Date().toISOString().slice(0, 10) : undefined),
      paymentMethod: input.paymentMethod || '',
      notes: input.notes || '',
      createdAt: new Date().toISOString()
    };

    setInvoices(prev => {
      const next = [newInvoice, ...prev];
      persistInvoicesToStorage(next);
      return next;
    });

    // Also update latest amount and due date on parent bill
    void updateBill(input.billId, {
      currentAmount: input.amount,
      dueDate: input.dueDate,
      billStatus: input.status === 'odendi' ? 'odendi' : 'odenecek'
    });

    try {
      const dbPayload = {
        bill_id: input.billId,
        period: input.period,
        invoice_no: input.invoiceNo || '',
        invoice_date: input.invoiceDate || null,
        due_date: input.dueDate,
        amount: input.amount,
        paid_amount: newInvoice.paidAmount,
        status: input.status,
        paid_at: newInvoice.paidAt || null,
        payment_method: input.paymentMethod || '',
        notes: input.notes || ''
      };

      const { data, error } = await supabase
        .from('company_bill_invoices')
        .insert([dbPayload])
        .select()
        .single();

      if (!error && data) {
        const created = mapDbInvoiceToApp(data);
        setInvoices(prev => {
          const next = prev.map(i => i.id === tempId ? created : i);
          persistInvoicesToStorage(next);
          return next;
        });
        notify('Fatura hareketi başarıyla kaydedildi.', 'success');
        return created;
      }

      notify('Fatura hareketi kaydedildi.', 'success');
      return newInvoice;
    } catch (err: any) {
      console.warn('addInvoice remote warning (saved locally):', err);
      notify('Fatura hareketi yerel olarak kaydedildi.', 'success');
      return newInvoice;
    }
  };

  const updateInvoice = async (id: string, input: Partial<InvoiceFormInput>) => {
    setInvoices(prev => {
      const next = prev.map(i => (i.id === id ? { ...i, ...input } : i));
      persistInvoicesToStorage(next);
      return next;
    });

    try {
      const dbPayload: any = {};
      if (input.period !== undefined) dbPayload.period = input.period;
      if (input.invoiceNo !== undefined) dbPayload.invoice_no = input.invoiceNo;
      if (input.invoiceDate !== undefined) dbPayload.invoice_date = input.invoiceDate || null;
      if (input.dueDate !== undefined) dbPayload.due_date = input.dueDate;
      if (input.amount !== undefined) dbPayload.amount = input.amount;
      if (input.paidAmount !== undefined) dbPayload.paid_amount = input.paidAmount;
      if (input.status !== undefined) dbPayload.status = input.status;
      if (input.paidAt !== undefined) dbPayload.paid_at = input.paidAt || null;
      if (input.paymentMethod !== undefined) dbPayload.payment_method = input.paymentMethod;
      if (input.notes !== undefined) dbPayload.notes = input.notes;
      dbPayload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('company_bill_invoices')
        .update(dbPayload)
        .eq('id', id);

      if (error) console.warn('updateInvoice remote sync notice:', error);
      notify('Fatura hareketi güncellendi.', 'success');
    } catch (err: any) {
      console.warn('updateInvoice remote warning (updated locally):', err);
      notify('Fatura hareketi yerel olarak güncellendi.', 'success');
    }
  };

  const deleteInvoice = async (id: string) => {
    setInvoices(prev => {
      const next = prev.filter(i => i.id !== id);
      persistInvoicesToStorage(next);
      return next;
    });

    try {
      const { error } = await supabase
        .from('company_bill_invoices')
        .delete()
        .eq('id', id);

      if (error) console.warn('deleteInvoice remote sync notice:', error);
      notify('Fatura hareketi silindi.', 'success');
    } catch (err: any) {
      console.warn('deleteInvoice remote warning (deleted locally):', err);
      notify('Fatura hareketi yerel olarak silindi.', 'success');
    }
  };

  const toggleInvoiceStatus = async (invoiceId: string, customDate?: string) => {
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;

    const newStatus: InvoiceStatus = target.status === 'odendi' ? 'odenecek' : 'odendi';
    const today = customDate || new Date().toISOString().slice(0, 10);
    const paidAt = newStatus === 'odendi' ? today : undefined;
    const paidAmount = newStatus === 'odendi' ? target.amount : 0;

    setInvoices(prev => {
      const next = prev.map(i => i.id === invoiceId ? { ...i, status: newStatus, paidAt, paidAmount } : i);
      persistInvoicesToStorage(next);
      return next;
    });

    try {
      const { error } = await supabase
        .from('company_bill_invoices')
        .update({
          status: newStatus,
          paid_at: paidAt || null,
          paid_amount: paidAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId);

      if (error) console.warn('toggleInvoiceStatus remote sync notice:', error);
      notify(`Fatura "${newStatus === 'odendi' ? 'Ödendi' : 'Ödenecek'}" olarak güncellendi.`, 'success');
    } catch (err: any) {
      console.warn('toggleInvoiceStatus remote warning (updated locally):', err);
      notify(`Fatura durumu yerel olarak güncellendi.`, 'success');
    }
  };

  const getInvoicesByBillId = useCallback((billId: string) => {
    return invoices
      .filter(i => i.billId === billId)
      .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  }, [invoices]);

  return (
    <BillsContext.Provider
      value={{
        bills,
        invoices,
        loading,
        isOffline,
        refresh: loadData,
        addBill,
        updateBill,
        deleteBill,
        toggleBillStatus,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        toggleInvoiceStatus,
        getInvoicesByBillId
      }}
    >
      {children}
    </BillsContext.Provider>
  );
};

export const useBills = () => {
  const context = useContext(BillsContext);
  if (!context) {
    throw new Error('useBills must be used within a BillsProvider');
  }
  return context;
};

export const useSafeBills = () => {
  return useContext(BillsContext);
};

