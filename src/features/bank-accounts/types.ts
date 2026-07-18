export interface BankAccount { id:string; bank:string; accountName:string; accountType:'vadesiz'|'vadeli'|'kredi'|'pos'; iban:string; accountNumber:string; branchName:string; currency:'TRY'|'USD'|'EUR'; balance:number; availableBalance:number; status:'aktif'|'pasif'|'bloke'; description?:string }
export interface BankTransaction { id:string; accountId:string; date:string; type:'giris'|'cikis'; category:string; amount:number; counterparty:string; description:string; hasReceipt:boolean }
export type BankAccountInput = Omit<BankAccount,'id'|'balance'|'availableBalance'> & { balance:number; availableBalance:number };
export interface BankTransactionInput { accountId:string; date:string; type:'giris'|'cikis'; category:string; amount:number; counterparty:string; description:string; file?:File }
