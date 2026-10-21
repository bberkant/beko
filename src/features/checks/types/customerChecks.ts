/**
 * Customer Checks Type Definitions
 * Represents active incoming checks/promissory notes, matrix strips, and kasada groups.
 */

export interface CustomerCheckItem {
  id: string;
  local_id?: number | null;
  check_no: string | null;
  due_date: string | null;
  issue_date: string | null;
  amount: number;
  kesideci?: string | null;
  creditor: string | null;
  debtor: string | null;
  bank_name: string | null;
  bank_branch?: string | null;
  tahsildar_banka?: string | null;
  ciro_edilen?: string | null;
  status: string | null;
  document_type?: 'cek' | 'senet' | string | null;
  check_type?: 'alinan' | 'kesilen' | string | null;
  keside_yeri?: string | null;
  para_birimi?: string | null;
  ozel_alan?: string | null;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Backward-compatibility alias
export type CustomerCheck = CustomerCheckItem;

/**
 * A sub-block within a strip (e.g. "KUVEYT", "ALBARAKA", "MARİF AKBANK")
 */
export interface MatrixBlock {
  id: string;
  title: string;
  checks: CustomerCheckItem[];
  subtotal: number;
}

/**
 * One of the 6 side-by-side vertical column strips
 */
export interface MatrixStrip {
  stripNumber: number;
  title: string;
  blocks: MatrixBlock[];
  stripTotal: number;
}

/**
 * Category group for the bottom Kasada / Avukat table
 */
export interface KasadaGroup {
  category: string;
  label: string;
  checks: CustomerCheckItem[];
  subtotal: number;
}

/**
 * Full grouped data structure for the Customer Checks screen
 */
export interface GroupedCustomerChecks {
  strips: MatrixStrip[];
  matrixTotal: number;
  totalMatrixChecks: number;
  kasadaChecks: CustomerCheckItem[];
  kasadaGroups: KasadaGroup[];
  kasadaTotal: number;
  grandTotal: number;
  totalActiveChecks: number;
  dynamicBlocks?: MatrixBlock[];
}

/**
 * Filter state for Customer Checks screen
 */
export interface CustomerChecksFilterState {
  searchQuery: string;
  selectedKasadaCategory?: string | null;
  selectedStrip?: number | null;
}
