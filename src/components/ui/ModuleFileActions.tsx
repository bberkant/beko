import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Upload, ChevronDown, FileSpreadsheet } from 'lucide-react';
import { Modal } from './Modal';
import { supabase, normalizeFileName } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import * as XLSX from 'xlsx';

type ModuleName = 'bank_accounts' | 'vehicles' | 'traffic_fines' | 'drivers' | 'tenders' | 'real_estates';
interface Props {
  module: ModuleName;
  exportName: string;
  rows: Record<string, unknown>[];
  uploadEnabled?: boolean;
  variant?: 'buttons' | 'dropdown';
  onActionClick?: () => void;
}

export function ModuleFileActions({
  module,
  exportName,
  rows,
  uploadEnabled = true,
  variant = 'buttons',
  onActionClick
}: Props) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File>();
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const exportToExcel = () => {
    if (!rows.length) {
      notify('Dışa aktarılacak kayıt bulunamadı.', 'error');
      return;
    }
    try {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
      XLSX.writeFile(workbook, `${exportName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
      notify('Excel başarıyla indirildi.', 'success');
    } catch (err) {
      notify('Excel dışa aktarma başarısız oldu.', 'error');
    }
  };

  const exportToPdf = () => {
    if (!rows.length) {
      notify('Dışa aktarılacak kayıt bulunamadı.', 'error');
      return;
    }
    const headers = Object.keys(rows[0]);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      notify('Açılır pencere engelleyiciyi devre dışı bırakın.', 'error');
      return;
    }
    const html = `
      <html>
        <head>
          <title>${exportName}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            h1 { font-size: 18px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 11px; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; }
            tr:nth-child(even) { background-color: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>${exportName}</h1>
          <table>
            <thead>
              <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
            </thead>
            <tbody>
              ${rows.map(r => `<tr>${headers.map(h => `<td>${r[h] !== null && r[h] !== undefined ? String(r[h]) : '—'}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    notify('PDF baskı penceresi açıldı.', 'success');
  };

  const upload = async () => {
    if (!file || !user?.organizationId) {
      notify('Lütfen geçerli bir dosya (PDF veya Excel) seçin.', 'error');
      return;
    }
    setSaving(true);
    try {
      const normalizedName = normalizeFileName(file.name);
      const path = `${user.organizationId}/modules/${module}/${crypto.randomUUID()}-${normalizedName}`;
      const { error: uploadError } = await supabase.storage.from('operations-documents').upload(path, file, { contentType: file.type });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('module_documents').insert({ organization_id: user.organizationId, module, file_name: file.name, file_path: path, note });
      if (error) {
        await supabase.storage.from('operations-documents').remove([path]);
        throw error;
      }
      notify('Dosya güvenli şekilde yüklendi.', 'success');
      setOpen(false);
      setFile(undefined);
      setNote('');
      if (onActionClick) onActionClick();
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Dosya yüklenemedi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {variant === 'dropdown' ? (
        <>
          {uploadEnabled && (
            <button
              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
              onClick={() => { setOpen(true); if (onActionClick) onActionClick(); }}
            >
              <Upload size={14} className="text-gray-400" /> Dosya Yükle
            </button>
          )}
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
            onClick={() => { exportToExcel(); if (onActionClick) onActionClick(); }}
          >
            <Download size={14} className="text-gray-400" /> Excel Dışa Aktar
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
            onClick={() => { exportToPdf(); if (onActionClick) onActionClick(); }}
          >
            <Download size={14} className="text-gray-400" /> PDF Dışa Aktar
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          {uploadEnabled && (
            <button className="btn-secondary" onClick={() => setOpen(true)}>
              <Upload size={16} /> Dosya Yükle
            </button>
          )}

          <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn-secondary flex items-center gap-1.5"
            >
              <Download size={16} />
              Dışa Aktar
              <ChevronDown size={14} className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-44 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-gray-100 p-1">
                <button
                  onClick={() => { exportToExcel(); setDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left font-medium"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" />
                  Excel olarak indir
                </button>
                <button
                  onClick={() => { exportToPdf(); setDropdownOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left font-medium"
                >
                  <FileText size={15} className="text-red-500" />
                  PDF olarak yazdır
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {uploadEnabled && (
        <Modal open={open} onClose={() => setOpen(false)} title="Dosya Yükle" description="PDF, Excel veya görsel (JPG, JPEG, PNG) dosyaları yüklenebilir. Dosya yalnızca şirketinizdeki yetkili kullanıcılar tarafından görülebilir.">
          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-5">
              <FileText className="text-brand-600" />
              <span className="text-sm">{file?.name ?? 'PDF, Excel veya görsel dosya seçin'}</span>
              <input
                hidden
                type="file"
                accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png,application/pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/jpeg,image/png"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f && f.size <= 10 * 1024 * 1024) setFile(f);
                  else notify('Dosya en fazla 10 MB olabilir.', 'error');
                }}
              />
            </label>
            <textarea
              className="input"
              placeholder="Dosya notu (opsiyonel)"
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <button className="btn-primary w-full" disabled={saving} onClick={upload}>
              {saving ? 'Yükleniyor...' : 'Dosya Yükle'}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
