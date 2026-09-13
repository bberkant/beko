import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../lib/toast';
import type { CompanyBill, BillInvoice, BillFormInput, InvoiceFormInput } from '../types';

interface BillsContextType {
  bills: CompanyBill[];
  invoices: BillInvoice[];
  loading: boolean;
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

const BillsContext = createContext<BillsContextType | undefined>(undefined);

// Initial fallback seed data
const initialSeedBills: CompanyBill[] = [
  {
    id: 'b1111111-1111-4111-8111-111111111111',
    name: 'İlkadım Elektrik',
    subscriberNo: '4003036514',
    category: 'elektrik',
    company: 'ETİK',
    autoPayment: false,
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

export const BillsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bills, setBills] = useState<CompanyBill[]>([]);
  const [invoices, setInvoices] = useState<BillInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const { notify } = useToast();

  const mapDbBillToApp = (db: any): CompanyBill => ({
    id: db.id,
    name: db.name || '',
    subscriberNo: db.subscriber_no || '',
    category: db.category || 'elektrik',
    company: db.company || 'ETİK',
    autoPayment: Boolean(db.auto_payment),
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
      const { data: billsData, error: billsError } = await supabase
        .from('company_bills')
        .select('*')
        .order('created_at', { ascending: true });

      const { data: invData } = await supabase
        .from('company_bill_invoices')
        .select('*')
        .order('due_date', { ascending: false });

      if (billsError || !billsData || billsData.length === 0) {
        // Fallback or seed to Supabase
        if (billsData && billsData.length === 0) {
          // Attempt to insert initial seed data to Supabase
          try {
            const dbSeedBills = initialSeedBills.map(b => ({
              id: b.id,
              name: b.name,
              subscriber_no: b.subscriberNo,
              category: b.category,
              company: b.company,
              auto_payment: b.autoPayment,
              current_amount: b.currentAmount,
              due_date: b.dueDate,
              bill_status: b.billStatus,
              last_paid_at: b.lastPaidAt || null,
              notes: b.notes || ''
            }));

            const { data: insertedBills } = await supabase
              .from('company_bills')
              .insert(dbSeedBills)
              .select();

            if (insertedBills && insertedBills.length > 0) {
              const dbSeedInvoices = initialSeedInvoices.map(i => ({
                id: i.id,
                bill_id: i.billId,
                period: i.period,
                invoice_no: i.invoiceNo || '',
                invoice_date: i.invoiceDate || null,
                due_date: i.dueDate,
                amount: i.amount,
                paid_amount: i.paidAmount,
                status: i.status,
                paid_at: i.paidAt || null,
                payment_method: i.paymentMethod || '',
                notes: i.notes || ''
              }));
              await supabase.from('company_bill_invoices').insert(dbSeedInvoices);
            }
          } catch (seedErr) {
            console.warn('Seed insert fallback to local', seedErr);
          }
        }
        setBills(initialSeedBills);
        setInvoices(initialSeedInvoices);
      } else {
        setBills(billsData.map(mapDbBillToApp));
        setInvoices((invData || []).map(mapDbInvoiceToApp));
      }
    } catch (err: any) {
      console.error('Error fetching bills from supabase:', err);
      setBills(initialSeedBills);
      setInvoices(initialSeedInvoices);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addBill = async (input: BillFormInput): Promise<CompanyBill | null> => {
    try {
      const dbPayload = {
        name: input.name,
        subscriber_no: input.subscriberNo,
        category: input.category,
        company: input.company,
        auto_payment: input.autoPayment,
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

      if (error) throw error;
      const created = mapDbBillToApp(data);
      setBills(prev => [...prev, created]);
      notify(`${created.name} başarıyla eklendi.`, 'success');
      return created;
    } catch (err: any) {
      notify(err.message || 'Fatura eklenirken hata oluştu.', 'error');
      return null;
    }
  };

  const updateBill = async (id: string, input: Partial<BillFormInput>) => {
    try {
      // Optimistic Update
      setBills(prev => prev.map(b => (b.id === id ? { ...b, ...input } : b)));

      const dbPayload: any = {};
      if (input.name !== undefined) dbPayload.name = input.name;
      if (input.subscriberNo !== undefined) dbPayload.subscriber_no = input.subscriberNo;
      if (input.category !== undefined) dbPayload.category = input.category;
      if (input.company !== undefined) dbPayload.company = input.company;
      if (input.autoPayment !== undefined) dbPayload.auto_payment = input.autoPayment;
      if (input.currentAmount !== undefined) dbPayload.current_amount = input.currentAmount;
      if (input.dueDate !== undefined) dbPayload.due_date = input.dueDate || null;
      if (input.billStatus !== undefined) dbPayload.bill_status = input.billStatus;
      if (input.notes !== undefined) dbPayload.notes = input.notes;
      dbPayload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('company_bills')
        .update(dbPayload)
        .eq('id', id);

      if (error) throw error;
      notify('Fatura bilgisi güncellendi.', 'success');
    } catch (err: any) {
      notify(err.message || 'Güncelleme hatası.', 'error');
      loadData();
    }
  };

  const deleteBill = async (id: string) => {
    try {
      setBills(prev => prev.filter(b => b.id !== id));
      setInvoices(prev => prev.filter(i => i.billId !== id));

      const { error } = await supabase
        .from('company_bills')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('Fatura kaydı silindi.', 'success');
    } catch (err: any) {
      notify(err.message || 'Silme işlemi başarısız.', 'error');
      loadData();
    }
  };

  const toggleBillStatus = async (billId: string, customDate?: string) => {
    const target = bills.find(b => b.id === billId);
    if (!target) return;

    const newStatus = target.billStatus === 'odendi' ? 'odenecek' : 'odendi';
    const today = customDate || new Date().toISOString().slice(0, 10);
    const lastPaidAt = newStatus === 'odendi' ? today : undefined;

    setBills(prev => prev.map(b => b.id === billId ? { ...b, billStatus: newStatus, lastPaidAt } : b));

    try {
      const { error } = await supabase
        .from('company_bills')
        .update({
          bill_status: newStatus,
          last_paid_at: lastPaidAt || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', billId);

      if (error) throw error;
      notify(`${target.name} durumu "${newStatus === 'odendi' ? 'Ödendi' : 'Ödenecek'}" olarak güncellendi.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Durum değiştirilemedi.', 'error');
      loadData();
    }
  };

  const addInvoice = async (input: InvoiceFormInput): Promise<BillInvoice | null> => {
    try {
      const dbPayload = {
        bill_id: input.billId,
        period: input.period,
        invoice_no: input.invoiceNo || '',
        invoice_date: input.invoiceDate || null,
        due_date: input.dueDate,
        amount: input.amount,
        paid_amount: input.paidAmount || (input.status === 'odendi' ? input.amount : 0),
        status: input.status,
        paid_at: input.paidAt || (input.status === 'odendi' ? new Date().toISOString().slice(0, 10) : null),
        payment_method: input.paymentMethod || '',
        notes: input.notes || ''
      };

      const { data, error } = await supabase
        .from('company_bill_invoices')
        .insert([dbPayload])
        .select()
        .single();

      if (error) throw error;
      const created = mapDbInvoiceToApp(data);
      setInvoices(prev => [created, ...prev]);

      // Also update latest amount and due date on parent bill
      updateBill(input.billId, {
        currentAmount: input.amount,
        dueDate: input.dueDate,
        billStatus: input.status === 'odendi' ? 'odendi' : 'odenecek'
      });

      notify('Fatura hareketi başarıyla kaydedildi.', 'success');
      return created;
    } catch (err: any) {
      notify(err.message || 'Fatura hareketi eklenirken hata oluştu.', 'error');
      return null;
    }
  };

  const updateInvoice = async (id: string, input: Partial<InvoiceFormInput>) => {
    try {
      setInvoices(prev => prev.map(i => (i.id === id ? { ...i, ...input } : i)));

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

      if (error) throw error;
      notify('Fatura hareketi güncellendi.', 'success');
    } catch (err: any) {
      notify(err.message || 'Güncelleme hatası.', 'error');
      loadData();
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      setInvoices(prev => prev.filter(i => i.id !== id));
      const { error } = await supabase
        .from('company_bill_invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      notify('Fatura hareketi silindi.', 'success');
    } catch (err: any) {
      notify(err.message || 'Silme işlemi başarısız.', 'error');
      loadData();
    }
  };

  const toggleInvoiceStatus = async (invoiceId: string, customDate?: string) => {
    const target = invoices.find(i => i.id === invoiceId);
    if (!target) return;

    const newStatus = target.status === 'odendi' ? 'odenecek' : 'odendi';
    const today = customDate || new Date().toISOString().slice(0, 10);
    const paidAt = newStatus === 'odendi' ? today : undefined;
    const paidAmount = newStatus === 'odendi' ? target.amount : 0;

    setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: newStatus, paidAt, paidAmount } : i));

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

      if (error) throw error;
      notify(`Fatura "${newStatus === 'odendi' ? 'Ödendi' : 'Ödenecek'}" olarak güncellendi.`, 'success');
    } catch (err: any) {
      notify(err.message || 'Durum değiştirilemedi.', 'error');
      loadData();
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
