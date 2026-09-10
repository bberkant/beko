import React, { useState, useEffect } from 'react';
import { 
  Wrench, 
  Fuel, 
  Wallet, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { WhatsAppIncomingMedia } from '../types';

interface ConvertModalBaseProps {
  media: WhatsAppIncomingMedia | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// 1. Sanayi Gideri Dönüştürme Modalı
export const ConvertSanayiModal: React.FC<ConvertModalBaseProps> = ({
  media,
  open,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plate, setPlate] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [supplier, setSupplier] = useState('');
  const [invoiceNo, setInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'odendi' | 'odenmedi'>('odenmedi');

  useEffect(() => {
    if (media && open) {
      const ext = media.extracted_data || {};
      setPlate(ext.plate || '');
      setAmount(ext.amount || ext.total_amount || '');
      setSupplier(ext.supplier || '');
      setInvoiceNo(ext.invoice_no || '');
      setDate(ext.date || new Date().toISOString().split('T')[0]);
      setDescription(media.caption || ext.description || `${media.sender_name} tarafından WhatsApp üzerinden iletildi`);
    }
  }, [media, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || !user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Insert into sanayi_giderleri
      const { data: insertedRecord, error: insertError } = await supabase
        .from('sanayi_giderleri')
        .insert({
          organization_id: user.organizationId,
          plate: plate.toUpperCase().trim(),
          amount: Number(amount) || 0,
          supplier: supplier.trim(),
          invoice_no: invoiceNo.trim() || null,
          date: date,
          document_url: media.media_url,
          payment_status: paymentStatus,
          notes: description
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Mark WhatsApp media as processed
      await supabase
        .from('whatsapp_incoming_media')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_to_table: 'sanayi_giderleri',
          processed_record_id: insertedRecord?.id
        })
        .eq('id', media.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Sanayi gideri kaydetme hatası:', err);
      setError(err.message || 'Kayıt oluşturulurken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Fişini Sanayi Giderine Dönüştür" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {media && (
          <div className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 items-center">
            {media.media_url && (
              <a href={media.media_url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group">
                <img src={media.media_url} alt="Belge" className="w-16 h-16 object-cover rounded-lg border border-gray-300 group-hover:opacity-80 transition" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg text-white">
                  <ExternalLink size={14} />
                </div>
              </a>
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Wrench size={14} className="text-emerald-600" />
                {media.group_name} &bull; <span className="text-gray-600">{media.sender_name}</span>
              </div>
              <div className="text-gray-500 line-clamp-1">{media.caption || 'Açıklama girilmemiş'}</div>
              <div className="text-[11px] text-emerald-600 font-medium">OCR Verileri Otomatik Dolduruldu</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Araç Plakası *</label>
            <input
              type="text"
              required
              placeholder="34 ABC 123"
              value={plate}
              onChange={e => setPlate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Fatura / Fiş Tutarı (₺) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tedarikçi / Usta / Parçacı *</label>
            <input
              type="text"
              required
              placeholder="Örn: Güven Otomotiv"
              value={supplier}
              onChange={e => setSupplier(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Fatura / Fiş No</label>
            <input
              type="text"
              placeholder="GIB2026000123"
              value={invoiceNo}
              onChange={e => setInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tarih</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ödeme Durumu</label>
            <select
              value={paymentStatus}
              onChange={e => setPaymentStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            >
              <option value="odenmedi">Ödenmedi (Borç Kaydı)</option>
              <option value="odendi">Ödendi (Nakit / Havale / Kart)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Yapılan İşlem / Açıklama</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            placeholder="Yapılan bakım, onarım veya parça detayları..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <CheckCircle2 size={14} />
            {loading ? 'İşleniyor...' : 'Sanayi Giderine Kaydet & Onayla'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// 2. Yakıt Fişi Dönüştürme Modalı
export const ConvertYakitModal: React.FC<ConvertModalBaseProps> = ({
  media,
  open,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [plate, setPlate] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [unitPrice, setUnitPrice] = useState<number | ''>('');
  const [station, setStation] = useState('');
  const [driverName, setDriverName] = useState('');
  const [km, setKm] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (media && open) {
      const ext = media.extracted_data || {};
      setPlate(ext.plate || '');
      setTotalAmount(ext.amount || ext.total_amount || '');
      setQuantity(ext.quantity || '');
      setUnitPrice(ext.unit_price || '');
      setStation(ext.station || 'Petrol Ofisi');
      setDriverName(ext.driver_name || media.sender_name || '');
      setKm(ext.km || '');
      setDate(ext.date || new Date().toISOString().split('T')[0]);
    }
  }, [media, open]);

  // Recalculate unit price or total
  const handleQuantityChange = (val: number | '') => {
    setQuantity(val);
    if (val && totalAmount) {
      setUnitPrice(Number((Number(totalAmount) / Number(val)).toFixed(2)));
    }
  };

  const handleTotalChange = (val: number | '') => {
    setTotalAmount(val);
    if (val && quantity) {
      setUnitPrice(Number((Number(val) / Number(quantity)).toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || !user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: insertedRecord, error: insertError } = await supabase
        .from('vehicle_fuel_entries')
        .insert({
          organization_id: user.organizationId,
          plate: plate.toUpperCase().trim(),
          total_amount: Number(totalAmount) || 0,
          quantity: Number(quantity) || null,
          unit_price: Number(unitPrice) || null,
          station: station.trim(),
          driver_name: driverName.trim(),
          km: Number(km) || null,
          date: date,
          document_url: media.media_url
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('whatsapp_incoming_media')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_to_table: 'vehicle_fuel_entries',
          processed_record_id: insertedRecord?.id
        })
        .eq('id', media.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Yakıt kaydetme hatası:', err);
      setError(err.message || 'Yakıt fişi kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Fişini Yakıt Takibine Dönüştür" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {media && (
          <div className="flex gap-4 p-3 bg-blue-50/60 rounded-xl border border-blue-200 items-center">
            {media.media_url && (
              <a href={media.media_url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group">
                <img src={media.media_url} alt="Yakıt Fişi" className="w-16 h-16 object-cover rounded-lg border border-blue-300 group-hover:opacity-80 transition" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg text-white">
                  <ExternalLink size={14} />
                </div>
              </a>
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Fuel size={14} className="text-blue-600" />
                {media.group_name} &bull; <span className="text-gray-600">{media.sender_name}</span>
              </div>
              <div className="text-gray-500">{media.caption || 'Yakıt fişi görüntüsü'}</div>
              <div className="text-[11px] text-blue-600 font-medium">Litre & Tutar Otomatik Algılandı</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Araç Plakası *</label>
            <input
              type="text"
              required
              placeholder="34 LMN 456"
              value={plate}
              onChange={e => setPlate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-blue-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Toplam Tutar (₺) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={totalAmount}
              onChange={e => handleTotalChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-blue-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Yakıt Miktarı (Litre)</label>
            <input
              type="number"
              step="0.01"
              placeholder="Örn: 55.40"
              value={quantity}
              onChange={e => handleQuantityChange(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Litre Fiyatı (₺/Lt)</label>
            <input
              type="number"
              step="0.01"
              placeholder="42.50"
              value={unitPrice}
              onChange={e => setUnitPrice(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">İstasyon Adı / Konum</label>
            <input
              type="text"
              placeholder="Shell / Opet / Petrol Ofisi"
              value={station}
              onChange={e => setStation(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Şoför / Personel</label>
            <input
              type="text"
              placeholder="Şoför Adı"
              value={driverName}
              onChange={e => setDriverName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Araç Kilometresi (KM)</label>
            <input
              type="number"
              placeholder="215400"
              value={km}
              onChange={e => setKm(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Fiş Tarihi</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <CheckCircle2 size={14} />
            {loading ? 'İşleniyor...' : 'Yakıt Takibine Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// 3. Ana Kasa Dönüştürme Modalı
export const ConvertKasaModal: React.FC<ConvertModalBaseProps> = ({
  media,
  open,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transactionType, setTransactionType] = useState<'Giriş' | 'Çıkış'>('Giriş');
  const [amount, setAmount] = useState<number | ''>('');
  const [category, setCategory] = useState('Şube Günlük Satış');
  const [recipientPayer, setRecipientPayer] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (media && open) {
      const ext = media.extracted_data || {};
      setAmount(ext.amount || ext.total_amount || ext.cash_total || '');
      setRecipientPayer(ext.branch || media.sender_name || '');
      setDescription(media.caption || `WhatsApp ${media.group_name} aktarımı: ${ext.description || 'Günlük Z-Raporu / Kasa Bildirimi'}`);
      setDate(ext.date || new Date().toISOString().split('T')[0]);
      if (ext.category) setCategory(ext.category);
    }
  }, [media, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || !user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: insertedRecord, error: insertError } = await supabase
        .from('main_cashbox_transactions')
        .insert({
          organization_id: user.organizationId,
          transaction_type: transactionType,
          amount: Number(amount) || 0,
          category: category.trim(),
          recipient_payer: recipientPayer.trim(),
          description: description.trim(),
          date: date
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('whatsapp_incoming_media')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_to_table: 'main_cashbox_transactions',
          processed_record_id: insertedRecord?.id
        })
        .eq('id', media.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Kasa kaydetme hatası:', err);
      setError(err.message || 'Kasa işlemi kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Raporunu Ana Kasaya Aktar" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {media && (
          <div className="flex gap-4 p-3 bg-amber-50/60 rounded-xl border border-amber-200 items-center">
            {media.media_url && (
              <a href={media.media_url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group">
                <img src={media.media_url} alt="Z-Raporu" className="w-16 h-16 object-cover rounded-lg border border-amber-300 group-hover:opacity-80 transition" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg text-white">
                  <ExternalLink size={14} />
                </div>
              </a>
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                <Wallet size={14} className="text-amber-600" />
                {media.group_name} &bull; <span className="text-gray-600">{media.sender_name}</span>
              </div>
              <div className="text-gray-500">{media.caption || 'Kasa / Z-Raporu Görseli'}</div>
              <div className="text-[11px] text-amber-700 font-medium">Nakit & POS Tutarları Kasaya Yansıtılacak</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">İşlem Türü *</label>
            <select
              value={transactionType}
              onChange={e => setTransactionType(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold"
            >
              <option value="Giriş">Kasa Girişi (Tahsilat / Satış Hasılatı)</option>
              <option value="Çıkış">Kasa Çıkışı (Ödeme / Masraf)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">İşlem Tutarı (₺) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 font-bold text-amber-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori</label>
            <input
              type="text"
              placeholder="Şube Günlük Satış / Masraf"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Şube / İlgili Kişi / Cari</label>
            <input
              type="text"
              placeholder="Örn: Erenler Şube"
              value={recipientPayer}
              onChange={e => setRecipientPayer(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Tarih</label>
            <input
              type="date"
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">Açıklama</label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <CheckCircle2 size={14} />
            {loading ? 'İşleniyor...' : 'Ana Kasaya İşle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// 4. Çek Dönüştürme Modalı
export const ConvertCekModal: React.FC<ConvertModalBaseProps> = ({
  media,
  open,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [drawer, setDrawer] = useState('');
  const [checkNo, setCheckNo] = useState('');

  useEffect(() => {
    if (media && open) {
      const ext = media.extracted_data || {};
      setBankName(ext.bank_name || 'Akbank');
      setAmount(ext.amount || ext.total_amount || '');
      setDueDate(ext.due_date || '');
      setDrawer(ext.drawer || media.sender_name || '');
      setCheckNo(ext.check_no || '');
    }
  }, [media, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media || !user?.organizationId) return;

    try {
      setLoading(true);
      setError(null);

      const { data: insertedRecord, error: insertError } = await supabase
        .from('ebs_checks')
        .insert({
          organization_id: user.organizationId,
          bank_name: bankName.trim(),
          amount: Number(amount) || 0,
          due_date: dueDate || null,
          drawer: drawer.trim(),
          check_number: checkNo.trim(),
          status: 'portfoyde',
          type: 'alinan_cek',
          entry_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase
        .from('whatsapp_incoming_media')
        .update({
          status: 'processed',
          processed_at: new Date().toISOString(),
          processed_to_table: 'ebs_checks',
          processed_record_id: insertedRecord?.id
        })
        .eq('id', media.id);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Çek kaydetme hatası:', err);
      setError(err.message || 'Çek portföye kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="WhatsApp Çek Görselini Portföye Ekle" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {media && (
          <div className="flex gap-4 p-3 bg-purple-50/60 rounded-xl border border-purple-200 items-center">
            {media.media_url && (
              <a href={media.media_url} target="_blank" rel="noopener noreferrer" className="shrink-0 relative group">
                <img src={media.media_url} alt="Çek" className="w-16 h-16 object-cover rounded-lg border border-purple-300 group-hover:opacity-80 transition" />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 rounded-lg text-white">
                  <ExternalLink size={14} />
                </div>
              </a>
            )}
            <div className="text-xs space-y-1">
              <div className="font-semibold text-gray-800 flex items-center gap-1.5">
                <CreditCard size={14} className="text-purple-600" />
                {media.group_name} &bull; <span className="text-gray-600">{media.sender_name}</span>
              </div>
              <div className="text-gray-500">{media.caption || 'Alınan Müşteri Çeki'}</div>
              <div className="text-[11px] text-purple-700 font-medium">Banka, Vade ve Tutar OCR ile Ayrıştırıldı</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Banka Adı *</label>
            <input
              type="text"
              required
              placeholder="Örn: Akbank A.Ş."
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Çek Tutarı (₺) *</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-bold text-purple-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Vade Tarihi *</label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Keşideci / Veren Cari *</label>
            <input
              type="text"
              required
              placeholder="Örn: Caner Et ve Süt Ürünleri Ltd."
              value={drawer}
              onChange={e => setDrawer(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Çek Seri No</label>
            <input
              type="text"
              placeholder="AKB-987654"
              value={checkNo}
              onChange={e => setCheckNo(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm flex items-center gap-1.5 transition"
          >
            <CheckCircle2 size={14} />
            {loading ? 'İşleniyor...' : 'Çek Portföyüne Ekle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
