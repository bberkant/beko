import { useCallback, useEffect, useState } from 'react';
import { Radar, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';

export function EkapCandidates({ canWrite, onAccepted }: { canWrite: boolean; onAccepted: () => Promise<void> }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);

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

  const syncPendingToTenders = useCallback(async () => {
    if (!user?.organizationId) return;
    const now = new Date();

    try {
      // Bekleyen adaylar varsa doğrudan ihaleler tablosuna aktar
      const { data: pendingData } = await supabase
        .from('ekap_candidates')
        .select('*')
        .eq('organization_id', user.organizationId)
        .eq('status', 'bekliyor')
        .or('scope.is.null,scope.eq.tender,scope.eq.4734,scope.eq.ihale')
        .not('ikn', 'ilike', '%DT%')
        .gte('deadline_at', now.toISOString())
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
          notify(`${addedCount} adet yeni EKAP ihalesi doğrudan listeye eklendi.`, 'success');
          await onAccepted();
        }
      }
    } catch (e: any) {
      console.warn('EKAP aday senkronizasyon hatası:', e.message);
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
            notify('EKAP 4734 İhale taraması tamamlandı, yeni ihaleler doğrudan sayfaya eklendi!', 'success');
            void syncPendingToTenders();
            void onAccepted();
          } else if (data.status === 'failed') {
            notify(`EKAP taraması başarısız oldu: ${data.error_message || 'Bilinmeyen hata'}`, 'error');
          }
        }
        return data;
      });
    }
  }, [user?.organizationId, notify, syncPendingToTenders, onAccepted]);

  useEffect(() => {
    void syncPendingToTenders();
    void fetchActiveRequest();
  }, [syncPendingToTenders, fetchActiveRequest]);

  useEffect(() => {
    if (!activeRequest || !['pending', 'running'].includes(activeRequest.status)) return;

    const interval = setInterval(() => {
      void fetchActiveRequest();
    }, 5000);

    return () => clearInterval(interval);
  }, [activeRequest?.status, fetchActiveRequest]);

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
      notify('İhale tarama talebi sıraya alındı, bulunanlar doğrudan sayfadaki tabloya eklenecektir.', 'success');
      setActiveRequest({ status: 'pending', start_date: startDateInput, end_date: endDateInput, scope: 'tender' });
      void fetchActiveRequest();
    }
    setScanSubmitting(false);
  };

  return (
    <>
      <button className="btn-secondary flex items-center gap-1.5" onClick={() => { setOpen(true); void fetchActiveRequest(); }}>
        <Radar size={16} />
        <span>EKAP'tan Tara</span>
      </button>
      
      <Modal open={open} onClose={() => setOpen(false)} title="EKAP İhale Taraması Başlat" size="md">
        <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>
            EKAP'ta OKAS Kodu 15100000 (Hayvansal mezbaha ürünleri, et ve et ürünleri) kapsamındaki ihaleler otomatik taranır ve doğrudan bu sayfadaki <strong>İhaleler</strong> tablosuna eklenir.
          </span>
        </div>

        {canWrite && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900">Tarama Tarih Aralığı</h3>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">İlan Başlangıç Tarihi</label>
                  <input 
                    type="date" 
                    value={startDateInput} 
                    onChange={(e) => setStartDateInput(e.target.value)} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">İlan Bitiş Tarihi</label>
                  <input 
                    type="date" 
                    value={endDateInput} 
                    onChange={(e) => setEndDateInput(e.target.value)} 
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" 
                  />
                </div>
              </div>
              <button 
                onClick={handleStartScan} 
                disabled={scanSubmitting || (activeRequest && ['pending', 'running'].includes(activeRequest.status))}
                className="btn-primary py-2 px-4 h-[38px] flex items-center justify-center gap-1.5 disabled:opacity-50 mt-1"
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
                    <span>Tarama sıraya alındı, yerel tarayıcı bekleniyor... (Bulunan ihaleler doğrudan bu sayfadaki tabloya eklenecektir.)</span>
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
                    Son tarama başarıyla tamamlandı. Tarih aralığı: {new Date(activeRequest.start_date).toLocaleDateString('tr-TR')} - {new Date(activeRequest.end_date).toLocaleDateString('tr-TR')} (İhaleler ana tabloya eklendi)
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
      </Modal>
    </>
  );
}
