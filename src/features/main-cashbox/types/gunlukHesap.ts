export interface BankTxItem {
  amount: number | null;
  description: string;
}

export interface BankAccountData {
  bankName: string;
  outflows: Record<number, BankTxItem>;
  inflows: Record<number, BankTxItem>;
  totalOut: number;
  totalIn: number;
  diff: number;
  diffType: 'ALDIK' | 'YATAN';
  maxRowIndex?: number;
}

export type GunlukHesapBanks = Record<string, BankAccountData>;

export const DEFAULT_BANK_ORDER = [
  'HALKBANK',
  'ZİRAAT',
  'GARANTİ',
  'AKBANK',
  'İŞBANK',
  'DENİZ',
  'ŞEKER/TEB',
  'YAPI',
  'ALBARAKA',
  'VAKIF',
  'KUVEYT'
];

export function emptyBankData(bankName: string): BankAccountData {
  return {
    bankName,
    outflows: {},
    inflows: {},
    totalOut: 0,
    totalIn: 0,
    diff: 0,
    diffType: 'ALDIK',
    maxRowIndex: -1
  };
}
