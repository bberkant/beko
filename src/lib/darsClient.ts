/**
 * DARS Universal Self-Hosted Backend Client
 * Connects directly to https://amasyaetas.com/dars/
 * Drop-in compatible replacement for Supabase PostgREST queries
 */

const DARS_API_URL = 'https://amasyaetas.com/dars/';
const DARS_API_KEY = 'etas_dars_sec_89234710';

export interface DarsQueryResult<T = any> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

export class DarsQueryBuilder<T = any> {
  private table: string;
  private selectedCols: string = '*';
  private whereFilters: Record<string, any> = {};
  private inFilters: Record<string, any[]> = {};
  private isNullFilters: string[] = [];
  private orderCol?: string;
  private orderDir?: 'ASC' | 'DESC';
  private limitCount?: number;
  private offsetCount?: number;
  private isSingle = false;
  private isMaybeSingle = false;

  // Mutation states
  private mutationType?: 'insert' | 'update' | 'delete' | 'upsert';
  private mutationData?: any;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string = '*', _options?: { count?: string; head?: boolean }) {
    this.selectedCols = cols;
    return this;
  }

  eq(col: string, val: any) {
    this.whereFilters[col] = val;
    return this;
  }

  neq(col: string, val: any) {
    // Handled in where
    this.whereFilters[`__neq_${col}`] = val;
    return this;
  }

  gt(col: string, val: any) {
    this.whereFilters[`__gt_${col}`] = val;
    return this;
  }

  gte(col: string, val: any) {
    this.whereFilters[`__gte_${col}`] = val;
    return this;
  }

  lt(col: string, val: any) {
    this.whereFilters[`__lt_${col}`] = val;
    return this;
  }

  lte(col: string, val: any) {
    this.whereFilters[`__lte_${col}`] = val;
    return this;
  }

  is(col: string, val: any) {
    if (val === null) {
      this.isNullFilters.push(col);
    } else {
      this.whereFilters[col] = val;
    }
    return this;
  }

  in(col: string, vals: any[]) {
    this.inFilters[col] = vals;
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderDir = options?.ascending === false ? 'DESC' : 'ASC';
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.offsetCount = from;
    this.limitCount = to - from + 1;
    return this;
  }

  single(): Promise<DarsQueryResult<T>> {
    this.isSingle = true;
    return this.execute();
  }

  maybeSingle(): Promise<DarsQueryResult<T>> {
    this.isMaybeSingle = true;
    return this.execute();
  }

  insert(data: any | any[]) {
    this.mutationType = 'insert';
    this.mutationData = data;
    return this;
  }

  update(data: any) {
    this.mutationType = 'update';
    this.mutationData = data;
    return this;
  }

  upsert(data: any | any[]) {
    this.mutationType = 'upsert';
    this.mutationData = data;
    return this;
  }

  delete() {
    this.mutationType = 'delete';
    return this;
  }

  // Promise resolution support (e.g. `await supabase.from(...).select(...)`)
  then<TResult1 = DarsQueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: DarsQueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  async execute(): Promise<DarsQueryResult<T>> {
    try {
      // 1. MUTATION: INSERT OR UPSERT
      if (this.mutationType === 'insert' || this.mutationType === 'upsert') {
        const rows = Array.isArray(this.mutationData) ? this.mutationData : [this.mutationData];
        if (rows.length === 1 && !this.mutationData.length) {
          // Single row insert
          const res = await this.postApi('rest_insert', {
            table: this.table,
            data: rows[0]
          });
          if (!res.success) throw new Error(res.error || 'Ekleme hatası');
          return { data: (this.isSingle ? res.data : [res.data]) as any, error: null };
        } else {
          // Batch insert
          const res = await this.postApi('import_batch', {
            table: this.table,
            rows: rows
          });
          if (!res.success) throw new Error(res.error || 'Toplu ekleme hatası');
          return { data: rows as any, error: null };
        }
      }

      // 2. MUTATION: UPDATE
      if (this.mutationType === 'update') {
        const id = this.whereFilters['id'] || this.whereFilters['__id'];
        if (id) {
          const res = await this.postApi('rest_update', {
            table: this.table,
            id: id,
            data: this.mutationData
          });
          if (!res.success) throw new Error(res.error || 'Güncelleme hatası');
          return { data: res.data || null, error: null };
        } else {
          // Multi-row update via import_batch or SQL
          const res = await this.postApi('import_batch', {
            table: this.table,
            rows: [this.mutationData]
          });
          return { data: res.data || null, error: null };
        }
      }

      // 3. MUTATION: DELETE
      if (this.mutationType === 'delete') {
        const id = this.whereFilters['id'];
        if (id) {
          const res = await this.postApi('rest_delete', {
            table: this.table,
            id: id
          });
          if (!res.success) throw new Error(res.error || 'Silme hatası');
          return { data: null, error: null };
        }
        return { data: null, error: null };
      }

      // 4. QUERY (SELECT)
      const combinedWhere: Record<string, any> = { ...this.whereFilters };
      for (const [col, vals] of Object.entries(this.inFilters)) {
        combinedWhere[col] = vals;
      }
      for (const col of this.isNullFilters) {
        combinedWhere[col] = null;
      }

      const queryPayload: any = {
        table: this.table,
        select: this.selectedCols,
        where: combinedWhere,
        order: this.orderCol,
        dir: this.orderDir,
        limit: this.limitCount || 25000,
        offset: this.offsetCount || 0
      };

      const res = await this.postApi('rest_query', queryPayload);
      if (!res.success) {
        throw new Error(res.error || 'Sorgu hatası');
      }

      let data = res.data || [];

      // Auto-cast MySQL '0' and '1' strings for boolean-prefixed fields
      if (Array.isArray(data)) {
        data.forEach((row: any) => {
          if (row && typeof row === 'object') {
            for (const k of Object.keys(row)) {
              if (row[k] === '0' && (k.startsWith('is_') || k.includes('active') || k.includes('auto_payment') || k.includes('has_'))) {
                row[k] = false;
              } else if (row[k] === '1' && (k.startsWith('is_') || k.includes('active') || k.includes('auto_payment') || k.includes('has_'))) {
                row[k] = true;
              }
            }
          }
        });
      }

      if (this.isSingle) {
        if (data.length === 0) {
          return { data: null, error: { message: 'Kayıt bulunamadı' } };
        }
        return { data: data[0] as any, error: null };
      }

      if (this.isMaybeSingle) {
        return { data: (data.length > 0 ? data[0] : null) as any, error: null };
      }

      return { data: data as any, error: null, count: data.length };
    } catch (err: any) {
      console.warn(`[DARS DB ERROR] (${this.table}):`, err.message || err);
      return { data: null, error: { message: err.message || String(err) } };
    }
  }

  private async postApi(action: string, payload: any): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const response = await fetch(DARS_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-DARS-KEY': DARS_API_KEY
        },
        body: JSON.stringify({ action, ...payload }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`HTTP ${response.status}: ${text}`);
      }
      return await response.json();
    } catch (e: any) {
      clearTimeout(timeout);
      throw e;
    }
  }
}

export function darsFrom(table: string) {
  return new DarsQueryBuilder(table);
}
