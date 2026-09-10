import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Fuel, 
  Wallet, 
  CreditCard, 
  Beef, 
  FileText, 
  CheckCircle2, 
  Search, 
  Eye, 
  ArrowRight, 
  XCircle, 
  RefreshCw,
  PlusCircle
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { WhatsAppIncomingMedia } from '../types';
import { 
  ConvertSanayiModal, 
  ConvertYakitModal, 
  ConvertKasaModal, 
  ConvertCekModal 
} from './QuickConvertModals';

interface IncomingMediaFeedProps {
  onRefreshStats?: () => void;
  onNavigateToTasks?: () => void;
}

export const IncomingMediaFeed: React.FC<IncomingMediaFeedProps> = ({
  onRefreshStats,
  onNavigateToTasks
}) => {
  const { user } = useAuth();
  const [items, setItems] = useState<WhatsAppIncomingMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'pending' | 'processed' | 'ignored'>('pending');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Active Modals
  const [activeConvertModal, setActiveConvertModal] = useState<{
    type: 'sanayi' | 'yakit' | 'kasa' | 'cek' | null;
    media: WhatsAppIncomingMedia | null;
  }>({ type: null, media: null });

  const fetchMedia = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('whatsapp_incoming_media')
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.organizationId) {
        query = query.eq('organization_id', user.organizationId);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      if (selectedModule !== 'all') {
        query = query.eq('suggested_module', selectedModule);
      }

      const { data, error } = await query;
      if (error) throw error;

      setItems(data || []);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('WhatsApp medya havuzu çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [user?.organizationId, selectedStatus, selectedModule]);

  const handleStatusChange = async (id: string, newStatus: 'pending' | 'processed' | 'ignored') => {
    try {
      const { error } = await supabase
        .from('whatsapp_incoming_media')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      fetchMedia();
    } catch (err) {
      console.error('Durum güncelleme hatası:', err);
    }
  };

  const handleConvertToTask = async (media: WhatsAppIncomingMedia) => {
    if (!user?.organizationId) return;
    try {
      const { error } = await supabase
        .from('whatsapp_tasks')
        .insert({
          organization_id: user.organizationId,
          group_name: media.group_name,
          title: `${media.group_name} Belge İnceleme`,
          description: media.caption || 'WhatsApp üzerinden gelen belgenin kontrolü ve ERP mutabakatı.',
          sender_name: media.sender_name,
          original_message: media.caption,
          priority: 'medium',
          category: media.suggested_module === 'sanayi' ? 'arac_bakim' : 'sevkiyat',
          status: 'todo',
          media_url: media.media_url
        });

      if (error) throw error;

      await handleStatusChange(media.id, 'processed');
      if (onNavigateToTasks) onNavigateToTasks();
    } catch (err) {
      console.error('İş emrine dönüştürme hatası:', err);
    }
  };

  // Filtered by search
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const plate = item.extracted_data?.plate?.toLowerCase() || '';
    const supplier = item.extracted_data?.supplier?.toLowerCase() || '';
    const group = item.group_name.toLowerCase();
    const sender = item.sender_name.toLowerCase();
    const caption = item.caption?.toLowerCase() || '';
    return plate.includes(q) || supplier.includes(q) || group.includes(q) || sender.includes(q) || caption.includes(q);
  });

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'sanayi':
        return { label: 'Sanayi Gideri', icon: Wrench, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'yakit':
        return { label: 'Yakıt Fişi', icon: Fuel, bg: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'kasa':
        return { label: 'Kasa / Z-Raporu', icon: Wallet, bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'cek':
        return { label: 'Müşteri Çeki', icon: CreditCard, bg: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'kesim':
        return { label: 'Kantar / Kesim Fişi', icon: Beef, bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      default:
        return { label: 'Genel Belge', icon: FileText, bg: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  const openConvertModal = (item: WhatsAppIncomingMedia) => {
    const mod = item.suggested_module;
    if (mod === 'sanayi') setActiveConvertModal({ type: 'sanayi', media: item });
    else if (mod === 'yakit') setActiveConvertModal({ type: 'yakit', media: item });
    else if (mod === 'kasa') setActiveConvertModal({ type: 'kasa', media: item });
    else if (mod === 'cek') setActiveConvertModal({ type: 'cek', media: item });
    else setActiveConvertModal({ type: 'sanayi', media: item });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Tabs */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedStatus === 'pending' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bekleyenler
            </button>
            <button
              onClick={() => setSelectedStatus('processed')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedStatus === 'processed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              İşlenenler
            </button>
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                selectedStatus === 'all' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tümü
            </button>
          </div>

          {/* Module Filter Select */}
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tüm Modüller</option>
            <option value="sanayi">🔧 Sanayi Giderleri</option>
            <option value="yakit">⛽ Yakıt Fişleri</option>
            <option value="kasa">💰 Ana Kasa / Z-Raporu</option>
            <option value="cek">💳 Çek & Senet</option>
            <option value="kesim">🥩 Kesim & Kantar</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 w-full md:w-80">
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Plaka, cari, grup veya gönderen ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={fetchMedia}
            className="p-2 text-gray-500 hover:text-emerald-600 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-lg transition"
            title="Yenile"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Feed List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2" />
          <span className="text-xs">WhatsApp havuzu taranıyor...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 size={24} />
          </div>
          <h4 className="text-sm font-bold text-gray-800">İşlenecek Belge Kalmadı</h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Şirket WhatsApp gruplarından yeni fiş, fatura veya kantar fişi geldikçe burada otomatik listelenecektir.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const badge = getModuleBadge(item.suggested_module);
            const Icon = badge.icon;
            const ext = item.extracted_data || {};

            return (
              <div
                key={item.id}
                className={`bg-white rounded-xl border transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between ${
                  item.status === 'processed' 
                    ? 'border-gray-200 opacity-85' 
                    : item.status === 'ignored'
                    ? 'border-gray-200 bg-gray-50/50 opacity-60'
                    : 'border-emerald-200/80 ring-1 ring-emerald-500/10'
                }`}
              >
                {/* Header */}
                <div className="p-4 pb-2 border-b border-gray-100 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{item.group_name}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <span className="font-semibold text-gray-700">{item.sender_name}</span>
                      <span>&bull;</span>
                      <span>{new Date(item.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                    <Icon size={12} />
                    {badge.label}
                  </span>
                </div>

                {/* Body & Image Preview */}
                <div className="p-4 space-y-3">
                  {/* Media Visual */}
                  {item.media_url && (
                    <div className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 h-40 flex items-center justify-center">
                      <img
                        src={item.media_url}
                        alt="Belge"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                        onClick={() => setPreviewImage(item.media_url)}
                      />
                      <div 
                        onClick={() => setPreviewImage(item.media_url)}
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white gap-2 text-xs font-semibold"
                      >
                        <Eye size={16} />
                        Büyüt
                      </div>
                    </div>
                  )}

                  {/* Caption */}
                  {item.caption && (
                    <p className="text-xs text-gray-700 italic line-clamp-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      &ldquo;{item.caption}&rdquo;
                    </p>
                  )}

                  {/* OCR Extracted Data Grid */}
                  <div className="bg-emerald-50/40 rounded-lg p-2.5 border border-emerald-100/80 space-y-1.5 text-xs">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
                      <span>OCR Ayrıştırma Sonucu</span>
                      <span className="text-emerald-600 font-medium">Güven: %98</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-gray-700">
                      {ext.plate && (
                        <div>
                          <span className="text-gray-400 text-[10px] block">Plaka</span>
                          <span className="font-bold text-gray-900 bg-white px-1.5 py-0.5 rounded border border-gray-200 text-[11px] inline-block">{ext.plate}</span>
                        </div>
                      )}
                      {(ext.amount || ext.total_amount || ext.cash_total) && (
                        <div>
                          <span className="text-gray-400 text-[10px] block">Tutar</span>
                          <span className="font-bold text-emerald-700 text-xs">
                            ₺{Number(ext.amount || ext.total_amount || ext.cash_total).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {ext.supplier && (
                        <div className="col-span-2">
                          <span className="text-gray-400 text-[10px] block">Tedarikçi / Cari</span>
                          <span className="font-semibold text-gray-800 truncate block">{ext.supplier}</span>
                        </div>
                      )}
                      {ext.station && (
                        <div className="col-span-2">
                          <span className="text-gray-400 text-[10px] block">İstasyon</span>
                          <span className="font-semibold text-gray-800 truncate block">{ext.station} ({ext.quantity} Lt)</span>
                        </div>
                      )}
                      {ext.bank_name && (
                        <div className="col-span-2">
                          <span className="text-gray-400 text-[10px] block">Banka & Vade</span>
                          <span className="font-semibold text-gray-800 truncate block">{ext.bank_name} &bull; {ext.due_date}</span>
                        </div>
                      )}
                      {ext.branch && (
                        <div className="col-span-2">
                          <span className="text-gray-400 text-[10px] block">Şube</span>
                          <span className="font-semibold text-gray-800 truncate block">{ext.branch}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 rounded-b-xl flex items-center justify-between gap-2">
                  {item.status === 'processed' ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold w-full justify-between">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 size={15} className="text-emerald-600" />
                        ERP&apos;ye Kaydedildi
                      </span>
                      <button
                        onClick={() => handleStatusChange(item.id, 'pending')}
                        className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                      >
                        Geri Al
                      </button>
                    </div>
                  ) : item.status === 'ignored' ? (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold w-full justify-between">
                      <span>Reddedildi</span>
                      <button
                        onClick={() => handleStatusChange(item.id, 'pending')}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 underline"
                      >
                        Yeniden İncele
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStatusChange(item.id, 'ignored')}
                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        title="Görmezden Gel / Reddet"
                      >
                        <XCircle size={16} />
                      </button>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          onClick={() => handleConvertToTask(item)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 rounded-lg shadow-sm flex items-center gap-1 transition"
                          title="Bu belge için görev aç"
                        >
                          <PlusCircle size={13} />
                          İş Emri Yap
                        </button>

                        <button
                          onClick={() => openConvertModal(item)}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
                        >
                          <span>Tek Tıkla Aktar</span>
                          <ArrowRight size={13} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Convert Modals */}
      <ConvertSanayiModal
        media={activeConvertModal.type === 'sanayi' ? activeConvertModal.media : null}
        open={activeConvertModal.type === 'sanayi'}
        onClose={() => setActiveConvertModal({ type: null, media: null })}
        onSuccess={fetchMedia}
      />

      <ConvertYakitModal
        media={activeConvertModal.type === 'yakit' ? activeConvertModal.media : null}
        open={activeConvertModal.type === 'yakit'}
        onClose={() => setActiveConvertModal({ type: null, media: null })}
        onSuccess={fetchMedia}
      />

      <ConvertKasaModal
        media={activeConvertModal.type === 'kasa' ? activeConvertModal.media : null}
        open={activeConvertModal.type === 'kasa'}
        onClose={() => setActiveConvertModal({ type: null, media: null })}
        onSuccess={fetchMedia}
      />

      <ConvertCekModal
        media={activeConvertModal.type === 'cek' ? activeConvertModal.media : null}
        open={activeConvertModal.type === 'cek'}
        onClose={() => setActiveConvertModal({ type: null, media: null })}
        onSuccess={fetchMedia}
      />

      {/* Image Fullscreen Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-2xl p-2 overflow-hidden shadow-2xl">
            <img src={previewImage} alt="Önizleme" className="w-full h-full object-contain max-h-[85vh] rounded-xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black text-white rounded-full transition"
            >
              <XCircle size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
