import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { CreditCard, Statement, Payment, Transaction } from '../types';
import type { ParsedStatementTransaction } from '../lib/statementParser';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';

export interface NewCardInput {
  bank: string; cardName: string; cardType: CreditCard['cardType']; last4: string;
  holder: string; department: string; limit: number; currency: CreditCard['currency'];
  statementDay: number; dueDay: number; minPaymentRate: number; startDate: string;
  expiryMonth: number; expiryYear: number; status: CreditCard['status']; description?: string;
}

export interface NewStatementInput {
  cardId: string; period: string; statementDate: string; dueDate: string;
  totalDebt: number; minPayment: number; note?: string; fileName?: string;
  file?: File; transactions?: ParsedStatementTransaction[];
}

export interface NewPaymentInput {
  cardId: string; date: string; amount: number; type: Payment['type'];
  bankAccount: string; description?: string;
}

interface StoreContextValue {
  cards: CreditCard[]; statements: Statement[]; payments: Payment[]; transactions: Transaction[];
  loading: boolean; error: string | null; refresh: () => Promise<void>;
  addCard: (input: NewCardInput) => Promise<CreditCard>;
  updateCard: (id: string, input: NewCardInput) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  addStatement: (input: NewStatementInput) => Promise<Statement>;
  deleteStatement: (id: string) => Promise<void>;
  addPayment: (input: NewPaymentInput) => Promise<Payment>;
  revertCardPayment: (cardId: string) => Promise<number>;
  getCard: (id: string) => CreditCard | undefined;
  getStatementsByCard: (cardId: string) => Statement[];
  getStatement: (id: string) => Statement | undefined;
  getTransactionsByCard: (cardId: string) => Transaction[];
  getTransactionsByStatement: (statementId: string) => Transaction[];
  getPaymentsByCard: (cardId: string) => Payment[];
}

type Row = Record<string, any>;
const cardFromRow = (r: Row): CreditCard => ({
  id: r.id, bank: r.bank, bankShort: r.bank_short, cardName: r.card_name,
  cardType: r.card_type, last4: r.last4, holder: r.holder, department: r.department,
  limit: Number(r.card_limit), currentDebt: Number(r.current_debt), currency: r.currency,
  statementDay: r.statement_day, dueDay: r.due_day, minPaymentRate: Number(r.min_payment_rate),
  startDate: r.start_date, expiryMonth: r.expiry_month, expiryYear: r.expiry_year,
  status: r.status, statementStatus: r.statement_status, description: r.description ?? undefined,
});
const statementFromRow = (r: Row): Statement => ({
  id: r.id, cardId: r.card_id, period: r.period, statementDate: r.statement_date,
  dueDate: r.due_date, totalDebt: Number(r.total_debt), minPayment: Number(r.min_payment),
  transactionCount: r.transaction_count, hasFile: Boolean(r.file_path), fileName: r.file_name ?? undefined,
  filePath: r.file_path ?? undefined,
  aiStatus: r.ai_status, paymentStatus: r.payment_status, note: r.note ?? undefined,
});
const transactionFromRow = (r: Row): Transaction => ({
  id: r.id, cardId: r.card_id, statementId: r.statement_id, date: r.transaction_date,
  merchant: r.merchant, description: r.description, category: r.category, amount: Number(r.amount),
  installments: r.installments, spender: r.spender, reviewStatus: r.review_status, unusual: r.unusual,
});
const paymentFromRow = (r: Row): Payment => ({
  id: r.id, cardId: r.card_id, statementId: r.statement_id ?? undefined, date: r.payment_date,
  amount: Number(r.amount), type: r.payment_type, bankAccount: r.bank_account,
  description: r.description ?? undefined, hasReceipt: Boolean(r.receipt_path), recordedBy: 'Muhasebe',
});

const DEFAULT_ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
const CACHE_KEY_CARDS = 'dars_cached_credit_cards';
const CACHE_KEY_STATEMENTS = 'dars_cached_credit_card_statements';
const CACHE_KEY_PAYMENTS = 'dars_cached_credit_card_payments';
const CACHE_KEY_TRANSACTIONS = 'dars_cached_credit_card_transactions';

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const orgId = user?.organizationId || DEFAULT_ORG_ID;
  const [cards, setCards] = useState<CreditCard[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CARDS);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [statements, setStatements] = useState<Statement[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_STATEMENTS);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [payments, setPayments] = useState<Payment[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_PAYMENTS);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_TRANSACTIONS);
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY_CARDS);
      return !cached || JSON.parse(cached).length === 0;
    } catch {
      return true;
    }
  });
  const [error, setError] = useState<string | null>(null);

  const requireOrg = useCallback(() => {
    return orgId || DEFAULT_ORG_ID;
  }, [orgId]);

  const refresh = useCallback(async () => {
    const targetOrg = orgId || DEFAULT_ORG_ID;
    setError(null);
    try {
      const [cardRes, statementRes, transactionRes, paymentRes] = await Promise.all([
        supabase.from('credit_cards').select('*').eq('organization_id', targetOrg).order('created_at', { ascending: false }),
        supabase.from('statements').select('*').eq('organization_id', targetOrg).order('statement_date', { ascending: false }),
        supabase.from('transactions').select('*').eq('organization_id', targetOrg).order('transaction_date', { ascending: false }),
        supabase.from('payments').select('*').eq('organization_id', targetOrg).order('payment_date', { ascending: false }),
      ]);
      const failed = [cardRes, statementRes, transactionRes, paymentRes].find((r) => r.error);
      if (failed?.error) {
        console.warn('Kredi kartları sorgu hatası:', failed.error);
        setError(failed.error.message);
      } else {
        const fetchedCards = (cardRes.data ?? []).map(cardFromRow);
        const fetchedStatements = (statementRes.data ?? []).map(statementFromRow);
        const fetchedTransactions = (transactionRes.data ?? []).map(transactionFromRow);
        const fetchedPayments = (paymentRes.data ?? []).map(paymentFromRow);

        setCards(fetchedCards);
        setStatements(fetchedStatements);
        setTransactions(fetchedTransactions);
        setPayments(fetchedPayments);

        try {
          localStorage.setItem(CACHE_KEY_CARDS, JSON.stringify(fetchedCards));
          localStorage.setItem(CACHE_KEY_STATEMENTS, JSON.stringify(fetchedStatements));
          localStorage.setItem(CACHE_KEY_TRANSACTIONS, JSON.stringify(fetchedTransactions));
          localStorage.setItem(CACHE_KEY_PAYMENTS, JSON.stringify(fetchedPayments));
        } catch {}
      }
    } catch (err: any) {
      console.error('Kredi kartları yükleme hatası:', err);
      setError(err?.message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { void refresh().catch(console.error); }, [refresh]);

  const addCard = useCallback(async (input: NewCardInput) => {
    const organizationId = requireOrg();
    const bankShort = input.bank.split(' ').map((w) => w[0]).join('').slice(0, 5).toUpperCase();
    const { data, error: dbError } = await supabase.from('credit_cards').insert({
      organization_id: organizationId, bank: input.bank, bank_short: bankShort,
      card_name: input.cardName, card_type: input.cardType, last4: input.last4,
      holder: input.holder, department: input.department, card_limit: input.limit,
      currency: input.currency, statement_day: input.statementDay, due_day: input.dueDay,
      min_payment_rate: input.minPaymentRate, start_date: input.startDate,
      expiry_month: input.expiryMonth, expiry_year: input.expiryYear,
      status: input.status, description: input.description,
    }).select().single();
    if (dbError) throw dbError;
    const card = cardFromRow(data); setCards((prev) => [card, ...prev]); return card;
  }, [requireOrg]);

  const updateCard = useCallback(async (id: string, input: NewCardInput) => {
    const organizationId = requireOrg();
    const bankShort = input.bank.split(' ').map((w) => w[0]).join('').slice(0, 5).toUpperCase();
    const { data, error: dbError } = await supabase.from('credit_cards').update({
      bank: input.bank, bank_short: bankShort, card_name: input.cardName, card_type: input.cardType,
      last4: input.last4, holder: input.holder, department: input.department, card_limit: input.limit,
      currency: input.currency, statement_day: input.statementDay, due_day: input.dueDay,
      min_payment_rate: input.minPaymentRate, start_date: input.startDate, expiry_month: input.expiryMonth,
      expiry_year: input.expiryYear, status: input.status, description: input.description,
    }).eq('id', id).eq('organization_id', organizationId).select().single();
    if (dbError) throw dbError;
    setCards((prev) => prev.map((c) => c.id === id ? cardFromRow(data) : c));
  }, [requireOrg]);

  const deleteCard = useCallback(async (id: string) => {
    const organizationId = requireOrg();
    const { error: dbError } = await supabase.from('credit_cards').delete().eq('id', id).eq('organization_id', organizationId);
    if (dbError) throw dbError;
    await refresh();
  }, [requireOrg, refresh]);

  const addStatement = useCallback(async (input: NewStatementInput) => {
    const organizationId = requireOrg();
    let filePath: string | null = null;
    if (input.file) {
      filePath = `${organizationId}/${input.cardId}/${crypto.randomUUID()}.pdf`;
      const { error: uploadError } = await supabase.storage.from('credit-card-statements').upload(filePath, input.file, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;
    }
    const parsed = input.transactions ?? [];
    const { data, error: statementError } = await supabase.from('statements').insert({
      organization_id: organizationId, card_id: input.cardId, period: input.period,
      statement_date: input.statementDate, due_date: input.dueDate, total_debt: input.totalDebt,
      min_payment: input.minPayment, transaction_count: parsed.length, file_name: input.fileName,
      file_path: filePath, note: input.note,
    }).select().single();
    if (statementError) { if (filePath) await supabase.storage.from('credit-card-statements').remove([filePath]); throw statementError; }
    if (parsed.length) {
      const uniqueMerchants = [...new Set(parsed.map(t => t.merchant))];
      const { data: history } = await supabase
        .from('transactions')
        .select('merchant, category')
        .eq('organization_id', organizationId)
        .in('merchant', uniqueMerchants);

      const historyMap = new Map<string, string>();
      if (history) {
        for (const row of history) {
          if (row.category && row.category !== 'diger') {
            historyMap.set(row.merchant, row.category);
          } else if (!historyMap.has(row.merchant)) {
            historyMap.set(row.merchant, row.category || 'diger');
          }
        }
      }

      const holder = cards.find((card) => card.id === input.cardId)?.holder ?? 'Bilinmiyor';
      const { error: transactionError } = await supabase.from('transactions').insert(parsed.map((t) => ({
        organization_id: organizationId, card_id: input.cardId, statement_id: data.id,
        transaction_date: t.date, merchant: t.merchant, description: t.description,
        category: historyMap.get(t.merchant) || t.category, amount: t.amount, installments: t.installments,
        spender: holder, review_status: t.reviewStatus, unusual: false,
      })));
      if (transactionError) { await supabase.from('statements').delete().eq('id', data.id); throw transactionError; }
    }
    await supabase.from('credit_cards').update({ current_debt: input.totalDebt, statement_status: 'yuklendi' }).eq('id', input.cardId).eq('organization_id', organizationId);
    await refresh();
    return statementFromRow(data);
  }, [cards, requireOrg, refresh]);

  const deleteStatement = useCallback(async (id: string) => {
    const organizationId = requireOrg();
    
    // Explicitly delete transactions first to avoid orphan transactions
    const { error: txDeleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('statement_id', id)
      .eq('organization_id', organizationId);
    if (txDeleteError) throw txDeleteError;

    const { data } = await supabase.from('statements').select('file_path').eq('id', id).eq('organization_id', organizationId).maybeSingle();
    const { error: dbError } = await supabase.from('statements').delete().eq('id', id).eq('organization_id', organizationId);
    if (dbError) throw dbError;
    if (data?.file_path) await supabase.storage.from('credit-card-statements').remove([data.file_path]);
    await refresh();
  }, [requireOrg, refresh]);

  const addPayment = useCallback(async (input: NewPaymentInput) => {
    const organizationId = requireOrg();
    
    // Find the target card to read current debt
    const card = cards.find(c => c.id === input.cardId);
    if (!card) throw new Error('Kart bulunamadı.');

    const { data, error: dbError } = await supabase.from('payments').insert({
      organization_id: organizationId, card_id: input.cardId, payment_date: input.date,
      amount: input.amount, payment_type: input.type, bank_account: input.bankAccount,
      description: input.description,
    }).select().single();
    if (dbError) throw dbError;

    // Update credit card's current debt in the database
    const newDebt = Math.max(0, (Number(card.currentDebt) || 0) - input.amount);
    const { error: cardUpdateError } = await supabase
      .from('credit_cards')
      .update({ current_debt: newDebt })
      .eq('id', input.cardId);
    if (cardUpdateError) throw cardUpdateError;

    const payment = paymentFromRow(data); 
    setPayments((prev) => [payment, ...prev]); 
    await refresh();
    return payment;
  }, [requireOrg, cards, refresh]);

  const revertCardPayment = useCallback(async (cardId: string) => {
    const organizationId = requireOrg();
    const card = cards.find(c => c.id === cardId);
    if (!card) throw new Error('Kart bulunamadı.');

    // 1. Doğrudan Supabase'den en son ödemeyi sorgula
    const { data: dbPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('card_id', cardId)
      .order('created_at', { ascending: false })
      .limit(1);

    const latestPayment = dbPayments && dbPayments.length > 0 ? dbPayments[0] : null;

    if (latestPayment) {
      const { error: delError } = await supabase
        .from('payments')
        .delete()
        .eq('id', latestPayment.id);
      if (delError) throw delError;

      const restoredDebt = (Number(card.currentDebt) || 0) + (Number(latestPayment.amount) || 0);
      const { error: cardUpError } = await supabase
        .from('credit_cards')
        .update({ current_debt: restoredDebt })
        .eq('id', cardId);
      if (cardUpError) throw cardUpError;

      await refresh();
      return Number(latestPayment.amount) || 0;
    }

    // 2. Eğer kayıtlı ödeme yoksa kullanıcıdan geri yüklenecek borç tutarını iste
    const defaultVal = card.limit > 0 ? String(card.limit) : "50000";
    const promptVal = window.prompt(
      `${card.bank} •••• ${card.last4} kartı için sistemde kayıtlı geçmiş ödeme bulunamadı.\n\nKarta geri yüklemek istediğiniz güncel borç tutarını girin (₺):`,
      defaultVal
    );

    if (promptVal === null) {
      throw new Error('İşlem iptal edildi.');
    }

    const cleanVal = promptVal.replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    const manualAmount = parseFloat(cleanVal);
    if (isNaN(manualAmount) || manualAmount <= 0) {
      throw new Error('Geçersiz bir borç tutarı girildi.');
    }

    const { error: cardUpError } = await supabase
      .from('credit_cards')
      .update({ current_debt: manualAmount })
      .eq('id', cardId);
    if (cardUpError) throw cardUpError;

    await refresh();
    return manualAmount;
  }, [requireOrg, cards, refresh]);

  const getCard = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);
  const getStatementsByCard = useCallback((cardId: string) => statements.filter((s) => s.cardId === cardId), [statements]);
  const getStatement = useCallback((id: string) => statements.find((s) => s.id === id), [statements]);
  const getTransactionsByCard = useCallback((cardId: string) => transactions.filter((t) => t.cardId === cardId), [transactions]);
  const getTransactionsByStatement = useCallback((statementId: string) => transactions.filter((t) => t.statementId === statementId), [transactions]);
  const getPaymentsByCard = useCallback((cardId: string) => payments.filter((p) => p.cardId === cardId), [payments]);

  const value = useMemo<StoreContextValue>(() => ({ cards, statements, payments, transactions, loading, error, refresh,
    addCard, updateCard, deleteCard, addStatement, deleteStatement, addPayment, revertCardPayment, getCard, getStatementsByCard,
    getStatement, getTransactionsByCard, getTransactionsByStatement, getPaymentsByCard,
  }), [cards, statements, payments, transactions, loading, error, refresh, addCard, updateCard, deleteCard, addStatement, deleteStatement, addPayment, revertCardPayment, getCard, getStatementsByCard, getStatement, getTransactionsByCard, getTransactionsByStatement, getPaymentsByCard]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
