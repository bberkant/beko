import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { darsApiCall } from './darsApi';
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

// Initial fallback seed data (Gerçek Şirket Kurum Faturaları)
const initialSeedBills: CompanyBill[] = [
  {
    id: "337b784a-219e-4921-a318-25b5e0b3e70b",
    name: "ATAKUM SU",
    subscriberNo: "0000000239143",
    category: "su",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-24",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:14:12.081028+00:00",
    updatedAt: "2026-09-14T12:14:12.081028+00:00"
  },
  {
    id: "47a59839-08e6-475a-94af-2572fc5af6be",
    name: "CEM YENİ EV ELEKTRİK",
    subscriberNo: "004003645325",
    category: "elektrik",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-14",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:19:39.651455+00:00",
    updatedAt: "2026-09-14T12:19:39.651455+00:00"
  },
  {
    id: "2fd072ec-173d-42f2-860c-d80055c35f7b",
    name: "CEM YENİ EV DOĞALGAZ",
    subscriberNo: "810001784012",
    category: "dogalgaz",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-14",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:19:53.9765+00:00",
    updatedAt: "2026-09-14T12:19:53.9765+00:00"
  },
  {
    id: "4438c7b7-4b9c-4a19-bf10-95646371ecee",
    name: "DEPO YENİ SUPERBOX",
    subscriberNo: "5350631150",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-14",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:21:09.71325+00:00",
    updatedAt: "2026-09-14T12:21:09.71325+00:00"
  },
  {
    id: "02888409-3865-402a-abaf-e3b1d93757f3",
    name: "OFİS ELEKTRİK",
    subscriberNo: "004003077585",
    category: "elektrik",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-11-08",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:25:13.674442+00:00",
    updatedAt: "2026-10-28T10:56:33.035+00:00"
  },
  {
    id: "b1111111-1111-4111-8111-111111111111",
    name: "İLKADIM ELEKTRİK",
    subscriberNo: "4003036514",
    category: "elektrik",
    company: "ETİK",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 84081,
    dueDate: "2026-09-10",
    billStatus: "odenecek",
    notes: "Merkez fabrika elektrik aboneliği",
    createdAt: "2026-09-13T12:07:54.443429+00:00",
    updatedAt: "2026-09-14T12:23:14.816+00:00"
  },
  {
    id: "90b71aff-a91d-4735-8f35-3a3e0554738d",
    name: "ATAKUM ELEKTRİK",
    subscriberNo: "4003036466",
    category: "elektrik",
    company: "ETİK",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 94207,
    dueDate: "2026-08-10",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-13T12:40:16.911108+00:00",
    updatedAt: "2026-09-14T12:23:21.717+00:00"
  },
  {
    id: "1182ebe6-3f98-461c-838d-8f376d608a2d",
    name: "MERZİFON ELEKTRİK",
    subscriberNo: "004002983653",
    category: "elektrik",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-08-10",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:24:30.889455+00:00",
    updatedAt: "2026-09-14T12:24:30.889455+00:00"
  },
  {
    id: "0c836abe-283c-4b2c-818c-bb250c1b5e33",
    name: "OFİS SU",
    subscriberNo: "002956",
    category: "su",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-21",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:26:28.223336+00:00",
    updatedAt: "2026-09-14T12:26:28.223336+00:00"
  },
  {
    id: "f9ec0ee2-5fef-479b-95d5-f14b8664b243",
    name: "OFİS TTNET",
    subscriberNo: "7050048890",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-16",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:27:58.225407+00:00",
    updatedAt: "2026-09-14T12:27:58.225407+00:00"
  },
  {
    id: "5136a6d5-57e7-4289-b509-b0c08cda9b0f",
    name: "OFİS YENİ SUPERBOX",
    subscriberNo: "5350631125",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-14",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:29:19.923175+00:00",
    updatedAt: "2026-09-14T12:29:19.923175+00:00"
  },
  {
    id: "581b3529-d69e-46fd-8ed8-6f2714623466",
    name: "ŞİŞMANLAR ELEKTRİK",
    subscriberNo: "004003157628",
    category: "elektrik",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-14",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:30:22.737416+00:00",
    updatedAt: "2026-09-14T12:30:22.737416+00:00"
  },
  {
    id: "5ff20a1f-1ed6-4858-8331-71f295db490a",
    name: "SUCUKHANE ELEKTRİK",
    subscriberNo: "004002939958",
    category: "elektrik",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-10",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:30:59.672387+00:00",
    updatedAt: "2026-09-14T12:30:59.672387+00:00"
  },
  {
    id: "2e27b926-7340-4e6d-b2bb-5cc0be92e89d",
    name: "TELEKOM YENİ ŞİRKET HATTI",
    subscriberNo: "9949723018",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-16",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:43:26.857718+00:00",
    updatedAt: "2026-09-14T12:43:26.857718+00:00"
  },
  {
    id: "14925e4d-5b3a-4fe6-9227-59ec15509927",
    name: "VETERİNER YENİ SUPERBOX",
    subscriberNo: "5350631151",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-09-14",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:45:02.942256+00:00",
    updatedAt: "2026-09-14T12:45:02.942256+00:00"
  },
  {
    id: "6a9f1dd0-d26b-452b-a9cd-3ff63c8f4e8a",
    name: "AKSA TOKAT DOĞALGAZ",
    subscriberNo: "800003961898",
    category: "dogalgaz",
    company: "GENEL",
    autoPayment: true,
    autoPaymentBank: "E.GARANTİDEYDİ KUVEYT ALDIK",
    currentAmount: 0,
    dueDate: "2026-09-29",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T13:41:54.650727+00:00",
    updatedAt: "2026-09-14T13:42:15.85+00:00"
  },
  {
    id: "d1fb2777-6bb1-4d8b-9707-7b59a73f594f",
    name: "CEM İNTERNET",
    subscriberNo: "7026981925",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-10-02",
    billStatus: "odenecek",
    notes: "MARİF ZİRAAT",
    createdAt: "2026-09-14T12:51:02.951932+00:00",
    updatedAt: "2026-10-02T13:48:39.741+00:00"
  },
  {
    id: "166c0f26-43d9-425c-a4e0-153254e9ddf5",
    name: "APO ABİ ŞİRKET HATTI",
    subscriberNo: "05304540561",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: true,
    autoPaymentBank: "KUVEYT",
    currentAmount: 0,
    dueDate: "2026-09-04",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T13:08:19.143503+00:00",
    updatedAt: "2026-11-04T10:24:47.837+00:00"
  },
  {
    id: "b704426e-17f2-4202-b086-409474b4c010",
    name: "5384275521",
    subscriberNo: "5384275521",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-11-05",
    billStatus: "odenecek",
    notes: "NE OLDUĞU BİLİNMİYOR",
    createdAt: "2026-09-14T12:44:31.777605+00:00",
    updatedAt: "2026-11-05T12:45:44.128+00:00"
  },
  {
    id: "799f0f35-bc85-4472-8513-bb42e0b74b96",
    name: "5314048109",
    subscriberNo: "5314048109",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-11-05",
    billStatus: "odenecek",
    notes: "NE OLDUĞU BİLİNMİYOR",
    createdAt: "2026-09-14T12:44:45.117459+00:00",
    updatedAt: "2026-11-05T12:45:52.181+00:00"
  },
  {
    id: "b09e3525-6e03-466d-9923-661835bb4547",
    name: "5342808174",
    subscriberNo: "5342808174",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: false,
    autoPaymentBank: "",
    currentAmount: 0,
    dueDate: "2026-11-05",
    billStatus: "odenecek",
    notes: "NE OLDUĞU BİLİNMİYOR",
    createdAt: "2026-11-04T10:13:13.241405+00:00",
    updatedAt: "2026-11-05T12:45:59.898+00:00"
  },
  {
    id: "f0b831bc-705f-42f0-92e6-45147f8820ef",
    name: "CEM 532",
    subscriberNo: "5326118132",
    category: "internet_telefon",
    company: "GENEL",
    autoPayment: true,
    autoPaymentBank: "KUVEYT",
    currentAmount: 0,
    dueDate: "2026-09-05",
    billStatus: "odenecek",
    notes: "",
    createdAt: "2026-09-14T12:18:22.924117+00:00",
    updatedAt: "2026-11-05T12:46:13.963+00:00"
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
      if (Array.isArray(parsed) && parsed.length >= 20) return parsed;
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
      const res = await darsApiCall('get_all');
      if (res && res.success && Array.isArray(res.bills)) {
        const mappedBills = res.bills.map(mapDbBillToApp);
        const mappedInvoices = (res.invoices || []).map(mapDbInvoiceToApp);
        setBills(mappedBills);
        setInvoices(mappedInvoices);
        persistBillsToStorage(mappedBills);
        persistInvoicesToStorage(mappedInvoices);
        setIsOffline(false);
      } else {
        throw new Error(res?.error || 'Veriler alınamadı');
      }
    } catch (err: any) {
      console.warn('Bills DARS API fetch notice, using local cache:', err);
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

      const res = await darsApiCall('add_bill', { id: tempId, ...dbPayload });

      if (res && res.success && res.bill) {
        const created = mapDbBillToApp(res.bill);
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

      await darsApiCall('update_bill', { id, ...dbPayload });
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
      await darsApiCall('delete_bill', { id });
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
      await darsApiCall('toggle_bill_status', {
        id: billId,
        bill_status: newStatus,
        last_paid_at: lastPaidAt || null
      });
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

      const res = await darsApiCall('add_invoice', { id: tempId, ...dbPayload });

      if (res && res.success && res.invoice) {
        const created = mapDbInvoiceToApp(res.invoice);
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

      await darsApiCall('update_invoice', { id, ...dbPayload });
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
      await darsApiCall('delete_invoice', { id });
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
      await darsApiCall('toggle_invoice_status', {
        id: invoiceId,
        status: newStatus,
        paid_at: paidAt || null,
        paid_amount: paidAmount
      });
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

