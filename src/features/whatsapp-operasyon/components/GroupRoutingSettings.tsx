import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Zap, 
  Wrench, 
  Fuel, 
  Wallet, 
  CreditCard, 
  Beef, 
  FileText 
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { WhatsAppGroupRule } from '../types';

interface GroupRoutingSettingsProps {
  onRefreshStats?: () => void;
}

export const GroupRoutingSettings: React.FC<GroupRoutingSettingsProps> = ({ onRefreshStats }) => {
  const { user } = useAuth();
  const [rules, setRules] = useState<WhatsAppGroupRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WhatsAppGroupRule | null>(null);

  // Form State
  const [groupName, setGroupName] = useState('');
  const [defaultModule, setDefaultModule] = useState<'sanayi' | 'yakit' | 'kasa' | 'cek' | 'kesim' | 'diger'>('sanayi');
  const [defaultCategory, setDefaultCategory] = useState('');
  const [autoOcr, setAutoOcr] = useState(true);
  const [autoTask, setAutoTask] = useState(true);
  const [isActive, setIsActive] = useState(true);

  const fetchRules = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('whatsapp_group_rules')
        .select('*')
        .order('created_at', { ascending: true });

      if (user?.organizationId) {
        query = query.eq('organization_id', user.organizationId);
      }

      const { data, error } = await query;
      if (error) throw error;

      setRules(data || []);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('Grup yönlendirme kuralları çekme hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [user?.organizationId]);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setGroupName('');
    setDefaultModule('sanayi');
    setDefaultCategory('');
    setAutoOcr(true);
    setAutoTask(true);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: WhatsAppGroupRule) => {
    setEditingRule(rule);
    setGroupName(rule.group_name);
    setDefaultModule(rule.default_module);
    setDefaultCategory(rule.default_category || '');
    setAutoOcr(rule.auto_ocr);
    setAutoTask(rule.auto_task);
    setIsActive(rule.is_active);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId || !groupName) return;

    try {
      if (editingRule) {
        // Update
        const { error } = await supabase
          .from('whatsapp_group_rules')
          .update({
            group_name: groupName.trim(),
            default_module: defaultModule,
            default_category: defaultCategory.trim() || 'Genel',
            auto_ocr: autoOcr,
            auto_task: autoTask,
            is_active: isActive
          })
          .eq('id', editingRule.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase
          .from('whatsapp_group_rules')
          .insert({
            organization_id: user.organizationId,
            group_name: groupName.trim(),
            default_module: defaultModule,
            default_category: defaultCategory.trim() || 'Genel',
            auto_ocr: autoOcr,
            auto_task: autoTask,
            is_active: isActive
          });

        if (error) throw error;
      }

      setIsModalOpen(false);
      fetchRules();
    } catch (err) {
      console.error('Kural kaydetme hatası:', err);
    }
  };

  const handleToggleActive = async (rule: WhatsAppGroupRule) => {
    try {
      const { error } = await supabase
        .from('whatsapp_group_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;
      fetchRules();
    } catch (err) {
      console.error('Durum değiştirme hatası:', err);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Bu grup eşleştirme kuralını silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('whatsapp_group_rules')
        .delete()
        .eq('id', ruleId);

      if (error) throw error;
      fetchRules();
    } catch (err) {
      console.error('Kural silme hatası:', err);
    }
  };

  const getModuleInfo = (mod: string) => {
    switch (mod) {
      case 'sanayi':
        return { label: 'Sanayi Giderleri Modülü', icon: Wrench, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'yakit':
        return { label: 'Araç Yakıt Takip Modülü', icon: Fuel, color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'kasa':
        return { label: 'Ana Kasa / Z-Raporu Modülü', icon: Wallet, color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'cek':
        return { label: 'Çek & Senet Portföyü', icon: CreditCard, color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'kesim':
        return { label: 'Mezbaha / Kesimhane Modülü', icon: Beef, color: 'text-rose-700 bg-rose-50 border-rose-200' };
      default:
        return { label: 'Genel Operasyon Masası', icon: FileText, color: 'text-gray-700 bg-gray-50 border-gray-200' };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Settings size={18} className="text-emerald-600" />
            WhatsApp Grup & Modül Eşleştirme Motoru
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Şirket WhatsApp gruplarından gelen medya ve mesajların ERP&apos;de hangi modüle yönlendirileceğini ve OCR otomasyon kurallarını buradan yönetin.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 transition"
        >
          <Plus size={14} />
          Yeni Grup Eşleştir
        </button>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 border-b border-gray-200 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Grup Adı</th>
                <th className="py-3 px-4">Hedef ERP Modülü</th>
                <th className="py-3 px-4">Varsayılan Kategori</th>
                <th className="py-3 px-4 text-center">Otomatik OCR</th>
                <th className="py-3 px-4 text-center">İş Emri Üret</th>
                <th className="py-3 px-4 text-center">Durum</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Kurallar yükleniyor...
                  </td>
                </tr>
              ) : rules.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Tanımlı grup kuralı bulunamadı.
                  </td>
                </tr>
              ) : (
                rules.map(rule => {
                  const modInfo = getModuleInfo(rule.default_module);
                  const Icon = modInfo.icon;

                  return (
                    <tr key={rule.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 flex items-center gap-2">
                        <Users size={14} className="text-gray-400 shrink-0" />
                        <span>{rule.group_name}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border ${modInfo.color}`}>
                          <Icon size={13} />
                          {modInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-gray-600 font-medium">
                        {rule.default_category || '-'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {rule.auto_ocr ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                            <Zap size={11} className="text-emerald-600" />
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Pasif</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {rule.auto_task ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-semibold">
                            <CheckCircle2 size={11} className="text-blue-600" />
                            Açık
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400">Kapalı</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleActive(rule)}
                          className="inline-flex items-center gap-1 cursor-pointer transition"
                          title="Durumu Değiştir"
                        >
                          {rule.is_active ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                              İzleniyor
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">
                              Durduruldu
                            </span>
                          )}
                        </button>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(rule)}
                            className="p-1 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition"
                            title="Düzenle"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(rule.id)}
                            className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRule ? 'Grup Yönlendirme Kuralını Düzenle' : 'Yeni WhatsApp Grubu Eşleştir'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp Grup Adı *</label>
            <input
              type="text"
              required
              placeholder="Örn: 🥩 Mezbaha & Kesimhane Grubu"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Hedef ERP Modülü</label>
            <select
              value={defaultModule}
              onChange={e => setDefaultModule(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
            >
              <option value="sanayi">🔧 Sanayi Giderleri (Araç Bakım & Yedek Parça)</option>
              <option value="yakit">⛽ Yakıt Takip (Şoför Akaryakıt Fişleri)</option>
              <option value="kasa">💰 Ana Kasa / Z-Raporu & Şube Gelirleri</option>
              <option value="cek">💳 Çek & Senet Portföyü</option>
              <option value="kesim">🥩 Kesimhane & Kantar Fişleri</option>
              <option value="diger">📋 Diğer / Genel Operasyon</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Varsayılan Kategori / Açıklama</label>
            <input
              type="text"
              placeholder="Örn: Sanayi Bakım Onarım"
              value={defaultCategory}
              onChange={e => setDefaultCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-gray-800">Otomatik OCR & Belge Ayrıştırma</div>
                <div className="text-[11px] text-gray-500">Gruptan gelen fiş ve faturaların tutar, plaka ve carilerini otomatik oku</div>
              </div>
              <input
                type="checkbox"
                checked={autoOcr}
                onChange={e => setAutoOcr(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div>
                <div className="text-xs font-bold text-gray-800">İş Emri / Görev Masasına Aktar</div>
                <div className="text-[11px] text-gray-500">Gruptaki talimat mesajlarını otomatik Kanban görev panosuna ekle</div>
              </div>
              <input
                type="checkbox"
                checked={autoTask}
                onChange={e => setAutoTask(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div>
                <div className="text-xs font-bold text-gray-800">Grup İzleme Durumu</div>
                <div className="text-[11px] text-gray-500">Bu gruptan veri akışını aktif tut</div>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
            >
              <CheckCircle2 size={14} />
              {editingRule ? 'Güncelle' : 'Kuralı Kaydet'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
