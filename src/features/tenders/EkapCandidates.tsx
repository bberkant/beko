import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Radar, X, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

interface Candidate {
  id: string;
  ikn: string;
  title: string;
  institution: string;
  city: string | null;
  deadline_at: string;
  matched_keyword: string;
}

export function EkapCandidates({ canWrite, onAccepted }: { canWrite: boolean; onAccepted: () => Promise<void> }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  // Scan states
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [startDateInput, setStartDateInput] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [endDateInput, setEndDateInput] = useState(() => {
    const today = new Date();
    const future15 = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));
    const yyyy = future15.getFullYear();
    const mm = String(future15.getMonth() + 1).padStart(2, '0');
    const dd = String(future15.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [scanSubmitting, setScanSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    const now = new Date();
    const scanEndsAt = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));

    try {
      // 1. Bekleyen adaylar varsa otomatik olarak onaylayıp doğrudan ihaleler tablosuna ekle
      const { data: pendingData } = await supabase
        .from('ekap_candidates')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'bekliyor')
        .or('scope.is.null,scope.eq.tender,scope.eq.4734,scope.eq.ihale')
        .not('ikn', 'ilike', '%DT%')
        .gte('deadline_at', now.toISOString())
        .lte('deadline_at', scanEndsAt.toISOString())
        .order('deadline_at');

      if (pendingData && pendingData.length > 0) {
        let addedCount = 0;
        for (const item of pendingData) {
          const { error: insError } = await supabase.from('tenders').insert({
            organization_id: user.organizationId,
            tender_number: item.ikn,
            title: item.title,
            institution: item.institution,
            tender_type: 'mal',
            method: 'acik',
            status: 'hazirlaniyor',
            estimated_amount: 0,
            currency: 'TRY',
            deadline_at: item.deadline_at,
            assigned_to: '',
            description: `EKAP 4734 kapsamı · Eşleşme: ${item.matched_keyword || 'OKAS 15100000'}`,
            created_by: user.id
          });

          if (!insError || insError.code === '23505') {
            addedCount++;
          }
        }

        const ids = pendingData.map(c => c.id);
        await supabase
          .from('ekap_candidates')
          .update({
            status: 'onaylandi',
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id
          })
          .in('id', ids);

        if (addedCount > 0) {
          notify(`${addedCount} adet yeni EKAP ihalesi otomatik onaylanıp listeye eklendi.`, 'success');
          await onAccepted();
        }
      }

      // 2. Önümüzdeki 15 gün içinde otomatik eklenmiş (onaylanmış) güncel ihaleleri getir
      const { data: approvedData, error } = await supabase
        .from('ekap_candidates')
        .select('id,ikn,title,institution,city,deadline_at,matched_keyword')
        .eq('organization_id', user.organizationId)
        .eq('status', 'onaylandi')
        .or('scope.is.null,scope.eq.tender,scope.eq.4734,scope.eq.ihale')
        .not('ikn', 'ilike', '%DT%')
        .gte('deadline_at', now.toISOString())
        .lte('deadline_at', scanEndsAt.toISOString())
        .order('deadline_at');

      if (!error && approvedData) {
        setItems(approvedData as Candidate[]);
      }
    } catch (e: any) {
      console.warn('EKAP aday senkronizasyon hatası:', e.message);
    } finally {
      setLoading(false);
    }
  }, [user?.organizationId, user?.id, notify, onAccepted]);

  const fetchActiveRequest = useCallback(async () => {
    if (!user?.organizationId) return;
    const { data, error } = await supabase
      .from('ekap_scan_requests')
      .select('*')
      .eq('organization_id', user.organizationId)
      .or('scope.is.null,scope.eq.tender,scope.eq.4734,scope.eq.ihale')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveRequest((prev: any) => {
        if (prev && ['pending', 'running'].includes(prev.status) && !['pending', 'running'].includes(data.status)) {
          if (data.status === 'completed') {
            notify('EKAP 4734 İhale taraması tamamlandı, ihaleler listeye eklendi!', 'success');
            void refresh();
          } else if (data.status === 'failed') {
            notify(`EKAP taraması başarısız oldu: ${data.error_message || 'Bilinmeyen hata'}`, 'error');
          }
        }
        return data;
      });
    }
  }, [user?.organizationId, notify, refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    void fetchActiveRequest();

    const interval = setInterval(() => {
      if (activeRequest && ['pending', 'running'].includes(activeRequest.status)) {
        void fetchActiveRequest();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [open, activeRequest?.status, fetchActiveRequest]);

  const handleStartScan = async () => {
    if (!user?.organizationId || !user.id) return;
    if (!startDateInput || !endDateInput) {
      notify('Lütfen başlangıç ve bitiş tarihlerini girin.', 'error');
      return;
    }

    setScanSubmitting(true);
    const { error } = await supabase.from('ekap_scan_requests').insert({
      organization_id: user.organizationId,
      start_date: startDateInput,
      end_date: endDateInput,
      scope: 'tender',
      status: 'pending',
      requested_by: user.id
    });

    if (error) {
      notify(error.message, 'error');
    } else {
      notify('İhale tarama talebi sıraya alındı, bulunanlar otomatik eklenecek.', 'success');
      setActiveRequest({ status: 'pending', start_date: startDateInput, end_date: endDateInput, scope: 'tender' });
      void fetchActiveRequest();
    }
    setScanSubmitting(false);
  };

  const removeCandidate = async (item: Candidate) => {
    if (!user?.organizationId) return;
    if (!confirm(`“${item.title}” ihalesi listeden kaldırılsın mı?`)) return;

    // Delete from tenders table
    await supabase
      .from('tenders')
      .delete()
      .eq('organization_id', user.organizationId)
      .eq('tender_number', item.ikn);

    // Mark as reddedildi in candidates so it won't auto-add again
    await supabase
      .from('ekap_candidates')
      .update({
        status: 'reddedildi',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', item.id)
      .eq('organization_id', user.organizationId);

    notify('İhale listeden kaldırıldı.', 'success');
    await refresh();
    await onAccepted();
  };

  return (
    <>
      <button className="btn-secondary" onClick={() => { setOpen(true); void refresh(); }}>
        <Radar size={16} />
        EKAP İhale Taraması{items.length ? ` (${items.length})` : ''}
      </button>
      
      <Modal open={open} onClose={() => setOpen(false)} title="EKAP İhale Taraması" size="lg">
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>
            Önümüzdeki 15 gün içinde, EKAP'ta OKAS Kodu 15100000 (Hayvansal mezbaha ürünleri, et ve et ürünleri) kapsamında yayınlanan tüm ihaleler otomatik olarak onaylanıp İhaleler listesine ve Takvim’e eklenir.
          </span>
        </div>

        {canWrite && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Yeni İhale Taraması Başlat</h3>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">İlan Başlangıç Tarihi</label>
                <input 
                  type="date" 
                  value={startDateInput} 
                  onChange={(e) => setStartDateInput(e.target.value)} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" 
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">İlan Bitiş Tarihi</label>
                <input 
                  type="date" 
                  value={endDateInput} 
                  onChange={(e) => setEndDateInput(e.target.value)} 
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" 
                />
              </div>
              <button 
                onClick={handleStartScan} 
                disabled={scanSubmitting || (activeRequest && ['pending', 'running'].includes(activeRequest.status))}
                className="btn-primary py-2 px-4 h-[38px] flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Radar size={16} />
                Taramayı Başlat
              </button>
            </div>
            
            {activeRequest && (
              <div className="mt-3">
                {activeRequest.status === 'pending' && (
                  <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg p-2.5">
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <span>Tarama sıraya alındı, yerel tarayıcı bekleniyor... (Bulunan ihaleler doğrudan eklenecektir.)</span>
                  </div>
                )}
                {activeRequest.status === 'running' && (
                  <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded-lg p-2.5">
                    <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping shrink-0" />
                    <span>Tarama gerçekleştiriliyor, lütfen bekleyiniz... Bu işlem birkaç dakika sürebilir.</span>
                  </div>
                )}
                {activeRequest.status === 'completed' && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 rounded-lg p-2.5">
                    Son tarama başarıyla tamamlandı. Tarih aralığı: {new Date(activeRequest.start_date).toLocaleDateString('tr-TR')} - {new Date(activeRequest.end_date).toLocaleDateString('tr-TR')}
                  </div>
                )}
                {activeRequest.status === 'failed' && (
                  <div className="text-xs text-red-700 bg-red-50 rounded-lg p-2.5">
                    Son tarama başarısız oldu: {activeRequest.error_message || 'Bilinmeyen hata'} (Tarih: {new Date(activeRequest.start_date).toLocaleDateString('tr-TR')} - {new Date(activeRequest.end_date).toLocaleDateString('tr-TR')})
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-gray-700">
          <span>Otomatik Eklenen İhaleler ({items.length} Adet)</span>
        </div>

        {loading ? (
          <div className="py-10 text-center text-gray-400">Kayıtlar yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-400">Önümüzdeki 15 gün içinde otomatik eklenmiş EKAP ihalesi bulunamadı.</div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {items.map(x => (
              <div key={x.id} className="rounded-xl border border-gray-200 p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-brand-600">{x.ikn}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-600">{x.matched_keyword}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                        Otomatik Eklendi
                      </span>
                    </div>
                    <div className="font-semibold text-gray-900 text-sm">{x.title}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      {x.institution} · {x.city || '—'} · Son Teklif: <strong className="text-gray-700">{new Date(x.deadline_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}</strong>
                    </div>
                  </div>
                  {canWrite && (
                    <button 
                      className="btn-secondary px-2.5 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0 flex items-center gap-1"
                      onClick={() => void removeCandidate(x)} 
                      title="Listeden Kaldır"
                    >
                      <X size={14} />
                      <span>Kaldır</span>
                    </button>
                  )}
                </div>
                <a 
                  href="https://ekapv2.kik.gov.tr/ekap/search" 
                  target="_blank" 
                  rel="noreferrer" 
                  onClick={() => {
                    navigator.clipboard.writeText(x.ikn);
                    notify('İhale numarası (İKN) panoya kopyalandı! EKAP sayfasında arama kutusuna Ctrl+V ile yapıştırabilirsiniz.', 'success');
                  }}
                  className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:underline"
                >
                  EKAP’ta doğrula <ExternalLink size={12} />
                </a>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
