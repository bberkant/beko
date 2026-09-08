import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase ortam değişkenleri eksik.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function normalizeFileName(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  const name = dotIndex !== -1 ? fileName.slice(0, dotIndex) : fileName;
  const ext = dotIndex !== -1 ? fileName.slice(dotIndex) : '';

  const turkishMap: Record<string, string> = {
    'ç': 'c', 'Ç': 'C',
    'ğ': 'g', 'Ğ': 'G',
    'ı': 'i', 'İ': 'I',
    'ö': 'o', 'Ö': 'O',
    'ş': 's', 'Ş': 'S',
    'ü': 'u', 'Ü': 'U'
  };

  let normalized = name.replace(/[çÇğĞıİöÖşŞüÜ]/g, match => turkishMap[match] || match);
  
  // Replace spaces and any non-alphanumeric character (excluding hyphens and underscores) with underscores
  normalized = normalized.replace(/[^a-zA-Z0-9-_]/g, '_');
  
  // Replace multiple underscores with a single one
  normalized = normalized.replace(/_+/g, '_');
  
  // Remove leading/trailing underscores
  normalized = normalized.trim().replace(/^_+|_+$/g, '');

  if (!normalized) {
    normalized = 'file';
  }

  const cleanExt = ext.toLowerCase();
  return `${normalized}${cleanExt}`;
}

