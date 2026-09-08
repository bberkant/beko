import { supabase } from '../../lib/supabase';

export interface BackupTableConfig {
  name: string;
  label: string;
  module: string;
}

export const BACKUP_TABLES: BackupTableConfig[] = [
  { name: 'main_cashbox_transactions', label: 'Ana Kasa Hareketleri', module: 'Ana Kasa' },
  { name: 'bank_accounts', label: 'Banka Hesapları', module: 'Ana Kasa / Finans' },
  { name: 'bank_transactions', label: 'Günlük Hesap / Banka Hareketleri', module: 'Ana Kasa' },
  { name: 'credit_cards', label: 'Kredi Kartları', module: 'Finans' },
  { name: 'statements', label: 'Kredi Kartı Ekstreleri', module: 'Finans' },
  { name: 'transactions', label: 'Kredi Kartı Harcamaları', module: 'Finans' },
  { name: 'payments', label: 'Kredi Kartı Ödemeleri', module: 'Finans' },
  { name: 'ebs_checks', label: 'Çek & Senetler', module: 'Çek & Senet' },
  { name: 'vehicles', label: 'Araçlar', module: 'Araç Yönetimi' },
  { name: 'vehicle_expenses', label: 'Araç Masrafları', module: 'Araç Yönetimi' },
  { name: 'drivers', label: 'Şoförler', module: 'Araç Yönetimi' },
  { name: 'traffic_fines', label: 'Trafik Cezaları', module: 'Araç Yönetimi' },
  { name: 'hgs_passages', label: 'HGS Geçişleri', module: 'Araç Yönetimi' },
  { name: 'kesim_listesi', label: 'Kesim Listesi', module: 'Kesim Listesi' },
  { name: 'real_estates', label: 'Gayrimenkuller / Tapular', module: 'Gayrimenkul' },
  { name: 'tenders', label: 'İhaleler', module: 'İhaleler' },
  { name: 'vega_cariler', label: 'Cari Kartlar', module: 'Muhasebe' },
  { name: 'vega_personel', label: 'Personel Carileri', module: 'Muhasebe' },
  { name: 'vega_cari_hareketler', label: 'Cari Hareketler', module: 'Muhasebe' },
  { name: 'calendar_notes', label: 'Takvim Notları', module: 'Takvim' },
];

export interface SystemBackup {
  id: string;
  name: string;
  note?: string;
  createdAt: string;
  createdByName: string;
  createdByEmail: string;
  tablesCount: number;
  totalRecords: number;
  fileSizeKb: number;
  isAutoSafety?: boolean;
  data: Record<string, any[]>;
}

const STORAGE_KEY = 'onedars_system_backups_list';

/**
 * Get all stored backups from localStorage and Supabase (if available)
 */
export async function getBackupsList(): Promise<SystemBackup[]> {
  const localList: SystemBackup[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        localList.push(...parsed);
      }
    }
  } catch (err) {
    console.warn('LocalStorage backup reading error:', err);
  }

  // Also try to query system_backups from Supabase if table exists
  try {
    const { data, error } = await supabase
      .from('system_backups')
      .select('id, name, note, created_at, created_by_name, created_by_email, tables_count, total_records, file_size_kb, backup_data')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      data.forEach((row: any) => {
        if (!localList.some(b => b.id === row.id)) {
          localList.push({
            id: row.id,
            name: row.name,
            note: row.note,
            createdAt: row.created_at,
            createdByName: row.created_by_name || 'Sistem',
            createdByEmail: row.created_by_email || '',
            tablesCount: row.tables_count || 0,
            totalRecords: row.total_records || 0,
            fileSizeKb: Number(row.file_size_kb) || 0,
            data: row.backup_data || {},
          });
        }
      });
    }
  } catch {
    // Table may not exist yet, fallback to localList
  }

  return localList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Save backups list to localStorage and attempt Supabase persistence
 */
export async function saveBackup(backup: SystemBackup, organizationId?: string | null): Promise<void> {
  const existing = await getBackupsList();
  const updated = [backup, ...existing.filter(b => b.id !== backup.id)];

  // Save to localStorage with quota protection
  try {
    // Keep max 10 backups in list
    const trimmed = updated.slice(0, 10);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // If full dump exceeds localStorage 5MB quota, keep full data for newest 1 backup
      // and strip data payload for older backups (metadata remains visible in UI)
      const slim = trimmed.map((b, idx) => {
        if (idx === 0) return b;
        return { ...b, data: {} };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    }
  } catch (err) {
    console.warn('LocalStorage backup save warning:', err);
  }

  // Attempt save to Supabase
  if (organizationId) {
    try {
      await supabase.from('system_backups').upsert({
        id: backup.id,
        organization_id: organizationId,
        name: backup.name,
        note: backup.note,
        created_at: backup.createdAt,
        created_by_name: backup.createdByName,
        created_by_email: backup.createdByEmail,
        tables_count: backup.tablesCount,
        total_records: backup.totalRecords,
        file_size_kb: backup.fileSizeKb,
        backup_data: backup.data,
      });
    } catch (err) {
      console.warn('Supabase system_backups insert skipped:', err);
    }
  }
}

/**
 * Delete a backup by ID
 */
export async function deleteBackup(id: string): Promise<void> {
  const existing = await getBackupsList();
  const updated = existing.filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  try {
    await supabase.from('system_backups').delete().eq('id', id);
  } catch {
    // ignore
  }
}

/**
 * Create a live full backup snapshot of the system
 */
export async function createLiveBackup(
  name: string,
  note: string | undefined,
  user: { name?: string; email?: string; organizationId?: string | null } | null,
  isAutoSafety = false
): Promise<SystemBackup> {
  // 1. Verify active Supabase session
  const { data: sessionData } = await supabase.auth.getSession();
  let session = sessionData?.session;
  if (!session) {
    const refreshRes = await supabase.auth.refreshSession();
    session = refreshRes?.data?.session;
  }
  if (!session) {
    throw new Error('Supabase kullanıcı oturumunuz doğrulanamadı. Lütfen oturumunuzu tazelemek için sayfayı yenileyip tekrar giriş yapın.');
  }

  const backupData: Record<string, any[]> = {};
  let totalRecords = 0;
  let successfulTables = 0;

  // 2. Fetch records for all tables
  for (const table of BACKUP_TABLES) {
    try {
      // Let Supabase RLS automatically filter to the authorized organization and user
      const { data, error } = await supabase.from(table.name).select('*');
      if (!error && Array.isArray(data)) {
        backupData[table.name] = data;
        totalRecords += data.length;
        successfulTables++;
      } else if (error) {
        console.warn(`[Yedekleme Uyarısı] Tablo ${table.name} okunamadı:`, error.message);
      }
    } catch (err) {
      console.warn(`[Yedekleme Hatası] Tablo ${table.name} çekilirken istisna oluştu:`, err);
    }
  }

  // 3. Safety validation
  if (totalRecords === 0) {
    throw new Error('Veritabanından hiçbir kayıt çekilemedi. Oturum yetkiniz eksik veya bağlantı koptu. Lütfen sayfayı yenileyip tekrar giriş yapın.');
  }

  // 4. Calculate approximate size
  const jsonString = JSON.stringify(backupData);
  const sizeKb = Math.round((new Blob([jsonString]).size / 1024) * 10) / 10;

  const newBackup: SystemBackup = {
    id: 'backup_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim(),
    note: note?.trim(),
    createdAt: new Date().toISOString(),
    createdByName: user?.name || user?.email || 'Yönetici',
    createdByEmail: user?.email || '',
    tablesCount: successfulTables,
    totalRecords,
    fileSizeKb: sizeKb,
    isAutoSafety,
    data: backupData,
  };

  await saveBackup(newBackup, user?.organizationId);
  return newBackup;
}

/**
 * Restore system data from a backup object
 */
export async function restoreFromBackup(
  backup: SystemBackup,
  user: { name?: string; email?: string; organizationId?: string | null } | null,
  onProgress?: (tableName: string, current: number, total: number) => void
): Promise<{ success: boolean; restoredCount: number; errors: string[] }> {
  const tables = Object.keys(backup.data);
  let totalRestored = 0;
  const errors: string[] = [];

  // 1. Take safety snapshot before modifying database
  try {
    await createLiveBackup(
      `Kurtarma Emniyeti (${new Date().toLocaleTimeString('tr-TR')})`,
      `"${backup.name}" yedeği geri yüklenmeden hemen önce otomatik alınan güvenlik yedeği`,
      user,
      true
    );
  } catch (err) {
    console.warn('Safety snapshot warning:', err);
  }

  // 2. Restore each table
  for (let i = 0; i < tables.length; i++) {
    const tableName = tables[i];
    const rows = backup.data[tableName];

    if (onProgress) {
      onProgress(tableName, i + 1, tables.length);
    }

    if (!Array.isArray(rows) || rows.length === 0) continue;

    try {
      // Upsert in batches of 100 to avoid payload limits
      const batchSize = 100;
      for (let j = 0; j < rows.length; j += batchSize) {
        const batch = rows.slice(j, j + batchSize);
        const { error } = await supabase.from(tableName).upsert(batch, { onConflict: 'id' });
        if (error) {
          errors.push(`${tableName} (satır ${j}-${j + batch.length}): ${error.message}`);
        } else {
          totalRestored += batch.length;
        }
      }
    } catch (err: any) {
      errors.push(`${tableName}: ${err.message || 'Bilinmeyen hata'}`);
    }
  }

  return {
    success: errors.length === 0,
    restoredCount: totalRestored,
    errors,
  };
}

/**
 * Download a backup as a .json file to the user's browser
 */
export function downloadBackupFile(backup: SystemBackup): void {
  const exportPayload = {
    _format: 'ONEDARS_FULL_SYSTEM_BACKUP',
    _version: '1.0',
    backupId: backup.id,
    name: backup.name,
    note: backup.note,
    createdAt: backup.createdAt,
    createdByName: backup.createdByName,
    createdByEmail: backup.createdByEmail,
    tablesCount: backup.tablesCount,
    totalRecords: backup.totalRecords,
    fileSizeKb: backup.fileSizeKb,
    data: backup.data,
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  
  const dateStr = new Date(backup.createdAt).toISOString().slice(0, 10);
  const sanitizedName = backup.name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  a.href = url;
  a.download = `onedars_yedek_${dateStr}_${sanitizedName}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse an uploaded .json file into a valid SystemBackup object
 */
export function parseBackupFile(fileContent: string): SystemBackup {
  const parsed = JSON.parse(fileContent);

  if (!parsed.data || typeof parsed.data !== 'object') {
    throw new Error('Geçersiz yedek dosyası: Veri (data) bloğu bulunamadı.');
  }

  const tablesCount = Object.keys(parsed.data).length;
  let totalRecords = 0;
  Object.values(parsed.data).forEach((rows: any) => {
    if (Array.isArray(rows)) totalRecords += rows.length;
  });

  return {
    id: parsed.backupId || 'imported_' + Date.now(),
    name: parsed.name || 'İçe Aktarılan Yedek',
    note: parsed.note || 'Harici .json dosyasından içe aktarıldı',
    createdAt: parsed.createdAt || new Date().toISOString(),
    createdByName: parsed.createdByName || 'Dosyadan Yüklendi',
    createdByEmail: parsed.createdByEmail || '',
    tablesCount: parsed.tablesCount || tablesCount,
    totalRecords: parsed.totalRecords || totalRecords,
    fileSizeKb: Math.round((new Blob([fileContent]).size / 1024) * 10) / 10,
    data: parsed.data,
  };
}
