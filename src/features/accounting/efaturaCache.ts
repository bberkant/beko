import { supabase } from '../../lib/supabase';

export interface EfaturaCacheEntry {
  company: string;
  invoices: any[];
  recordCount: number;
  updatedAt: string;
}

const DB_NAME = 'dars_efatura_storage';
const DB_VERSION = 1;
const STORE_NAME = 'invoices_cache';

/**
 * Open or initialize IndexedDB for high-capacity local invoice caching.
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'company' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve cached invoices from browser IndexedDB (instant <15ms).
 */
export async function getLocalCache(company: string): Promise<EfaturaCacheEntry | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(company);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('IndexedDB read error, checking localStorage fallback:', err);
    try {
      const raw = localStorage.getItem(`dars_efatura_${company}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}

/**
 * Save invoices into browser IndexedDB.
 */
export async function setLocalCache(company: string, invoices: any[], updatedAt: string): Promise<void> {
  const entry: EfaturaCacheEntry = {
    company,
    invoices,
    recordCount: invoices.length,
    updatedAt,
  };

  try {
    const db = await openIndexedDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(requestError(req));
    });
  } catch (err) {
    console.warn('IndexedDB write error, falling back to localStorage if small:', err);
    try {
      if (invoices.length < 1000) {
        localStorage.setItem(`dars_efatura_${company}`, JSON.stringify(entry));
      }
    } catch {}
  }
}

function requestError(req: IDBRequest): Error {
  return req.error || new Error('IndexedDB request failed');
}

/**
 * Fetch cached invoices from Supabase table `vega_efatura_cache`.
 */
export async function getSupabaseCache(company: string): Promise<EfaturaCacheEntry | null> {
  try {
    const { data, error } = await supabase
      .from('vega_efatura_cache')
      .select('company, invoices, record_count, updated_at')
      .eq('company', company)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('Supabase cache query error:', error.message);
      return null;
    }

    return {
      company: data.company,
      invoices: Array.isArray(data.invoices) ? data.invoices : [],
      recordCount: data.record_count || (Array.isArray(data.invoices) ? data.invoices.length : 0),
      updatedAt: data.updated_at,
    };
  } catch (err) {
    console.warn('Error fetching Supabase cache:', err);
    return null;
  }
}

/**
 * Upsert invoices into Supabase table `vega_efatura_cache`.
 */
export async function saveSupabaseCache(company: string, invoices: any[], userName?: string): Promise<boolean> {
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('vega_efatura_cache')
      .upsert({
        company,
        invoices,
        record_count: invoices.length,
        updated_at: nowIso,
        updated_by: userName || 'Kullanıcı',
      });

    if (error) {
      console.error('Supabase cache save error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Supabase cache save exception:', err);
    return false;
  }
}
