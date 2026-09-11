import { createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode } from 'react';
import { supabase, normalizeFileName } from '../../lib/supabase'; import { useAuth } from '../../lib/auth';
import type { BankAccount,BankAccountInput,BankTransaction,BankTransactionInput } from './types';
const C=createContext<any>(null); type Row=Record<string,any>;
const account=(r:Row):BankAccount=>({id:r.id,bank:r.bank,accountName:r.account_name,accountType:r.account_type,iban:r.iban,accountNumber:r.account_number,branchName:r.branch_name,currency:r.currency,balance:Number(r.balance),availableBalance:Number(r.available_balance),status:r.status,description:r.description??undefined});
const transaction=(r:Row):BankTransaction=>({id:r.id,accountId:r.account_id,date:r.transaction_date,type:r.transaction_type,category:r.category,amount:Number(r.amount),counterparty:r.counterparty,description:r.description,hasReceipt:Boolean(r.receipt_path)});
const DEFAULT_ORG_ID = '13b8da90-27d1-440d-a8f4-eb50dadd6391';

export function BankAccountsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const org = user?.organizationId || DEFAULT_ORG_ID;

  const [accounts, setAccounts] = useState<BankAccount[]>(() => {
    try {
      const cached = localStorage.getItem('dars_cached_bank_accounts');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [transactions, setTransactions] = useState<BankTransaction[]>(() => {
    try {
      const cached = localStorage.getItem('dars_cached_bank_transactions');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(() => {
    try {
      if (localStorage.getItem('dars_cached_bank_accounts')) return false;
    } catch {}
    return true;
  });

  const refresh = useCallback(async () => {
    const activeOrg = org || DEFAULT_ORG_ID;
    try {
      const [a, t] = await Promise.all([
        supabase.from('bank_accounts').select('*').eq('organization_id', activeOrg).order('created_at', { ascending: false }),
        supabase.from('bank_transactions').select('*').eq('organization_id', activeOrg).order('transaction_date', { ascending: false })
      ]);
      if (a.error) throw a.error;
      if (t.error) throw t.error;
      const accs = (a.data ?? []).map(account);
      const txs = (t.data ?? []).map(transaction);
      setAccounts(accs);
      setTransactions(txs);
      try {
        localStorage.setItem('dars_cached_bank_accounts', JSON.stringify(accs));
        localStorage.setItem('dars_cached_bank_transactions', JSON.stringify(txs));
      } catch {}
    } catch (err) {
      console.warn('Banka hesapları yüklenemedi, önbellek korunuyor:', err);
    } finally {
      setLoading(false);
    }
  }, [org]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const need = () => {
    const activeOrg = org || DEFAULT_ORG_ID;
    return activeOrg;
  };

  const saveAccount = async (input: BankAccountInput, id?: string) => {
    const organization_id = need();
    const payload = {
      organization_id,
      bank: input.bank,
      account_name: input.accountName,
      account_type: input.accountType,
      iban: input.iban.replace(/\s/g, '').toUpperCase(),
      account_number: input.accountNumber,
      branch_name: input.branchName,
      currency: input.currency,
      balance: input.balance,
      available_balance: input.availableBalance,
      status: input.status,
      description: input.description
    };
    const q = id
      ? supabase.from('bank_accounts').update(payload).eq('id', id).eq('organization_id', organization_id)
      : supabase.from('bank_accounts').insert(payload);
    const { error } = await q;
    if (error) throw error;
    await refresh();
  };

  const deleteAccount = async (id: string) => {
    const { error } = await supabase.from('bank_accounts').delete().eq('id', id).eq('organization_id', need());
    if (error) throw error;
    await refresh();
  };

  const addTransaction = async (input: BankTransactionInput) => {
    const organization_id = need();
    let receipt_path: null | string = null;
    if (input.file) {
      const normalizedName = normalizeFileName(input.file.name);
      receipt_path = `${organization_id}/bank/${input.accountId}/${crypto.randomUUID()}-${normalizedName}`;
      const { error } = await supabase.storage.from('operations-documents').upload(receipt_path, input.file);
      if (error) throw error;
    }
    const { error } = await supabase.from('bank_transactions').insert({
      organization_id,
      account_id: input.accountId,
      transaction_date: input.date,
      transaction_type: input.type,
      category: input.category,
      amount: input.amount,
      counterparty: input.counterparty,
      description: input.description,
      receipt_path
    });
    if (error) throw error;
    const acc = accounts.find((a) => a.id === input.accountId);
    if (acc) {
      const next = acc.balance + (input.type === 'giris' ? input.amount : -input.amount);
      await supabase.from('bank_accounts').update({ balance: next, available_balance: next }).eq('id', acc.id).eq('organization_id', organization_id);
    }
    await refresh();
  };

  const addTransactions = async (inputs: BankTransactionInput[]) => {
    const organization_id = need();
    const records = inputs.map((input) => ({
      organization_id,
      account_id: input.accountId,
      transaction_date: input.date,
      transaction_type: input.type,
      category: input.category,
      amount: input.amount,
      counterparty: input.counterparty,
      description: input.description
    }));
    const { error } = await supabase.from('bank_transactions').insert(records);
    if (error) throw error;
    const accountUpdates = new Map<string, number>();
    inputs.forEach((input) => {
      const currentDiff = accountUpdates.get(input.accountId) || 0;
      const diff = input.type === 'giris' ? input.amount : -input.amount;
      accountUpdates.set(input.accountId, currentDiff + diff);
    });
    for (const [accountId, diff] of accountUpdates.entries()) {
      const acc = accounts.find((a) => a.id === accountId);
      if (acc) {
        const next = acc.balance + diff;
        await supabase.from('bank_accounts').update({ balance: next, available_balance: next }).eq('id', acc.id).eq('organization_id', organization_id);
      }
    }
    await refresh();
  };

  const value = useMemo(
    () => ({
      accounts,
      transactions,
      loading,
      refresh,
      saveAccount,
      deleteAccount,
      addTransaction,
      addTransactions,
      getAccount: (id: string) => accounts.find((a) => a.id === id),
      getTransactions: (id: string) => transactions.filter((t) => t.accountId === id)
    }),
    [accounts, transactions, loading, refresh]
  );

  return <C.Provider value={value}>{children}</C.Provider>;
}

export const useBankAccounts = () => {
  const x = useContext(C);
  if (!x) throw new Error('BankAccountsProvider gerekli');
  return x as {
    accounts: BankAccount[];
    transactions: BankTransaction[];
    loading: boolean;
    refresh: () => Promise<void>;
    saveAccount: (i: BankAccountInput, id?: string) => Promise<void>;
    deleteAccount: (id: string) => Promise<void>;
    addTransaction: (i: BankTransactionInput) => Promise<void>;
    addTransactions: (inputs: BankTransactionInput[]) => Promise<void>;
    getAccount: (id: string) => BankAccount | undefined;
    getTransactions: (id: string) => BankTransaction[];
  };
};

