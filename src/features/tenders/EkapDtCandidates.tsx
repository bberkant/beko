import { useCallback, useEffect, useState } from 'react';
import { Check, ExternalLink, Radar, X } from 'lucide-react';
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

export function EkapDtCandidates({ canWrite, onAccepted }: { canWrite: boolean; onAccepted: () => Promise<void> }) {
  const { user } = useAuth();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);

  // Scan states
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [scanSubmitting, setScanSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.organizationId) return;
    setLoading(true);
    const now = new Date();
    // Scan scope for direct procurements is 15 days
    const scanEndsAt = new Date(now.getTime() + (15 * 24 * 60 * 60 * 1000));
    const { data, error } = await supabase
      .from('ekap_candidates')
      .select('id,ikn,title,institution,city,deadline_at,matched_keyword')
      .eq('organization_id', user.organizationId)
      .eq('status', 'bekliyor')
      .eq('scope', 'dogrudan_temin')
      .gte('deadline_at', now.toISOString())
      .lte('deadline_at', scanEndsAt.toISOString())
      .order('deadline_at');
    
    if (!error) setItems((data ?? []) as Candidate[]);
    setLoading(false);
  }, [user?.organizationId]);

  const fetchActiveRequest = useCallback(async () => {
    if (!user?.organizationId) return;
    const { data, error } = await supabase
      .from('ekap_scan_requests')
      .select('*')
      .eq('organization_id', user.organizationId)
      .eq('scope', 'dogrudan_temin')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setActiveRequest((prev: any) => {
        if (prev && ['pending', 'running'].includes(prev.status) && !['pending', 'running'].includes(data.status)) {
          if (data.status === 'completed') {
            notify('Doğrudan Temin taraması başarıyla tamamlandı!', 'success');
            void refresh();
          } else if (data.status === 'failed') {
            notify(`Doğrudan Temin taraması başarısız oldu: ${data.error_message || 'Bilinmeyen hata'}`, 'error');
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

    setScanSubmitting(true);
    const today = new Date();
    const future15Days = new Date(today.getTime() + (15 * 24 * 60 * 60 * 1000));
    
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const { error } = await supabase.from('ekap_scan_requests').insert({
      organization_id: user.organizationId,
      start_date: formatDate(today),
      end_date: formatDate(future15Days),
      status: 'pending',
      requested_by: user.id,
      scope: 'dogrudan_temin'
    });

    if (error) {
      notify(error.message, 'error');
    } else {
      notify('Doğrudan Temin tarama talebi sıraya alındı.', 'success');
      setActiveRequest({ status: 'pending', start_date: formatDate(today), end_date: formatDate(future15Days) });
      void fetchActiveRequest();
    }
    setScanSubmitting(false);
  };

  const review = async (item: Candidate, accept: boolean) => {
    if (!user?.organizationId || !user.id) return;
    if (accept) {
      const { error } = await supabase.from('tenders').insert({
        organization_id: user.organizationId,
        tender_number: item.ikn,
        title: item.title,
        institution: item.institution,
        tender_type: 'mal',
        method: 'dogrudan', // Set method to 'dogrudan' for direct procurements
        status: 'hazirlaniyor',
        estimated_amount: 0,
        currency: 'TRY',
        deadline_at: item.deadline_at,
        assigned_to: '',
        description: `EKAP Doğrudan Temin (Gıda) · Eşleşme: ${item.matched_keyword}`
      });
      if (error && error.code !== '23505') {
        notify(error.message, 'error');
        return;
      }
    }
    const { error } = await supabase
      .from('ekap_candidates')
      .update({
        status: accept ? 'onaylandi' : 'reddedildi',
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      })
      .eq('id', item.id)
      .eq('organization_id', user.organizationId);

    if (error) {
      notify(error.message, 'error');
      return;
    }
    notify(accept ? 'Doğrudan Temin onaylandı ve listeye eklendi.' : 'Aday reddedildi.', 'success');
    await refresh();
    if (accept) await onAccepted();
  };

  const handleApproveAll = async () => {
    if (!user?.organizationId || !user.id || items.length === 0) return;
    setLoading(true);
    
    const insertPromises = items.map(async (item) => {
      const { error } = await supabase.from('tenders').insert({
        organization_id: user.organizationId,
        tender_number: item.ikn,
        title: item.title,
        institution: item.institution,
        tender_type: 'mal',
        method: 'dogrudan',
        status: 'hazirlaniyor',
        estimated_amount: 0,
        currency: 'TRY',
        deadline_at: item.deadline_at,
        assigned_to: '',
        description: `EKAP Doğrudan Temin (Gıda) · Eşleşme: ${item.matched_keyword}`
      });
      if (error && error.code !== '23505') {
        throw error;
      }
    });

    try {
      await Promise.all(insertPromises);
      
      const candidateIds = items.map(item => item.id);
      const { error: updateError } = await supabase
        .from('ekap_candidates')
        .update({
          status: 'onaylandi',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .in('id', candidateIds)
        .eq('organization_id', user.organizationId);

      if (updateError) {
        notify(updateError.message, 'error');
      } else {
        notify('Tüm doğrudan teminler onaylandı ve listeye eklendi.', 'success');
        await refresh();
        await onAccepted();
      }
    } catch (err: any) {
      notify(err.message || 'Bir hata oluştu.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button className="btn-secondary" onClick={() => { setOpen(true); void refresh(); }}>
        <Radar size={16} />
        EKAP Doğrudan Temin{items.length ? ` (${items.length})` : ''}
      </button>
      
      <Modal open={open} onClose={() => setOpen(false)} title="EKAP Doğrudan Temin Adayları" size="lg">
        <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
          Önümüzdeki 15 gün içinde EKAP doğrudan teminlerinde mal/gıda branşıyla yayınlanan tüm kayıtlar. Onaylananlar Doğrudan Temin listesine eklenir.
        </div>

        {canWrite && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Otomatik Doğrudan Temin Taraması Başlat</h3>
                <p className="text-xs text-gray-550 mt-0.5">EKAP Doğrudan Temin sayfasından önümüzdeki 15 günlük listeyi tarar.</p>
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
                    <span>Tarama sıraya alındı, yerel tarayıcı bekleniyor... (Maksimum 5 dakika içinde başlayacaktır.)</span>
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
                    Son tarama başarıyla tamamlandı. Önümüzdeki 15 günlük doğrudan temin listesi tarandı.
                  </div>
                )}
                {activeRequest.status === 'failed' && (
                  <div className="text-xs text-red-700 bg-red-50 rounded-lg p-2.5">
                    Son tarama başarısız oldu: {activeRequest.error_message || 'Bilinmeyen hata'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {items.length > 0 && canWrite && (
          <div className="mb-4 flex justify-end">
            <button 
              onClick={handleApproveAll} 
              disabled={loading}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <Check size={14} />
              Tümünü Onayla ({items.length})
            </button>
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-gray-400">Kayıtlar yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-center text-gray-400">Önümüzdeki 15 gün içinde onay bekleyen Doğrudan Temin kaydı yok.</div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            {items.map(x => (
              <div key={x.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 text-xs font-medium text-brand-600">{x.ikn} · {x.matched_keyword}</div>
                    <div className="font-medium text-gray-900">{x.title}</div>
                    <div className="mt-1 text-sm text-gray-500">
                      {x.institution} · {x.city || '—'} · {new Date(x.deadline_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-2">
                      <button className="btn-secondary px-3" onClick={() => void review(x, false)} title="Reddet">
                        <X size={16} />
                      </button>
                      <button className="btn-primary px-3" onClick={() => void review(x, true)} title="Onayla">
                        <Check size={16} />
                        Onayla
                      </button>
                    </div>
                  )}
                </div>
                <a 
                  href="https://ekapv2.kik.gov.tr/ekap-dt/search" 
                  target="_blank" 
                  rel="noreferrer" 
                  onClick={() => {
                    navigator.clipboard.writeText(x.ikn);
                    notify('Doğrudan temin numarası panoya kopyalandı! EKAP sayfasında arama kutusuna Ctrl+V ile yapıştırabilirsiniz.', 'success');
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
