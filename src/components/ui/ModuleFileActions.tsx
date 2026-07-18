import { useState } from 'react';
import { Download, FileText, Upload } from 'lucide-react';
import { Modal } from './Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

type ModuleName = 'bank_accounts' | 'vehicles' | 'traffic_fines' | 'drivers';
interface Props { module: ModuleName; exportName: string; rows: Record<string, unknown>[] }

function csvValue(value: unknown) { return `"${String(value ?? '').replace(/"/g, '""')}"`; }

export function ModuleFileActions({ module, exportName, rows }: Props) {
  const { user } = useAuth(); const { notify } = useToast();
  const [open, setOpen] = useState(false); const [file, setFile] = useState<File>();
  const [note, setNote] = useState(''); const [saving, setSaving] = useState(false);
  const exportCsv = () => {
    if (!rows.length) { notify('Dışa aktarılacak kayıt bulunamadı.', 'error'); return; }
    const headers = Object.keys(rows[0]);
    const csv = `\uFEFF${headers.map(csvValue).join(';')}\n${rows.map(r => headers.map(h => csvValue(r[h])).join(';')).join('\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${exportName}-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
    notify('Liste dışa aktarıldı.', 'success');
  };
  const upload = async () => {
    if (!file || !user?.organizationId) { notify('Bir PDF dosyası seçin.', 'error'); return; }
    setSaving(true);
    try {
      const path = `${user.organizationId}/modules/${module}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('operations-documents').upload(path, file, { contentType: 'application/pdf' });
      if (uploadError) throw uploadError;
      const { error } = await supabase.from('module_documents').insert({ organization_id: user.organizationId, module, file_name: file.name, file_path: path, note });
      if (error) { await supabase.storage.from('operations-documents').remove([path]); throw error; }
      notify('PDF güvenli şekilde yüklendi.', 'success'); setOpen(false); setFile(undefined); setNote('');
    } catch (error) { notify(error instanceof Error ? error.message : 'PDF yüklenemedi.', 'error'); }
    finally { setSaving(false); }
  };
  return <>
    <button className="btn-secondary" onClick={() => setOpen(true)}><Upload size={16}/> PDF Yükle</button>
    <button className="btn-secondary" onClick={exportCsv}><Download size={16}/> Dışa Aktar</button>
    <Modal open={open} onClose={() => setOpen(false)} title="PDF Yükle" description="Dosya yalnızca şirketinizdeki yetkili kullanıcılar tarafından görülebilir.">
      <div className="space-y-4"><label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-5"><FileText className="text-brand-600"/><span className="text-sm">{file?.name ?? 'PDF dosyası seçin'}</span><input hidden type="file" accept="application/pdf,.pdf" onChange={e => { const f=e.target.files?.[0]; if(f && f.size<=10*1024*1024)setFile(f); else notify('PDF en fazla 10 MB olabilir.','error'); }}/></label><textarea className="input" placeholder="Dosya notu (opsiyonel)" value={note} onChange={e=>setNote(e.target.value)}/><button className="btn-primary w-full" disabled={saving} onClick={upload}>{saving?'Yükleniyor...':'PDF Yükle'}</button></div>
    </Modal>
  </>;
}
