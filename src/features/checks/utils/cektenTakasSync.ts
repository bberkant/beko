import { fixCorruptedTurkishText } from '../../../lib/turkishTextFixer';

export const cleanStatus = (status: string | null | undefined): string => {
  if (!status) return '';
  let cleaned = status
    .replace(/Ã–/g, 'Ö')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Ä°/g, 'İ')
    .replace(/Ã‡/g, 'Ç')
    .replace(/Ãž/g, 'Ş')
    .replace(/Äž/g, 'Ğ')
    .replace(/Ä±/g, 'ı')
    .replace(/Ã¶/g, 'ö')
    .replace(/ã¶/g, 'ö')
    .replace(/ã–/g, 'ö')
    .replace(/ãœ/g, 'ü')
    .replace(/ã¼/g, 'ü')
    .replace(/ä°/g, 'i')
    .replace(/ä±/g, 'ı')
    .replace(/ã§/g, 'ç')
    .replace(/ãŸ/g, 'ş')
    .replace(/äÿ/g, 'ğ')
    .replace(/ã°/g, 'ı')
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/\u0307/g, '');
  return cleaned;
};

export const isCheckPaid = (status: string | null | undefined): boolean => {
  const clean = cleanStatus(status);
  return clean.includes('ödendi') || 
         clean.includes('ödenen') || 
         clean.includes('tahsil edildi') || 
         clean.includes('portföyden tahsil') ||
         clean.includes('bankadan tahsil') ||
         clean.includes('icradan tahsil') ||
         clean.includes('tahsilat') || 
         clean.includes('ciro') ||
         clean.includes('iade') || 
         clean.includes('iptal');
};

export const formatDateForDB = (dateStr: string) => {
  if (!dateStr) return '';
  const cleanDate = dateStr.trim().includes('T') ? dateStr.trim().split('T')[0] : dateStr.trim();
  const parts = cleanDate.split('-');
  if (parts.length === 3) {
    return `${parts[2].trim()}.${parts[1].trim()}.${parts[0].trim()}`; // yyyy-mm-dd to dd.mm.yyyy
  }
  return dateStr.trim();
};

export const isCektenCheck = (c: any): boolean => {
  if (!c) return false;
  if (c.id && String(c.id).startsWith('cekten_')) return true;
  const debtorClean = cleanStatus(String(c.debtor || ''));
  const bankClean = cleanStatus(String(c.bank_name || ''));
  const ozelClean = cleanStatus(String(c.ozel_alan || ''));
  const notlarClean = cleanStatus(String(c.notlar || ''));
  const kesideciClean = cleanStatus(String(c.kesideci || ''));
  return debtorClean.includes('çekten') || 
         debtorClean.includes('cekten') || 
         bankClean.includes('çekten') || 
         bankClean.includes('cekten') || 
         ozelClean.includes('çekten') || 
         ozelClean.includes('cekten') ||
         notlarClean.includes('çekten') || 
         notlarClean.includes('cekten') ||
         kesideciClean.includes('çekten') ||
         kesideciClean.includes('cekten');
};

export interface CektenBalanceSummary {
  supplier: string;
  netBalance: number;
}

export function aggregateCektenBalances(rows: any[]): Map<string, CektenBalanceSummary> {
  const supplierGroups = new Map<string, CektenBalanceSummary>();
  (rows || []).forEach((row: any) => {
    let name = (row.supplier || '').trim().replace(/\s+/g, ' ');
    if (!name) return;
    name = fixCorruptedTurkishText(name);
    const key = name.toLocaleUpperCase('tr-TR');
    const rem = row.remaining_amount != null 
      ? Number(row.remaining_amount) 
      : (Number(row.total_amount || 0) - Number(row.paid_amount || 0));
    const existing = supplierGroups.get(key);
    if (!existing) {
      supplierGroups.set(key, { supplier: name, netBalance: rem });
    } else {
      existing.netBalance += rem;
    }
  });
  return supplierGroups;
}

export function createCektenPaymentPayload(
  orgId: string,
  supplier: string,
  amount: number,
  targetDateStr?: string
) {
  const rawDate = targetDateStr || new Date().toISOString().split('T')[0];
  const date = rawDate.includes('T') ? rawDate.split('T')[0].trim() : rawDate.trim();
  const cleanAmount = Math.abs(Number(amount || 0));
  return {
    organization_id: orgId,
    date,
    supplier: (supplier || '').trim(),
    total_amount: 0,
    paid_amount: cleanAmount,
    remaining_amount: -cleanAmount,
    notes: 'Takas Çekleri Ödemesi',
    payment_date: formatDateForDB(date)
  };
}

export type CektenDbSyncAction =
  | { type: 'update_amount'; id: string; amount: number; bank_name: string; ozel_alan: string }
  | { type: 'mark_paid'; id: string };

export function syncCektenIntoChecksList<T extends Record<string, any>>(
  currentChecks: T[],
  cektenRows: any[],
  onDbSync?: (action: CektenDbSyncAction) => void
): T[] {
  const supplierGroups = aggregateCektenBalances(cektenRows);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Filter out checks whose balance is 0 or where we are creditor (alacaklıyız / netBalance <= 0)
  // Applies to both TAKASTA OLMAYAN and TAKASTA (TAKSİT) Çekten items so paid-off caris don't stay stale
  let updated = currentChecks.filter(c => {
    if (isCheckPaid(c.status)) return true;

    const cCreditor = fixCorruptedTurkishText(c.creditor || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
    const isMatchedCari = isCektenCheck(c) || (!c.check_no && Boolean(cCreditor) && supplierGroups.has(cCreditor));
    if (!isMatchedCari) return true;

    const summary = supplierGroups.get(cCreditor);
    if (!summary || summary.netBalance <= 0.01) {
      const idStr = String(c.id || '');
      if (onDbSync && idStr && !idStr.startsWith('cekten_') && !idStr.startsWith('temp-')) {
        onDbSync({ type: 'mark_paid', id: idStr });
      }
      return false;
    }
    return true;
  });

  // 2. Update existing (both TAKASTA / TAKSİT and TAKASTA OLMAYAN) or insert new dynamic checks
  // ONLY include caris where we owe money (netBalance > 0.01), NEVER when we are creditor (alacaklı olduklarımız)
  supplierGroups.forEach(({ supplier, netBalance }) => {
    if (netBalance <= 0.01) return;

    const supplierUpper = fixCorruptedTurkishText(supplier).trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
    const matchingIndices: number[] = [];

    updated.forEach((c, idx) => {
      if (isCheckPaid(c.status)) return;
      const cCreditor = fixCorruptedTurkishText(c.creditor || '').trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
      if (cCreditor !== supplierUpper) return;
      if (isCektenCheck(c) || !c.check_no) {
        matchingIndices.push(idx);
      }
    });

    const roundedAmount = Math.round(netBalance * 100) / 100;

    if (matchingIndices.length > 0) {
      // Prefer a row that is already in TAKASTA (TAKSİT) or backed by a real DB UUID
      let primaryIdx = matchingIndices[0];
      for (const idx of matchingIndices) {
        const candidate = updated[idx];
        const isInTakas = !candidate.ozel_alan?.includes('TAKASTA OLMAYAN');
        const isRealDb = !String(candidate.id || '').startsWith('cekten_');
        const primary = updated[primaryIdx];
        const primaryInTakas = !primary.ozel_alan?.includes('TAKASTA OLMAYAN');
        const primaryRealDb = !String(primary.id || '').startsWith('cekten_');

        if ((isInTakas && !primaryInTakas) || (isRealDb && !primaryRealDb)) {
          primaryIdx = idx;
        }
      }

      const existingCheck = updated[primaryIdx];
      const currentOzel = String(existingCheck.ozel_alan || '').trim();
      const ensuredOzelAlan = currentOzel
        ? (currentOzel.toLocaleUpperCase('tr-TR').includes('ÇEKTEN') ? currentOzel : `${currentOzel} - ÇEKTEN`)
        : 'TAKASTA - ÇEKTEN';
      const ensuredBankName = existingCheck.bank_name || 'ÇEKTEN';

      const prevAmount = Number(existingCheck.amount || 0);
      const amountChanged = Math.abs(prevAmount - roundedAmount) > 0.01;
      const needsCektenTag = !isCektenCheck(existingCheck);

      updated[primaryIdx] = {
        ...existingCheck,
        amount: roundedAmount,
        bank_name: ensuredBankName,
        ozel_alan: ensuredOzelAlan
      };

      const idStr = String(existingCheck.id || '');
      if (onDbSync && idStr && !idStr.startsWith('cekten_') && !idStr.startsWith('temp-') && (amountChanged || needsCektenTag)) {
        onDbSync({
          type: 'update_amount',
          id: idStr,
          amount: roundedAmount,
          bank_name: ensuredBankName,
          ozel_alan: ensuredOzelAlan
        });
      }

      // Remove any duplicate unpaid entries for the same supplier
      if (matchingIndices.length > 1) {
        const duplicateIdsToRemove = new Set<number>();
        for (const idx of matchingIndices) {
          if (idx !== primaryIdx) {
            duplicateIdsToRemove.add(idx);
            const dup = updated[idx];
            const dupId = String(dup.id || '');
            if (onDbSync && dupId && !dupId.startsWith('cekten_') && !dupId.startsWith('temp-')) {
              onDbSync({ type: 'mark_paid', id: dupId });
            }
          }
        }
        updated = updated.filter((_, idx) => !duplicateIdsToRemove.has(idx));
      }
    } else {
      const dynamicCheck: any = {
        id: `cekten_${encodeURIComponent(supplierUpper)}`,
        local_id: 0,
        check_type: 'kesilen',
        document_type: 'cek',
        issue_date: todayStr,
        due_date: todayStr,
        amount: roundedAmount,
        para_birimi: 'TRY',
        check_no: null,
        creditor: supplier,
        debtor: 'ÇEKTEN',
        bank_name: 'ÇEKTEN',
        bank_branch: null,
        status: 'Tahsilde',
        ozel_alan: 'TAKASTA OLMAYAN - ÇEKTEN',
        kesideci: null,
        keside_yeri: null,
        tahsildar_banka: null,
        ciro_edilen: null,
        created_at: new Date().toISOString()
      };
      updated.push(dynamicCheck as T);
    }
  });

  return updated;
}

export function notifyCektenDataChanged() {
  try {
    localStorage.setItem('cekten_last_update', Date.now().toString());
  } catch {}
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cekten-data-changed'));
  }
}

export function generateCektenUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type PendingCektenOp =
  | { opId: string; type: 'insert'; record: Record<string, any> }
  | { opId: string; type: 'update'; id: string; payload: Record<string, any> }
  | { opId: string; type: 'delete'; id: string }
  | { opId: string; type: 'rename_supplier'; oldName: string; newName: string };

const PENDING_OPS_KEY_PREFIX = 'dars_cekten_pending_ops_';

export function loadPendingCektenOps(orgId: string): PendingCektenOp[] {
  try {
    const raw = localStorage.getItem(`${PENDING_OPS_KEY_PREFIX}${orgId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePendingCektenOps(orgId: string, ops: PendingCektenOp[]) {
  try {
    localStorage.setItem(`${PENDING_OPS_KEY_PREFIX}${orgId}`, JSON.stringify(ops));
  } catch {}
}

export function enqueuePendingCektenOp(orgId: string, op: PendingCektenOp) {
  const ops = loadPendingCektenOps(orgId);
  ops.push(op);
  savePendingCektenOps(orgId, ops);
}

export function applyPendingCektenOps<T extends Record<string, any>>(orgId: string, baseRows: T[]): T[] {
  const ops = loadPendingCektenOps(orgId);
  if (ops.length === 0) return baseRows;
  let result = [...baseRows];
  for (const op of ops) {
    if (op.type === 'insert') {
      const existsIdx = result.findIndex(r => r.id === op.record.id);
      if (existsIdx >= 0) {
        result[existsIdx] = { ...result[existsIdx], ...op.record } as T;
      } else {
        result = [op.record as T, ...result];
      }
    } else if (op.type === 'update') {
      result = result.map(r => (r.id === op.id ? ({ ...r, ...op.payload } as T) : r));
    } else if (op.type === 'delete') {
      result = result.filter(r => r.id !== op.id);
    } else if (op.type === 'rename_supplier') {
      result = result.map(r => (r.supplier === op.oldName ? ({ ...r, supplier: op.newName } as T) : r));
    }
  }
  return result;
}

let isFlushingCektenOps = false;

export async function flushPendingCektenOps(orgId: string, supabaseClient: any): Promise<boolean> {
  if (isFlushingCektenOps) return false;
  const ops = loadPendingCektenOps(orgId);
  if (ops.length === 0) return true;

  isFlushingCektenOps = true;
  try {
    const remaining: PendingCektenOp[] = [...ops];
    while (remaining.length > 0) {
      const op = remaining[0];
      let opError: any = null;

      if (op.type === 'insert') {
        const { created_at, updated_at, ...insertPayload } = op.record;
        const { error } = await supabaseClient
          .from('cekten_hesabi')
          .upsert(insertPayload, { onConflict: 'id' });
        opError = error;
      } else if (op.type === 'update') {
        const { error } = await supabaseClient
          .from('cekten_hesabi')
          .update(op.payload)
          .eq('id', op.id);
        opError = error;
      } else if (op.type === 'delete') {
        const { error } = await supabaseClient
          .from('cekten_hesabi')
          .delete()
          .eq('id', op.id);
        opError = error;
      } else if (op.type === 'rename_supplier') {
        const { error } = await supabaseClient
          .from('cekten_hesabi')
          .update({ supplier: op.newName })
          .eq('organization_id', orgId)
          .eq('supplier', op.oldName);
        opError = error;
      }

      if (opError) {
        savePendingCektenOps(orgId, remaining);
        return false;
      }

      remaining.shift();
      savePendingCektenOps(orgId, remaining);
    }
    return true;
  } catch {
    return false;
  } finally {
    isFlushingCektenOps = false;
  }
}
