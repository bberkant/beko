/**
 * DARS Faturalar API Client
 * Host: https://amasyaetas.com/dars/
 */

const DARS_API_URL = 'https://amasyaetas.com/dars/';
const DARS_API_KEY = 'etas_dars_sec_89234710';

export interface DarsApiResponse {
  success: boolean;
  error?: string;
  bills?: any[];
  invoices?: any[];
  bill?: any;
  invoice?: any;
  [key: string]: any;
}

export async function darsApiCall<T = DarsApiResponse>(action: string, payload: Record<string, any> = {}): Promise<T> {
  const isGet = action === 'get_all' || action === 'list';
  const url = isGet ? `${DARS_API_URL}?action=get_all` : DARS_API_URL;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      method: isGet ? 'GET' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-DARS-KEY': DARS_API_KEY
      },
      body: isGet ? undefined : JSON.stringify({ action, ...payload }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`DARS API Hatası (${response.status}): ${errorText || response.statusText}`);
    }

    const json = await response.json();
    return json as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('DARS API bağlantı zaman aşımına uğradı (Timeout).');
    }
    throw err;
  }
}
