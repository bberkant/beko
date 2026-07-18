import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from 'react';
import type { CreditCard, Statement, Payment, Transaction } from '../types';
import type { ParsedStatementTransaction } from '../lib/statementParser';
import {
  seedCards, seedStatements, seedTransactions, seedPayments,
} from './seed';

const CARDS_KEY = 'ops360_cc_cards';
const STATEMENTS_KEY = 'ops360_cc_statements';
const PAYMENTS_KEY = 'ops360_cc_payments';
const TRANSACTIONS_KEY = 'ops360_cc_transactions';

function load<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function save<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export interface NewCardInput {
  bank: string;
  cardName: string;
  cardType: CreditCard['cardType'];
  last4: string;
  holder: string;
  department: string;
  limit: number;
  currency: CreditCard['currency'];
  statementDay: number;
  dueDay: number;
  minPaymentRate: number;
  startDate: string;
  expiryMonth: number;
  expiryYear: number;
  status: CreditCard['status'];
  description?: string;
}

export interface NewStatementInput {
  cardId: string;
  period: string;
  statementDate: string;
  dueDate: string;
  totalDebt: number;
  minPayment: number;
  note?: string;
  fileName?: string;
  transactions?: ParsedStatementTransaction[];
}

export interface NewPaymentInput {
  cardId: string;
  date: string;
  amount: number;
  type: Payment['type'];
  bankAccount: string;
  description?: string;
}

interface StoreContextValue {
  cards: CreditCard[];
  statements: Statement[];
  payments: Payment[];
  transactions: Transaction[];
  addCard: (input: NewCardInput) => CreditCard;
  updateCard: (id: string, input: NewCardInput) => void;
  deleteCard: (id: string) => void;
  addStatement: (input: NewStatementInput) => Statement;
  deleteStatement: (id: string) => void;
  addPayment: (input: NewPaymentInput) => Payment;
  getCard: (id: string) => CreditCard | undefined;
  getStatementsByCard: (cardId: string) => Statement[];
  getStatement: (id: string) => Statement | undefined;
  getTransactionsByCard: (cardId: string) => Transaction[];
  getTransactionsByStatement: (statementId: string) => Transaction[];
  getPaymentsByCard: (cardId: string) => Payment[];
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<CreditCard[]>(() => load(CARDS_KEY, seedCards));
  const [statements, setStatements] = useState<Statement[]>(() => load(STATEMENTS_KEY, seedStatements));
  const [payments, setPayments] = useState<Payment[]>(() => load(PAYMENTS_KEY, seedPayments));
  const [transactions, setTransactions] = useState<Transaction[]>(() => load(TRANSACTIONS_KEY, seedTransactions));

  useEffect(() => { save(CARDS_KEY, cards); }, [cards]);
  useEffect(() => { save(STATEMENTS_KEY, statements); }, [statements]);
  useEffect(() => { save(PAYMENTS_KEY, payments); }, [payments]);
  useEffect(() => { save(TRANSACTIONS_KEY, transactions); }, [transactions]);

  const addCard = useCallback((input: NewCardInput): CreditCard => {
    const bankShort = input.bank.split(' ').map((w) => w[0]).join('').slice(0, 5).toUpperCase();
    const newCard: CreditCard = {
      id: genId('cc'),
      ...input,
      bankShort,
      currentDebt: 0,
      statementStatus: 'bekleniyor',
    };
    setCards((prev) => [newCard, ...prev]);
    return newCard;
  }, []);

  const updateCard = useCallback((id: string, input: NewCardInput) => {
    const bankShort = input.bank.split(' ').map((w) => w[0]).join('').slice(0, 5).toUpperCase();
    setCards((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...input, bankShort }
          : c,
      ),
    );
  }, []);

  const deleteCard = useCallback((id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    setStatements((prev) => prev.filter((s) => s.cardId !== id));
    setPayments((prev) => prev.filter((p) => p.cardId !== id));
    setTransactions((prev) => prev.filter((t) => t.cardId !== id));
  }, []);

  const addStatement = useCallback((input: NewStatementInput): Statement => {
    const statementId = genId('st');
    const parsedTransactions = input.transactions ?? [];
    const newStmt: Statement = {
      id: statementId,
      cardId: input.cardId,
      period: input.period,
      statementDate: input.statementDate,
      dueDate: input.dueDate,
      totalDebt: input.totalDebt,
      minPayment: input.minPayment,
      note: input.note,
      fileName: input.fileName,
      transactionCount: parsedTransactions.length,
      hasFile: true,
      aiStatus: 'analiz-bekliyor',
      paymentStatus: 'odenmedi',
    };
    const newTransactions: Transaction[] = parsedTransactions.map((transaction, index) => ({
      id: `${statementId}-tx-${index + 1}`,
      cardId: input.cardId,
      statementId,
      spender: cards.find((card) => card.id === input.cardId)?.holder ?? 'Bilinmiyor',
      ...transaction,
    }));
    setStatements((prev) => [newStmt, ...prev]);
    setTransactions((prev) => [...newTransactions, ...prev]);
    setCards((prev) =>
      prev.map((c) =>
        c.id === input.cardId
          ? { ...c, currentDebt: input.totalDebt, statementStatus: 'yuklendi' as const }
          : c,
      ),
    );
    return newStmt;
  }, [cards]);

  const deleteStatement = useCallback((id: string) => {
    setStatements((prev) => prev.filter((s) => s.id !== id));
    setTransactions((prev) => prev.filter((t) => t.statementId !== id));
  }, []);

  const addPayment = useCallback((input: NewPaymentInput): Payment => {
    const newPay: Payment = {
      id: genId('py'),
      ...input,
      hasReceipt: false,
      recordedBy: 'Muhasebe',
    };
    setPayments((prev) => [newPay, ...prev]);
    return newPay;
  }, []);

  const getCard = useCallback((id: string) => cards.find((c) => c.id === id), [cards]);
  const getStatementsByCard = useCallback((cardId: string) => statements.filter((s) => s.cardId === cardId), [statements]);
  const getStatement = useCallback((id: string) => statements.find((s) => s.id === id), [statements]);
  const getTransactionsByCard = useCallback((cardId: string) => transactions.filter((t) => t.cardId === cardId), [transactions]);
  const getTransactionsByStatement = useCallback((statementId: string) => transactions.filter((t) => t.statementId === statementId), [transactions]);
  const getPaymentsByCard = useCallback((cardId: string) => payments.filter((p) => p.cardId === cardId), [payments]);

  const value = useMemo<StoreContextValue>(() => ({
    cards, statements, payments, transactions,
    addCard, updateCard, deleteCard,
    addStatement, deleteStatement, addPayment,
    getCard, getStatementsByCard, getStatement,
    getTransactionsByCard, getTransactionsByStatement, getPaymentsByCard,
  }), [cards, statements, payments, transactions, addCard, updateCard, deleteCard, addStatement, deleteStatement, addPayment, getCard, getStatementsByCard, getStatement, getTransactionsByCard, getTransactionsByStatement, getPaymentsByCard]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
