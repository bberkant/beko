import { useState, useEffect, useRef } from 'react';
import { 
  Database, 
  ShieldCheck, 
  Download, 
  Upload, 
  RotateCcw, 
  Trash2, 
  Eye, 
  Clock, 
  HardDrive, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Plus,
  Table as TableIcon
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { 
  SystemBackup, 
  BACKUP_TABLES, 
  getBackupsList, 
  createLiveBackup, 
  restoreFromBackup, 
  deleteBackup, 
  downloadBackupFile, 
  parseBackupFile, 
  saveBackup 
} from './backupService';

export function BackupsPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const isBerkant = (user?.email || '').toLowerCase().includes('berkant') || 
                    (user?.name || '').toLowerCase().includes('berkant');

  const isAdminOrBerkant = 
    isBerkant ||
    ['Admin', 'Süper Admin', 'Developer', 'Yönetici', 'Süper Yönetici'].includes(user?.role || '') ||
    ['admin', 'super_admin', 'developer'].includes((user?.rawRole || '').toLowerCase()) ||
    user?.email === 'admin@dars.local' || 
    user?.email === 'admin@ets360.local';

  useEffect(() => {
    if (user && !isAdminOrBerkant) {
      notify('Sistem yedeklerine erişim yetkiniz bulunmuyor.', 'error');
      navigate('/ayarlar');
    }
  }, [user, isAdminOrBerkant, navigate, notify]);

  const [backups, setBackups] = useState<SystemBackup[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [backupNote, setBackupNote] = useState('');
  const [creating, setCreating] = useState(false);

  // Preview Modal
  const [previewBackup, setPreviewBackup] = useState<SystemBackup | null>(null);

  // Restore Modal
  const [restoreTarget, setRestoreTarget] = useState<SystemBackup | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [restoreProgress, setRestoreProgress] = useState<{ table: string; current: number; total: number } | null>(null);

  // File Upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  // Load backups
  const loadBackups = async () => {
    setLoading(true);
    try {
      const list = await getBackupsList();
      setBackups(list);
    } catch {
      notify('Yedekler yüklenirken bir sorun oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBackups();
  }, []);

  // Handle Create Backup
  const handleCreate = async () => {
    if (!backupName.trim()) {
      notify('Lütfen yedeğe açıklayıcı bir isim verin.', 'error');
      return;
    }

    setCreating(true);
    try {
      const newBackup = await createLiveBackup(backupName, backupNote, user);
      setBackups(prev => [newBackup, ...prev.filter(b => b.id !== newBackup.id)]);
      setCreateModalOpen(false);
      setBackupName('');
      setBackupNote('');
      notify(`"${newBackup.name}" sistem yedeği başarıyla oluşturuldu (${newBackup.totalRecords.toLocaleString('tr-TR')} kayıt).`, 'success');
    } catch (err: any) {
      notify(err.message || 'Yedek alınırken bir hata oluştu.', 'error');
    } finally {
      setCreating(false);
    }
  };

  // Handle Restore
  const handleRestore = async () => {
    if (!restoreTarget) return;
    if (restoreConfirmText.trim().toUpperCase() !== 'ONAYLA') {
      notify('Lütfen onaylamak için kutucuğa ONAYLA yazın.', 'error');
      return;
    }

    setRestoring(true);
    try {
      const result = await restoreFromBackup(restoreTarget, user, (table, current, total) => {
        setRestoreProgress({ table, current, total });
      });

      if (result.success) {
        notify(`"${restoreTarget.name}" yedeği başarıyla geri yüklendi! Toplam ${result.restoredCount.toLocaleString('tr-TR')} kayıt güncellendi.`, 'success');
        setRestoreTarget(null);
        setRestoreConfirmText('');
        void loadBackups();
      } else {
        notify(`Geri yükleme tamamlandı fakat bazı uyarılara rastlandı (${result.errors.length} hata).`, 'error');
      }
    } catch (err: any) {
      notify(err.message || 'Geri yükleme sırasında hata oluştu.', 'error');
    } finally {
      setRestoring(false);
      setRestoreProgress(null);
    }
  };

  // Handle Delete
  const handleDelete = async (backup: SystemBackup) => {
    if (confirm(`"${backup.name}" adlı yedeği silmek istediğinize emin misiniz?`)) {
      await deleteBackup(backup.id);
      setBackups(prev => prev.filter(b => b.id !== backup.id));
      notify('Yedek silindi.', 'success');
    }
  };

  // Handle File Upload (.json)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseBackupFile(text);
      await saveBackup(parsed, user?.organizationId);
      setBackups(prev => [parsed, ...prev.filter(b => b.id !== parsed.id)]);
      notify(`"${parsed.name}" yedek dosyası başarıyla sisteme aktarıldı (${parsed.totalRecords.toLocaleString('tr-TR')} kayıt).`, 'success');
    } catch (err: any) {
      notify(err.message || 'Yedek dosyası okunurken hata oluştu. Geçersiz format.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Stats
  const totalBackups = backups.length;
  const lastBackup = backups[0];
  const totalArchivedRecords = backups.reduce((sum, b) => sum + (b.totalRecords || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem Yedekleri & Geri Yükleme"
        description="Tüm sitenin canlı veritabanı kopyalarını güvenle arşivleyin, indirin ve bir hata durumunda tek tıkla eski sürüme dönün."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary flex items-center gap-2 text-sm shadow-sm"
            >
              <Upload size={16} />
              {uploading ? 'Yükleniyor...' : 'Yedek Yükle (.json)'}
            </button>
            
            <button
              onClick={() => void loadBackups()}
              disabled={loading}
              className="btn btn-secondary flex items-center gap-2 text-sm shadow-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Yenile
            </button>

            <button
              onClick={() => {
                setBackupName(`${new Date().toLocaleDateString('tr-TR')} Sistem Yedeği`);
                setBackupNote('');
                setCreateModalOpen(true);
              }}
              className="btn btn-primary flex items-center gap-2 text-sm font-semibold shadow-sm"
            >
              <Plus size={16} />
              Şimdi Tam Sistem Yedeği Al
            </button>
          </div>
        }
      />

      {/* Info Banner */}
      <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sky-900 shadow-sm">
        <ShieldCheck className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-sm leading-relaxed">
          <p className="font-bold">Güvenli Kurtarma ve Geri Dönüş Garantisi</p>
          <p className="text-sky-800 text-xs mt-0.5">
            Sistem; <strong>Ana Kasa, Banka Hesapları, Kredi Kartları, Çek/Senet, Araçlar, Kesim Listesi, İhaleler ve Muhasebe</strong> dahil 17 ana modülün tüm tablolarını eksiksiz yedekler. 
            Herhangi bir yedeği geri yüklemeden hemen önce sistem <em>otomatik güvenlik kurtarma yedeği</em> alarak veri kaybını imkansız hale getirir.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Toplam Yedek</span>
            <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <Database size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{totalBackups} Adet</h3>
            <p className="mt-1 text-xs text-gray-500">Saklanan sürüm kopyası</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Son Yedek Tarihi</span>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Clock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-lg font-bold text-gray-900 truncate">
              {lastBackup ? new Date(lastBackup.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Henüz Yok'}
            </h3>
            <p className="mt-1 text-xs text-emerald-600 font-medium truncate">
              {lastBackup ? lastBackup.name : 'İlk yedeğinizi alın'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kapsanan Tablolar</span>
            <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600">
              <TableIcon size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{BACKUP_TABLES.length} Tablo</h3>
            <p className="mt-1 text-xs text-gray-500">Ana Kasa, Finans, Muhasebe, Araç</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Arşivlenen Veri</span>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <HardDrive size={20} />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-gray-900">{totalArchivedRecords.toLocaleString('tr-TR')}</h3>
            <p className="mt-1 text-xs text-gray-500">Yedeklerdeki toplam satır kaydı</p>
          </div>
        </div>
      </div>

      {/* Backups Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50/75 px-6 py-4">
          <h3 className="text-base font-bold text-gray-900">Mevcut Sistem Yedekleri ve Geri Dönüş Noktaları</h3>
          <p className="text-xs text-gray-500 mt-0.5">Aşağıdaki yedeklerden herhangi birini bilgisayarınıza indirebilir veya tek tıkla canlı sisteme geri yükleyebilirsiniz.</p>
        </div>

        {backups.length === 0 ? (
          <div className="py-16 text-center">
            <Database className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-sm font-semibold text-gray-900">Henüz Kayıtlı Bir Sistem Yedeği Yok</h3>
            <p className="mt-1 text-xs text-gray-500">Veritabanınızın tam kopyasını oluşturmak için yukarıdaki butona tıklayın.</p>
            <button
              onClick={() => {
                setBackupName(`${new Date().toLocaleDateString('tr-TR')} İlk Sistem Yedeği`);
                setCreateModalOpen(true);
              }}
              className="btn btn-primary mt-4 text-xs font-semibold"
            >
              + İlk Yedeği Şimdi Al
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="border-b border-gray-200 bg-gray-100/60 text-xs uppercase font-semibold text-gray-700">
                <tr>
                  <th className="px-6 py-3.5">Yedek Adı & Not</th>
                  <th className="px-6 py-3.5">Oluşturma Tarihi</th>
                  <th className="px-6 py-3.5">Oluşturan</th>
                  <th className="px-6 py-3.5 text-center">Tablo / Kayıt</th>
                  <th className="px-6 py-3.5 text-center">Boyut</th>
                  <th className="px-6 py-3.5 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-normal">
                {backups.map(backup => (
                  <tr key={backup.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`rounded-lg p-2 shrink-0 ${
                          backup.isAutoSafety 
                            ? 'bg-amber-100 text-amber-700' 
                            : 'bg-brand-50 text-brand-700'
                        }`}>
                          <Database size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{backup.name}</span>
                            {backup.isAutoSafety && (
                              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                Otomatik Kurtarma
                              </span>
                            )}
                          </div>
                          {backup.note && (
                            <p className="text-xs text-gray-500 mt-0.5 max-w-md truncate">{backup.note}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                      <div className="font-medium text-gray-900">
                        {new Date(backup.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="text-gray-400 font-mono text-[11px]">
                        {new Date(backup.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                      <span className="font-medium text-gray-900">{backup.createdByName}</span>
                      {backup.createdByEmail && (
                        <div className="text-gray-400 text-[11px] truncate">{backup.createdByEmail}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-gray-900 bg-gray-100 px-2.5 py-1 rounded-md">
                        <TableIcon size={12} className="text-gray-500" />
                        {backup.tablesCount || Object.keys(backup.data || {}).length} Tablo
                      </span>
                      <div className="text-[11px] text-gray-500 mt-0.5">
                        {(backup.totalRecords || 0).toLocaleString('tr-TR')} Kayıt
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-600 font-mono">
                      {backup.fileSizeKb ? `${backup.fileSizeKb} KB` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setPreviewBackup(backup)}
                          title="Detayları İncele"
                          className="btn btn-secondary px-2.5 py-1.5 text-xs text-gray-700 hover:text-brand-600"
                        >
                          <Eye size={14} className="mr-1 inline" />
                          Gözat
                        </button>
                        
                        <button
                          onClick={() => downloadBackupFile(backup)}
                          title="Bilgisayara İndir (.json)"
                          className="btn btn-secondary px-2.5 py-1.5 text-xs text-gray-700 hover:text-emerald-600"
                        >
                          <Download size={14} className="mr-1 inline" />
                          İndir
                        </button>

                        <button
                          onClick={() => {
                            setRestoreTarget(backup);
                            setRestoreConfirmText('');
                          }}
                          title="Bu Yedeğe Geri Dön"
                          className="btn btn-primary px-2.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                        >
                          <RotateCcw size={14} className="mr-1 inline" />
                          Geri Yükle
                        </button>

                        <button
                          onClick={() => void handleDelete(backup)}
                          title="Yedeği Sil"
                          className="btn btn-secondary px-2 py-1.5 text-xs text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE BACKUP MODAL */}
      <Modal
        open={createModalOpen}
        onClose={() => !creating && setCreateModalOpen(false)}
        title="Yeni Canlı Sistem Yedeği Al"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Bu işlem, sistemde kayıtlı olan tüm modüllerin verilerini (Ana Kasa, Bankalar, Kredi Kartları, Çekler, Araçlar, Kesim Listesi vb.) anlık bir arşiv olarak donduracaktır.
          </p>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Yedek Adı *
            </label>
            <input
              type="text"
              className="input w-full font-medium"
              placeholder="Örn: 03 Eylül Güncelleme Öncesi"
              value={backupName}
              onChange={e => setBackupName(e.target.value)}
              disabled={creating}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Açıklama Notu (İsteğe Bağlı)
            </label>
            <textarea
              className="input w-full h-20 text-xs resize-none"
              placeholder="Neden bu yedeği aldığınızı belirten kısa bir not ekleyebilirsiniz..."
              value={backupNote}
              onChange={e => setBackupNote(e.target.value)}
              disabled={creating}
            />
          </div>

          <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600">
            <span className="font-bold text-gray-800">Yedeklenecek Alanlar:</span>
            <div className="grid grid-cols-2 gap-1 mt-2 text-[11px] text-gray-500">
              {BACKUP_TABLES.map(t => (
                <div key={t.name} className="flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                  <span className="truncate">{t.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={creating}
              className="btn btn-secondary text-xs"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={() => void handleCreate()}
              disabled={creating}
              className="btn btn-primary text-xs flex items-center gap-1.5 font-bold"
            >
              {creating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Yedek Alınıyor...
                </>
              ) : (
                <>
                  <Database size={14} />
                  Yedeği Başlat
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* PREVIEW BACKUP MODAL */}
      {previewBackup && (
        <Modal
          open={!!previewBackup}
          onClose={() => setPreviewBackup(null)}
          title={`Yedek Detayı: ${previewBackup.name}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Oluşturulma</span>
                <span className="font-semibold text-gray-800">
                  {new Date(previewBackup.createdAt).toLocaleString('tr-TR')}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Oluşturan</span>
                <span className="font-semibold text-gray-800">{previewBackup.createdByName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Toplam Tablo</span>
                <span className="font-semibold text-gray-800">{previewBackup.tablesCount} Adet</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Toplam Kayıt</span>
                <span className="font-semibold text-gray-800">{(previewBackup.totalRecords || 0).toLocaleString('tr-TR')} Satır</span>
              </div>
            </div>

            {previewBackup.note && (
              <div className="text-xs text-gray-600 bg-amber-50/60 p-2.5 rounded border border-amber-200">
                <span className="font-bold text-amber-900 block text-[11px] mb-0.5">Yedek Notu:</span>
                {previewBackup.note}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Yedeklenen Tablo ve Kayıt Dökümü</h4>
              <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-lg">
                {BACKUP_TABLES.map(t => {
                  const rows = previewBackup.data[t.name] || [];
                  return (
                    <div key={t.name} className="flex items-center justify-between p-2.5 text-xs hover:bg-gray-50">
                      <div>
                        <span className="font-semibold text-gray-800">{t.label}</span>
                        <span className="text-[10px] text-gray-400 ml-1.5 font-mono">({t.name})</span>
                      </div>
                      <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                        rows.length > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'text-gray-400'
                      }`}>
                        {rows.length.toLocaleString('tr-TR')} Kayıt
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-gray-200">
              <button
                onClick={() => downloadBackupFile(previewBackup)}
                className="btn btn-secondary text-xs flex items-center gap-1.5"
              >
                <Download size={14} />
                JSON Olarak İndir
              </button>

              <button
                onClick={() => setPreviewBackup(null)}
                className="btn btn-primary text-xs"
              >
                Kapat
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* RESTORE CONFIRMATION MODAL */}
      {restoreTarget && (
        <Modal
          open={!!restoreTarget}
          onClose={() => !restoring && setRestoreTarget(null)}
          title="⚠️ Eski Sürüme Geri Dön (Restore)"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <p className="font-bold text-sm text-rose-950">DİKKAT: Veritabanı Geri Yüklenecek!</p>
                  <p className="mt-1">
                    <strong>"{restoreTarget.name}"</strong> ({new Date(restoreTarget.createdAt).toLocaleString('tr-TR')}) tarihli yedeğe geri dönmek üzeresiniz.
                  </p>
                  <p className="mt-1 text-rose-800">
                    Bu işlem canlı veritabanındaki verileri bu yedeğin durumu ile güncelleyecektir.
                  </p>
                  <div className="mt-2.5 font-bold text-rose-950 bg-white/70 p-2 rounded border border-rose-200 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Güvenlik Garantisi: Geri yükleme başlamadan önce sistem şu anki durumunuzun tam bir kurtarma yedeğini otomatik olarak alacaktır.</span>
                  </div>
                </div>
              </div>
            </div>

            {restoring ? (
              <div className="py-6 text-center space-y-3">
                <RefreshCw size={32} className="mx-auto text-indigo-600 animate-spin" />
                <h4 className="text-sm font-bold text-gray-900">Geri Yükleme Gerçekleştiriliyor...</h4>
                {restoreProgress && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">
                      Yazılıyor: <strong className="text-indigo-600">{restoreProgress.table}</strong> ({restoreProgress.current} / {restoreProgress.total})
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-indigo-600 h-2 transition-all duration-300" 
                        style={{ width: `${Math.round((restoreProgress.current / restoreProgress.total) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Onaylamak için aşağıdaki kutucuğa <span className="text-rose-600">ONAYLA</span> yazın:
                </label>
                <input
                  type="text"
                  className="input w-full font-mono text-center tracking-widest text-base font-bold text-rose-700 border-rose-300 focus:ring-rose-500 uppercase"
                  placeholder="ONAYLA"
                  value={restoreConfirmText}
                  onChange={e => setRestoreConfirmText(e.target.value)}
                />
              </div>
            )}

            {!restoring && (
              <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setRestoreTarget(null)}
                  className="btn btn-secondary text-xs"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={() => void handleRestore()}
                  disabled={restoreConfirmText.trim().toUpperCase() !== 'ONAYLA'}
                  className="btn btn-primary text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCcw size={14} />
                  Geri Yüklemeyi Başlat
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
