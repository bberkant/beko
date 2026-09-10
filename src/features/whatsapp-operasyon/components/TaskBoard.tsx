import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  ArrowLeft, 
  Trash2, 
  Search, 
  User, 
  Calendar, 
  MessageSquare
} from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/auth';
import { WhatsAppTask } from '../types';

interface TaskBoardProps {
  onRefreshStats?: () => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ onRefreshStats }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<WhatsAppTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // New Task Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskGroupName, setNewTaskGroupName] = useState('🥩 Mezbaha & Kesimhane Grubu');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState<'sevkiyat' | 'arac_bakim' | 'kesim' | 'sube' | 'muhasebe' | 'diger'>('sevkiyat');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('whatsapp_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (user?.organizationId) {
        query = query.eq('organization_id', user.organizationId);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      setTasks(data || []);
      if (onRefreshStats) onRefreshStats();
    } catch (err) {
      console.error('WhatsApp görevleri çekme hatası:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.organizationId, selectedCategory]);

  const handleUpdateStatus = async (taskId: string, newStatus: 'todo' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const updatePayload: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      if (newStatus === 'completed') {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('whatsapp_tasks')
        .update(updatePayload)
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Görev güncelleme hatası:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Bu iş emrini silmek istediğinize emin misiniz?')) return;
    try {
      const { error } = await supabase
        .from('whatsapp_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      fetchTasks();
    } catch (err) {
      console.error('Görev silme hatası:', err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.organizationId || !newTaskTitle) return;

    try {
      const { error } = await supabase
        .from('whatsapp_tasks')
        .insert({
          organization_id: user.organizationId,
          group_name: newTaskGroupName,
          title: newTaskTitle.trim(),
          description: newTaskDescription.trim() || null,
          assigned_to: newTaskAssignedTo.trim() || null,
          priority: newTaskPriority,
          category: newTaskCategory,
          status: 'todo',
          due_date: newTaskDueDate || null,
          sender_name: 'Panel Yöneticisi'
        });

      if (error) throw error;

      setIsNewTaskModalOpen(false);
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssignedTo('');
      setNewTaskDueDate('');
      fetchTasks();
    } catch (err) {
      console.error('Görev oluşturma hatası:', err);
    }
  };

  const filteredTasks = tasks.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const title = t.title.toLowerCase();
    const desc = t.description?.toLowerCase() || '';
    const assignee = t.assigned_to?.toLowerCase() || '';
    const group = t.group_name.toLowerCase();
    return title.includes(q) || desc.includes(q) || assignee.includes(q) || group.includes(q);
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'urgent':
        return { label: 'Acil', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'high':
        return { label: 'Yüksek', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'medium':
        return { label: 'Orta', bg: 'bg-blue-100 text-blue-800 border-blue-200' };
      default:
        return { label: 'Düşük', bg: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
  };

  const getCategoryBadge = (c: string) => {
    switch (c) {
      case 'sevkiyat':
        return '🥩 Sevkiyat';
      case 'arac_bakim':
        return '🔧 Araç Bakım';
      case 'kesim':
        return '🔪 Kesimhane';
      case 'sube':
        return '🏪 Şube Sipariş';
      case 'muhasebe':
        return '💰 Muhasebe';
      default:
        return '📋 Genel';
    }
  };

  const renderTaskCard = (task: WhatsAppTask) => {
    const priority = getPriorityBadge(task.priority);
    const categoryName = getCategoryBadge(task.category);

    return (
      <div
        key={task.id}
        className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-3 group"
      >
        <div className="space-y-2">
          {/* Top Badges */}
          <div className="flex items-center justify-between gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priority.bg}`}>
              {priority.label}
            </span>
            <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              {categoryName}
            </span>
          </div>

          {/* Title & Description */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
              {task.title}
            </h4>
            {task.description && (
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>

          {/* WhatsApp Message Snippet */}
          {task.original_message && task.original_message !== task.description && (
            <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/70 text-[11px] text-emerald-900 flex items-start gap-1.5">
              <MessageSquare size={12} className="text-emerald-600 shrink-0 mt-0.5" />
              <span className="line-clamp-2 italic">&ldquo;{task.original_message}&rdquo;</span>
            </div>
          )}

          {/* Group & Sender */}
          <div className="text-[10px] text-gray-500 flex items-center gap-1">
            <span className="font-semibold text-gray-700">{task.group_name}</span>
            {task.sender_name && (
              <>
                <span>&bull;</span>
                <span>{task.sender_name}</span>
              </>
            )}
          </div>
        </div>

        {/* Footer Meta & Progression */}
        <div className="pt-2.5 border-t border-gray-100 space-y-2">
          <div className="flex items-center justify-between text-[10px] text-gray-500">
            {task.assigned_to ? (
              <span className="flex items-center gap-1 font-semibold text-gray-700">
                <User size={12} className="text-brand-600" />
                {task.assigned_to}
              </span>
            ) : (
              <span className="text-gray-400 italic">Atanmadı</span>
            )}

            {task.due_date && (
              <span className="flex items-center gap-1 text-gray-600">
                <Calendar size={12} />
                {new Date(task.due_date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
              </span>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="p-1 text-gray-400 hover:text-rose-600 rounded transition"
              title="Görevi Sil"
            >
              <Trash2 size={13} />
            </button>

            <div className="flex items-center gap-1">
              {task.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus(task.id, 'todo')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1 transition"
                  title="Bekleyenlere Al"
                >
                  <ArrowLeft size={11} />
                  Beklet
                </button>
              )}

              {task.status === 'todo' && (
                <button
                  onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                  className="px-2.5 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1 transition"
                >
                  <span>Başlat</span>
                  <ArrowRight size={11} />
                </button>
              )}

              {task.status === 'in_progress' && (
                <button
                  onClick={() => handleUpdateStatus(task.id, 'completed')}
                  className="px-2.5 py-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 flex items-center gap-1 transition"
                >
                  <CheckCircle2 size={11} />
                  Tamamla
                </button>
              )}

              {task.status === 'completed' && (
                <button
                  onClick={() => handleUpdateStatus(task.id, 'in_progress')}
                  className="px-2 py-1 text-[10px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded flex items-center gap-1 transition"
                >
                  <ArrowLeft size={11} />
                  Yeniden Aç
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & New Task Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Tüm Kategoriler</option>
            <option value="sevkiyat">🥩 Sevkiyat</option>
            <option value="arac_bakim">🔧 Araç Bakım</option>
            <option value="kesim">🔪 Kesimhane</option>
            <option value="sube">🏪 Şube Siparişleri</option>
            <option value="muhasebe">💰 Muhasebe</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="İş emri, sorumlu veya grup ara..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 shrink-0 transition"
          >
            <Plus size={14} />
            Yeni İş Emri
          </button>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: TODO */}
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 flex flex-col h-full min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                Yapılacak / Bekleyen
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              {todoTasks.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {todoTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl">
                Bekleyen iş emri yok
              </div>
            ) : (
              todoTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Column 2: IN PROGRESS */}
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 flex flex-col h-full min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                Devam Eden / İşlemde
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {inProgressTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl">
                Şu an işlemde olan görev yok
              </div>
            ) : (
              inProgressTasks.map(renderTaskCard)
            )}
          </div>
        </div>

        {/* Column 3: COMPLETED */}
        <div className="bg-gray-50 rounded-2xl p-3.5 border border-gray-200 flex flex-col h-full min-h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3 px-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                Tamamlananlar
              </h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
              {completedTasks.length}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto">
            {completedTasks.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-xs text-gray-400 border border-dashed border-gray-300 rounded-xl">
                Henüz tamamlanan görev yok
              </div>
            ) : (
              completedTasks.map(renderTaskCard)
            )}
          </div>
        </div>
      </div>

      {/* New Task Modal */}
      <Modal
        open={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        title="Yeni WhatsApp İş Emri Oluştur"
        size="lg"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">İş Emri Başlığı *</label>
            <input
              type="text"
              required
              placeholder="Örn: Erenler Şubesi 3 Gövde Dana Hazırlığı"
              value={newTaskTitle}
              onChange={e => setNewTaskTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Kaynak WhatsApp Grubu</label>
              <select
                value={newTaskGroupName}
                onChange={e => setNewTaskGroupName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="🥩 Mezbaha & Kesimhane Grubu">🥩 Mezbaha & Kesimhane Grubu</option>
                <option value="🔧 Sanayi & Araç Bakım Grubu">🔧 Sanayi & Araç Bakım Grubu</option>
                <option value="⛽ Şoförler & Lojistik Grubu">⛽ Şoförler & Lojistik Grubu</option>
                <option value="🏪 Şubeler & Günlük Satış">🏪 Şubeler & Günlük Satış</option>
                <option value="💰 Finans & Tahsilat Grubu">💰 Finans & Tahsilat Grubu</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Kategori</label>
              <select
                value={newTaskCategory}
                onChange={e => setNewTaskCategory(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="sevkiyat">🥩 Sevkiyat & Lojistik</option>
                <option value="arac_bakim">🔧 Araç Bakım & Onarım</option>
                <option value="kesim">🔪 Kesimhane İşlemleri</option>
                <option value="sube">🏪 Şube Siparişi</option>
                <option value="muhasebe">💰 Finans & Muhasebe</option>
                <option value="diger">📋 Diğer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Öncelik Derecesi</label>
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                <option value="low">Düşük Öncelik</option>
                <option value="medium">Orta Öncelik</option>
                <option value="high">Yüksek Öncelik</option>
                <option value="urgent">Acil (Kritik İş Emri)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Görev Sorumlusu (Personel)</label>
              <input
                type="text"
                placeholder="Örn: Hasan Usta / Mehmet Şoför"
                value={newTaskAssignedTo}
                onChange={e => setNewTaskAssignedTo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Son Teslim Tarihi & Saati</label>
              <input
                type="date"
                value={newTaskDueDate}
                onChange={e => setNewTaskDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">İş Emri Açıklaması / Talimat</label>
            <textarea
              rows={3}
              placeholder="Görevle ilgili yapılacak işlemleri detaylıca yazın..."
              value={newTaskDescription}
              onChange={e => setNewTaskDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm flex items-center gap-1.5 transition"
            >
              <CheckCircle2 size={14} />
              İş Emrini Panoya Ekle
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
