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

export interface DarsFilterClause {
  col: string;
  op: string;
  val: any;
}

export class DarsQueryBuilder<T = any> {
  private table: string;
  private selectedCols: string = '*';
  private filters: DarsFilterClause[] = [];
  private orFilters: string[] = [];
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
    this.filters.push({ col, op: 'eq', val });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push({ col, op: 'neq', val });
    return this;
  }

  gt(col: string, val: any) {
    this.filters.push({ col, op: 'gt', val });
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push({ col, op: 'gte', val });
    return this;
  }

  lt(col: string, val: any) {
    this.filters.push({ col, op: 'lt', val });
    return this;
  }

  lte(col: string, val: any) {
    this.filters.push({ col, op: 'lte', val });
    return this;
  }

  like(col: string, pattern: string) {
    this.filters.push({ col, op: 'like', val: pattern });
    return this;
  }

  ilike(col: string, pattern: string) {
    this.filters.push({ col, op: 'ilike', val: pattern });
    return this;
  }

  is(col: string, val: any) {
    if (val === null || val === 'null') {
      this.filters.push({ col, op: 'is_null', val: null });
    } else {
      this.filters.push({ col, op: 'eq', val });
    }
    return this;
  }

  in(col: string, vals: any[]) {
    this.filters.push({ col, op: 'in', val: vals });
    return this;
  }

  not(col: string, op: string, val: any) {
    const cleanOp = (op || '').toLowerCase().trim();
    if (cleanOp === 'is' && (val === null || val === 'null')) {
      this.filters.push({ col, op: 'not_null', val: null });
    } else if (cleanOp === 'ilike' || cleanOp === 'like') {
      this.filters.push({ col, op: 'not_ilike', val });
    } else if (cleanOp === 'eq' || cleanOp === '=') {
      this.filters.push({ col, op: 'neq', val });
    } else if (cleanOp === 'in') {
      this.filters.push({ col, op: 'not_in', val });
    } else {
      this.filters.push({ col, op: `not_${cleanOp}`, val });
    }
    return this;
  }

  or(filters: string, _options?: any) {
    if (filters) {
      this.orFilters.push(filters);
    }
    return this;
  }

  filter(col: string, op: string, val: any) {
    this.filters.push({ col, op, val });
    return this;
  }

  abortSignal(_signal?: AbortSignal) {
    return this;
  }

  returns<NewT = any>() {
    return this as unknown as DarsQueryBuilder<NewT>;
  }

  throwOnError() {
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

  upsert(data: any | any[], _options?: any) {
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
        const rawRows = Array.isArray(this.mutationData) ? this.mutationData : [this.mutationData];
        const rows = rawRows.map(r => {
          if (r && typeof r === 'object') {
            const hasId = r.id !== undefined && r.id !== null && r.id !== '';
            if (!hasId) {
              const genId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'id_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
              return { id: genId, ...r };
            }
          }
          return r;
        });

        if (rows.length === 1 && !Array.isArray(this.mutationData)) {
          const res = await this.postApi('rest_insert', {
            table: this.table,
            data: rows[0]
          });
          if (!res.success) throw new Error(res.error || 'Ekleme hatası');
          return { data: (this.isSingle ? res.data : [res.data]) as any, error: null };
        } else {
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
        const idFilter = this.filters.find(f => f.col === 'id' && f.op === 'eq');
        const payload: any = {
          table: this.table,
          data: this.mutationData,
          filters: this.filters
        };
        if (idFilter) {
          payload.id = idFilter.val;
        }

        const res = await this.postApi('rest_update', payload);
        if (!res.success) throw new Error(res.error || 'Güncelleme hatası');
        return { data: res.data || null, error: null };
      }

      // 3. MUTATION: DELETE
      if (this.mutationType === 'delete') {
        const idFilter = this.filters.find(f => f.col === 'id' && f.op === 'eq');
        const idsFilter = this.filters.find(f => f.col === 'id' && f.op === 'in');
        const payload: any = {
          table: this.table,
          filters: this.filters
        };
        if (idFilter) {
          payload.id = idFilter.val;
        } else if (idsFilter && Array.isArray(idsFilter.val)) {
          payload.ids = idsFilter.val;
        }

        const res = await this.postApi('rest_delete', payload);
        if (!res.success) throw new Error(res.error || 'Silme hatası');
        return { data: null, error: null };
      }

      // 4. QUERY (SELECT)
      const queryPayload: any = {
        table: this.table,
        select: this.selectedCols,
        filters: this.filters,
        or_groups: this.orFilters,
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
    const timeout = setTimeout(() => controller.abort(), 15000);

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
