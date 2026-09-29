import { supabase } from './supabase';

let cachedIp: string | null = null;
let lastRecordedTime = 0;

export async function getClientIp(): Promise<string> {
  if (cachedIp) return cachedIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
    const data = await res.json();
    if (data?.ip) {
      cachedIp = data.ip;
      return data.ip;
    }
  } catch {}

  try {
    const res = await fetch('https://www.cloudflare.com/cdn-cgi/trace', { signal: AbortSignal.timeout(2500) });
    const text = await res.text();
    const match = text.match(/ip=(.*)/);
    if (match?.[1]) {
      cachedIp = match[1].trim();
      return cachedIp;
    }
  } catch {}

  return 'Bilinmiyor';
}

export function getDeviceInfo(): string {
  if (typeof window === 'undefined' || !navigator) return 'Bilinmiyor';
  const ua = navigator.userAgent;
  let os = 'Bilinmeyen İşletim Sistemi';
  let browser = 'Bilinmeyen Tarayıcı';

  if (ua.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (ua.includes('Windows NT 6.3')) os = 'Windows 8.1';
  else if (ua.includes('Windows NT 6.1')) os = 'Windows 7';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('iPhone')) os = 'iPhone (iOS)';
  else if (ua.includes('iPad')) os = 'iPad (iOS)';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  if (ua.includes('Edg/')) browser = 'Microsoft Edge';
  else if (ua.includes('Chrome/') && !ua.includes('Edg/')) browser = 'Google Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome/')) browser = 'Safari';
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox';

  return `${os} • ${browser}`;
}

export async function recordLoginLog(params: {
  organization_id?: string | null;
  user_id?: string | null;
  user_email: string;
  user_name?: string | null;
  status?: 'success' | 'failed';
  force?: boolean;
}): Promise<void> {
  const now = Date.now();
  // Don't flood login logs within 5 minutes unless forced
  if (!params.force && params.status === 'success' && now - lastRecordedTime < 300000) {
    return;
  }

  try {
    const ip = await getClientIp();
    const device = getDeviceInfo();
    const orgId = params.organization_id || '13b8da90-27d1-440d-a8f4-eb50dadd6391';

    await supabase.from('user_login_logs').insert({
      organization_id: orgId,
      user_id: params.user_id || null,
      user_email: params.user_email,
      user_name: params.user_name || null,
      ip_address: ip,
      device_info: device,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      status: params.status || 'success'
    });

    if (params.status === 'success') {
      lastRecordedTime = now;
    }
  } catch (err) {
    console.warn('Giriş logu kaydedilemedi:', err);
  }
}
